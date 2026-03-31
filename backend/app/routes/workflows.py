"""Workflow CRUD endpoints with versioning."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Workflow, WorkflowVersion

router = APIRouter()


class WorkflowCreate(BaseModel):
    name: str = "Untitled Workflow"
    description: Optional[str] = None
    workflow_json_data: dict = {}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow_json_data: Optional[dict] = None


@router.get("/")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).order_by(Workflow.updated_at.desc()))
    workflows = result.scalars().all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "version": w.version or 1,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "updated_at": w.updated_at.isoformat() if w.updated_at else None,
        }
        for w in workflows
    ]


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "version": workflow.version or 1,
        "workflow_json_data": workflow.workflow_json_data,
        "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
        "updated_at": workflow.updated_at.isoformat() if workflow.updated_at else None,
    }


@router.post("/", status_code=201)
async def create_workflow(data: WorkflowCreate, db: AsyncSession = Depends(get_db)):
    workflow = Workflow(
        name=data.name,
        description=data.description,
        workflow_json_data=data.workflow_json_data,
        version=1,
    )
    db.add(workflow)
    await db.flush()
    return {"id": workflow.id, "name": workflow.name, "version": 1}


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, data: WorkflowUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Archive current version before overwriting
    if workflow.workflow_json_data and data.workflow_json_data is not None:
        version_snapshot = WorkflowVersion(
            workflow_id=workflow.id,
            version_number=workflow.version or 1,
            workflow_json_data=workflow.workflow_json_data,
            name=workflow.name,
        )
        db.add(version_snapshot)

    if data.name is not None:
        workflow.name = data.name
    if data.description is not None:
        workflow.description = data.description
    if data.workflow_json_data is not None:
        workflow.workflow_json_data = data.workflow_json_data
        workflow.version = (workflow.version or 1) + 1

    return {"id": workflow.id, "name": workflow.name, "version": workflow.version, "status": "updated"}


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(workflow)
    return {"status": "deleted"}


@router.get("/{workflow_id}/versions")
async def list_workflow_versions(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """List all version snapshots for a workflow."""
    result = await db.execute(
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == workflow_id)
        .order_by(WorkflowVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "name": v.name,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in versions
    ]


@router.post("/{workflow_id}/restore/{version_number}")
async def restore_workflow_version(
    workflow_id: str, version_number: int, db: AsyncSession = Depends(get_db)
):
    """Restore a workflow to a specific version."""
    # Find the version snapshot
    result = await db.execute(
        select(WorkflowVersion).where(
            WorkflowVersion.workflow_id == workflow_id,
            WorkflowVersion.version_number == version_number,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail=f"Version {version_number} not found")

    # Get the current workflow
    wf_result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = wf_result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Archive current state before restoring
    archive = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=workflow.version or 1,
        workflow_json_data=workflow.workflow_json_data,
        name=workflow.name,
    )
    db.add(archive)

    # Restore
    workflow.workflow_json_data = version.workflow_json_data
    workflow.name = version.name or workflow.name
    workflow.version = (workflow.version or 1) + 1

    return {
        "id": workflow.id,
        "name": workflow.name,
        "version": workflow.version,
        "status": "restored",
        "workflow_json_data": workflow.workflow_json_data,
    }
