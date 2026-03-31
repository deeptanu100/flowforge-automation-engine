"""Database engine and session management for FlowForge."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, inspect
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(DATABASE_DIR, 'flowforge.db')}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def migrate_db():
    """Add missing columns to existing tables (safe for SQLite)."""
    migrations = [
        ("workflows", "version", "INTEGER DEFAULT 1"),
    ]

    async with engine.begin() as conn:
        for table, column, col_type in migrations:
            try:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                logger.info(f"Migration: Added column {column} to {table}")
            except Exception:
                # Column already exists — safe to ignore
                pass


async def init_db():
    """Create all tables on startup and run migrations."""
    async with engine.begin() as conn:
        from app.models import (  # noqa
            Workflow, WorkflowVersion, Credential,
            ExecutionLog, TokenUsage, ScheduledWorkflow
        )
        await conn.run_sync(Base.metadata.create_all)

    await migrate_db()


async def get_db() -> AsyncSession:
    """FastAPI dependency for DB sessions."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
