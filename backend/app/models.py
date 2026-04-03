"""SQLAlchemy ORM models for FlowForge."""

from sqlalchemy import Column, String, Text, DateTime, Integer, Float, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, default="Untitled Workflow")
    description = Column(Text, nullable=True)
    workflow_json_data = Column(JSON, nullable=False, default=dict)  # React Flow JSON
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WorkflowVersion(Base):
    __tablename__ = "workflow_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    workflow_json_data = Column(JSON, nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Credential(Base):
    __tablename__ = "credentials"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)  # User-friendly label
    service_name = Column(String(255), nullable=False)  # e.g., "OpenAI"
    encrypted_api_key = Column(Text, nullable=False)  # Fernet-encrypted API key
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, running, success, failed
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(JSON, nullable=True)  # Per-node execution results
    error = Column(Text, nullable=True)


class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(String, primary_key=True, default=generate_uuid)
    credential_id = Column(String, ForeignKey("credentials.id"), nullable=True)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False, index=True)
    execution_id = Column(String, ForeignKey("execution_logs.id"), nullable=False, index=True)
    node_id = Column(String, nullable=False)  # React Flow node ID
    node_label = Column(String(255), nullable=True)
    tokens_used = Column(Integer, default=0)
    cost_estimate = Column(Float, default=0.0)
    request_size_bytes = Column(Integer, default=0)
    response_size_bytes = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class ScheduledWorkflow(Base):
    __tablename__ = "scheduled_workflows"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False, index=True)
    cron_expression = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
