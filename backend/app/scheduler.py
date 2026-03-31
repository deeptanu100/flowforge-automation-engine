"""APScheduler-based workflow scheduler for FlowForge."""

import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def parse_cron_expression(cron_expr: str) -> dict:
    """Parse a 5-field cron expression into APScheduler CronTrigger kwargs."""
    parts = cron_expr.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron expression: expected 5 fields, got {len(parts)}")

    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


async def _execute_scheduled_workflow(workflow_id: str):
    """Execute a workflow as a scheduled job."""
    from app.database import async_session
    from app.models import Workflow, ExecutionLog, ScheduledWorkflow
    from app.executor import run_workflow
    from sqlalchemy import select

    logger.info(f"Scheduled execution starting for workflow {workflow_id}")

    async with async_session() as db:
        try:
            result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
            workflow = result.scalar_one_or_none()
            if not workflow:
                logger.error(f"Scheduled workflow {workflow_id} not found")
                return

            # Create execution log
            log = ExecutionLog(workflow_id=workflow_id, status="running")
            db.add(log)
            await db.flush()

            execution_result = await run_workflow(workflow.workflow_json_data, db)

            log.status = execution_result["status"]
            log.completed_at = datetime.now(timezone.utc)
            log.result = execution_result["results"]

            # Update schedule last_run_at
            sched_result = await db.execute(
                select(ScheduledWorkflow).where(ScheduledWorkflow.workflow_id == workflow_id)
            )
            schedule = sched_result.scalar_one_or_none()
            if schedule:
                schedule.last_run_at = datetime.now(timezone.utc)

            await db.commit()
            logger.info(f"Scheduled execution completed for workflow {workflow_id}: {execution_result['status']}")

        except Exception as e:
            logger.error(f"Scheduled execution failed for workflow {workflow_id}: {e}")
            await db.rollback()


def add_workflow_schedule(workflow_id: str, cron_expression: str):
    """Add or update a cron schedule for a workflow."""
    job_id = f"workflow_{workflow_id}"

    # Remove existing job if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    cron_kwargs = parse_cron_expression(cron_expression)
    trigger = CronTrigger(**cron_kwargs)

    scheduler.add_job(
        _execute_scheduled_workflow,
        trigger=trigger,
        args=[workflow_id],
        id=job_id,
        name=f"Workflow {workflow_id}",
        replace_existing=True,
    )
    logger.info(f"Scheduled workflow {workflow_id} with cron: {cron_expression}")


def remove_workflow_schedule(workflow_id: str):
    """Remove a scheduled job for a workflow."""
    job_id = f"workflow_{workflow_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"Removed schedule for workflow {workflow_id}")


def get_next_run_time(workflow_id: str) -> datetime | None:
    """Get the next scheduled run time for a workflow."""
    job_id = f"workflow_{workflow_id}"
    job = scheduler.get_job(job_id)
    if job and job.next_run_time:
        return job.next_run_time
    return None


async def reload_schedules_from_db():
    """Reload all active schedules from the database on startup."""
    from app.database import async_session
    from app.models import ScheduledWorkflow
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(
            select(ScheduledWorkflow).where(ScheduledWorkflow.is_active == True)
        )
        schedules = result.scalars().all()

        for s in schedules:
            try:
                add_workflow_schedule(s.workflow_id, s.cron_expression)
            except Exception as e:
                logger.error(f"Failed to reload schedule for workflow {s.workflow_id}: {e}")

        logger.info(f"Reloaded {len(schedules)} active schedules from database")


def start_scheduler():
    """Start the APScheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler():
    """Shutdown the APScheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
