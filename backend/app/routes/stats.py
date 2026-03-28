"""Token usage statistics endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import TokenUsage

router = APIRouter()


@router.get("/tokens")
async def get_total_token_usage(db: AsyncSession = Depends(get_db)):
    """Get total token usage across all workflows."""
    result = await db.execute(
        select(
            func.sum(TokenUsage.tokens_used).label("total_tokens"),
            func.sum(TokenUsage.cost_estimate).label("total_cost"),
            func.count(TokenUsage.id).label("total_requests"),
        )
    )
    row = result.one()
    return {
        "total_tokens": row.total_tokens or 0,
        "total_cost": round(row.total_cost or 0, 6),
        "total_requests": row.total_requests or 0,
    }


@router.get("/tokens/workflow/{workflow_id}")
async def get_workflow_token_usage(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """Get token usage breakdown for a specific workflow."""
    result = await db.execute(
        select(
            TokenUsage.node_id,
            TokenUsage.node_label,
            func.sum(TokenUsage.tokens_used).label("total_tokens"),
            func.sum(TokenUsage.cost_estimate).label("total_cost"),
            func.sum(TokenUsage.request_size_bytes).label("total_request_bytes"),
            func.sum(TokenUsage.response_size_bytes).label("total_response_bytes"),
            func.count(TokenUsage.id).label("execution_count"),
        )
        .where(TokenUsage.workflow_id == workflow_id)
        .group_by(TokenUsage.node_id, TokenUsage.node_label)
    )
    rows = result.all()
    return [
        {
            "node_id": row.node_id,
            "node_label": row.node_label,
            "total_tokens": row.total_tokens or 0,
            "total_cost": round(row.total_cost or 0, 6),
            "total_request_bytes": row.total_request_bytes or 0,
            "total_response_bytes": row.total_response_bytes or 0,
            "execution_count": row.execution_count or 0,
        }
        for row in rows
    ]


@router.get("/tokens/recent")
async def get_recent_token_usage(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get recent token usage entries."""
    result = await db.execute(
        select(TokenUsage)
        .order_by(TokenUsage.timestamp.desc())
        .limit(limit)
    )
    entries = result.scalars().all()
    return [
        {
            "id": e.id,
            "workflow_id": e.workflow_id,
            "node_id": e.node_id,
            "node_label": e.node_label,
            "tokens_used": e.tokens_used,
            "cost_estimate": e.cost_estimate,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in entries
    ]
