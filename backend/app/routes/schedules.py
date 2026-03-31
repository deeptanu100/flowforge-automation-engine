"""Schedule management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models import ScheduledWorkflow, Workflow
from app.scheduler import add_workflow_schedule, remove_workflow_schedule, get_next_run_time

router = APIRouter()


class ScheduleCreate(BaseModel):
    workflow_id: str
    cron_expression: str = "*/5 * * * *"  # Default: every 5 minutes


class ScheduleUpdate(BaseModel):
    cron_expression: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_schedules(db: AsyncSession = Depends(get_db)):
    """List all schedules."""
    result = await db.execute(select(ScheduledWorkflow).order_by(ScheduledWorkflow.created_at.desc()))
    schedules = result.scalars().all()
    return [
        {
            "id": s.id,
            "workflow_id": s.workflow_id,
            "cron_expression": s.cron_expression,
            "is_active": s.is_active,
            "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
            "next_run_at": (get_next_run_time(s.workflow_id) or s.next_run_at or "").isoformat()
                if get_next_run_time(s.workflow_id) or s.next_run_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in schedules
    ]


@router.get("/{workflow_id}")
async def get_schedule_for_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """Get schedule for a specific workflow."""
    result = await db.execute(
        select(ScheduledWorkflow).where(ScheduledWorkflow.workflow_id == workflow_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found for this workflow")
    return {
        "id": schedule.id,
        "workflow_id": schedule.workflow_id,
        "cron_expression": schedule.cron_expression,
        "is_active": schedule.is_active,
        "last_run_at": schedule.last_run_at.isoformat() if schedule.last_run_at else None,
        "next_run_at": (get_next_run_time(schedule.workflow_id) or schedule.next_run_at or "").isoformat()
            if get_next_run_time(schedule.workflow_id) or schedule.next_run_at else None,
        "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
    }


@router.post("/", status_code=201)
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new schedule for a workflow."""
    # Verify workflow exists
    wf_result = await db.execute(select(Workflow).where(Workflow.id == data.workflow_id))
    if not wf_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Check for existing schedule
    existing = await db.execute(
        select(ScheduledWorkflow).where(ScheduledWorkflow.workflow_id == data.workflow_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Schedule already exists for this workflow. Use PUT to update.")

    try:
        schedule = ScheduledWorkflow(
            workflow_id=data.workflow_id,
            cron_expression=data.cron_expression,
            is_active=True,
        )
        db.add(schedule)
        await db.flush()

        # Activate in the scheduler
        add_workflow_schedule(data.workflow_id, data.cron_expression)

        return {
            "id": schedule.id,
            "workflow_id": schedule.workflow_id,
            "cron_expression": schedule.cron_expression,
            "is_active": True,
            "status": "created",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{schedule_id}")
async def update_schedule(schedule_id: str, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    """Update a schedule's cron expression or active status."""
    result = await db.execute(select(ScheduledWorkflow).where(ScheduledWorkflow.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    try:
        if data.cron_expression is not None:
            schedule.cron_expression = data.cron_expression

        if data.is_active is not None:
            schedule.is_active = data.is_active

        # Update the live scheduler
        if schedule.is_active:
            add_workflow_schedule(schedule.workflow_id, schedule.cron_expression)
        else:
            remove_workflow_schedule(schedule.workflow_id)

        return {
            "id": schedule.id,
            "cron_expression": schedule.cron_expression,
            "is_active": schedule.is_active,
            "status": "updated",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a schedule."""
    result = await db.execute(select(ScheduledWorkflow).where(ScheduledWorkflow.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    remove_workflow_schedule(schedule.workflow_id)
    await db.delete(schedule)

    return {"status": "deleted"}
