"""FastAPI application entry point for FlowForge."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routes import workflows, execution, credentials, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="FlowForge",
    description="Local workflow automation engine with BYOA support and hardware acceleration",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(workflows.router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(execution.router, prefix="/api/execute", tags=["Execution"])
app.include_router(credentials.router, prefix="/api/credentials", tags=["Credentials"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "name": "FlowForge",
        "version": "0.1.0",
        "status": "running",
        "description": "Local workflow automation engine",
    }


@app.get("/api/hardware-status", tags=["System"])
async def get_hardware_status():
    """Returns local hardware capabilities (CUDA/MPS/NPU/CPU)."""
    from app.hardware_detector import get_hardware_status as get_hw
    return get_hw()

@app.get("/api/devices", tags=["System"])
async def get_available_devices():
    """Return which compute devices are available on this machine."""
    from app.hardware_detector import get_hardware_status as get_hw
    hw = get_hw()
    return {
        "cpu": hw.get("cpu", True),
        "gpu": hw.get("cuda", False) or hw.get("mps", False),
        "npu": hw.get("npu", False)
    }
