"""Credential management endpoints — API keys are encrypted at rest."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Credential
from app.security import encrypt_credential, mask_credential, decrypt_credential

router = APIRouter()


class CredentialCreate(BaseModel):
    name: str
    service_name: str
    api_key: str  # Plain text — will be encrypted before storage


class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    service_name: Optional[str] = None
    api_key: Optional[str] = None  # New key in plain text (optional)


@router.get("/")
async def list_credentials(db: AsyncSession = Depends(get_db)):
    """List all credentials (keys are masked, never returned in plain text)."""
    result = await db.execute(select(Credential).order_by(Credential.created_at.desc()))
    creds = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "service_name": c.service_name,
            "key_preview": mask_credential(decrypt_credential(c.encrypted_api_key)),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in creds
    ]


@router.post("/", status_code=201)
async def create_credential(data: CredentialCreate, db: AsyncSession = Depends(get_db)):
    """Store a new API key (encrypted)."""
    encrypted = encrypt_credential(data.api_key)
    cred = Credential(
        name=data.name,
        service_name=data.service_name,
        encrypted_api_key=encrypted,
    )
    db.add(cred)
    await db.flush()
    return {
        "id": cred.id,
        "name": cred.name,
        "service_name": cred.service_name,
        "key_preview": mask_credential(data.api_key),
    }


@router.put("/{credential_id}")
async def update_credential(credential_id: str, data: CredentialUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Credential).where(Credential.id == credential_id))
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    if data.name is not None:
        cred.name = data.name
    if data.service_name is not None:
        cred.service_name = data.service_name
    if data.api_key is not None:
        cred.encrypted_api_key = encrypt_credential(data.api_key)

    return {"id": cred.id, "name": cred.name, "status": "updated"}


@router.delete("/{credential_id}")
async def delete_credential(credential_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Credential).where(Credential.id == credential_id))
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    await db.delete(cred)
    return {"status": "deleted"}
