"""Workflow execution endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.database import get_db
from app.models import Workflow, ExecutionLog, TokenUsage
from app.executor import run_workflow
from app.dag_parser import DAGValidationError

router = APIRouter()


@router.post("/{workflow_id}")
async def execute_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """Execute a saved workflow by its ID."""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Create execution log
    log = ExecutionLog(workflow_id=workflow_id, status="running")
    db.add(log)
    await db.flush()

    try:
        execution_result = await run_workflow(workflow.workflow_json_data, db)

        # Update log
        log.status = execution_result["status"]
        log.completed_at = datetime.now(timezone.utc)
        log.result = execution_result["results"]

        # Save token usage per node
        for node_result in execution_result["results"]:
            if node_result.get("tokens_used", 0) > 0:
                token_entry = TokenUsage(
                    workflow_id=workflow_id,
                    execution_id=log.id,
                    node_id=node_result["node_id"],
                    tokens_used=node_result["tokens_used"],
                    request_size_bytes=node_result.get("request_bytes", 0),
                    response_size_bytes=node_result.get("response_bytes", 0),
                )
                db.add(token_entry)

        return {
            "execution_id": log.id,
            "status": execution_result["status"],
            "results": execution_result["results"],
            "nodes_executed": execution_result["nodes_executed"],
            "nodes_total": execution_result["nodes_total"],
        }

    except DAGValidationError as e:
        log.status = "failed"
        log.completed_at = datetime.now(timezone.utc)
        log.error = str(e)
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        log.status = "failed"
        log.completed_at = datetime.now(timezone.utc)
        log.error = str(e)
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.post("/test")
async def test_execute(workflow_json_data: dict, db: AsyncSession = Depends(get_db)):
    """Execute a workflow directly from flow JSON (for testing without saving)."""
    try:
        execution_result = await run_workflow(workflow_json_data, db)
        return execution_result
    except DAGValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/logs/{workflow_id}")
async def get_execution_logs(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """Get all execution logs for a workflow."""
    result = await db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .order_by(ExecutionLog.started_at.desc())
        .limit(50)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "status": log.status,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
            "result": log.result,
            "error": log.error,
        }
        for log in logs
    ]
