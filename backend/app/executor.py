"""Async workflow execution engine for FlowForge."""

import httpx
import asyncio
import time
import platform
import subprocess
from datetime import datetime, timezone
from typing import Any
from app.dag_parser import DAGNode, parse_flow_to_dag
from app.security import decrypt_credential
from app.token_tracker import estimate_tokens
from app.hardware_detector import get_hardware_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Credential
import concurrent.futures

# Process pool for isolating heavy AI compute from the FastAPI event loop
process_pool = concurrent.futures.ProcessPoolExecutor(max_workers=2)


class ExecutionResult:
    """Result of a single node execution."""

    def __init__(self, node_id: str, status: str, data: Any = None, error: str = None,
                 tokens_used: int = 0, request_bytes: int = 0, response_bytes: int = 0,
                 duration_ms: float = 0):
        self.node_id = node_id
        self.status = status
        self.data = data
        self.error = error
        self.tokens_used = tokens_used
        self.request_bytes = request_bytes
        self.response_bytes = response_bytes
        self.duration_ms = duration_ms

    def to_dict(self):
        return {
            "node_id": self.node_id,
            "status": self.status,
            "data": self.data,
            "error": self.error,
            "tokens_used": self.tokens_used,
            "request_bytes": self.request_bytes,
            "response_bytes": self.response_bytes,
            "duration_ms": self.duration_ms,
        }


# Deprecated wrapper. Frontend uses /api/devices or /api/hardware-status directly in main.py
def detect_available_devices() -> dict[str, bool]:
    hw = get_hardware_status()
    return {
        "cpu": hw.get("cpu", True),
        "gpu": hw.get("cuda", False) or hw.get("mps", False),
        "npu": hw.get("npu", False)
    }


async def execute_api_request_node(node: DAGNode, context: dict[str, Any], db: AsyncSession) -> ExecutionResult:
    """Execute an API Request node — makes an async HTTP call."""
    data = node.data
    url = data.get("url", "")
    method = data.get("method", "GET").upper()
    headers = data.get("headers", {})
    body = data.get("body", None)

    # Resolve API key from credential ID via DB
    credential_id = data.get("credentialId", "")
    api_key = data.get("apiKey", "")  # Fallback
    
    if credential_id:
        cred_result = await db.execute(select(Credential).where(Credential.id == credential_id))
        cred = cred_result.scalar_one_or_none()
        if cred:
            try:
                api_key = decrypt_credential(cred.encrypted_api_key)
            except Exception:
                return ExecutionResult(node.id, "error", error="Failed to decrypt API key")
        else:
            return ExecutionResult(node.id, "error", error="Selected credential not found")

    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Inject upstream data into URL/body if needed
    if body and isinstance(body, str):
        for dep_id in node.dependencies:
            placeholder = f"{{{{ {dep_id} }}}}"
            if placeholder in body and dep_id in context:
                body = body.replace(placeholder, str(context[dep_id]))

    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            request_body = body.encode() if body else b""
            request_bytes = len(request_body) + len(str(headers).encode())

            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                content=request_body if body else None,
            )
            elapsed = (time.perf_counter() - start) * 1000
            response_bytes = len(response.content)
            tokens = estimate_tokens(response.headers, response.content, request_body)

            result_data = {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text[:5000],  # Cap response body stored
            }

            return ExecutionResult(
                node_id=node.id,
                status="success" if response.is_success else "error",
                data=result_data,
                error=None if response.is_success else f"HTTP {response.status_code}",
                tokens_used=tokens,
                request_bytes=request_bytes,
                response_bytes=response_bytes,
                duration_ms=elapsed,
            )

    except httpx.TimeoutException:
        elapsed = (time.perf_counter() - start) * 1000
        return ExecutionResult(node.id, "error", error="Request timed out (30s)", duration_ms=elapsed)
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return ExecutionResult(node.id, "error", error=str(e), duration_ms=elapsed)


async def execute_local_compute_node(node: DAGNode, context: dict[str, Any]) -> ExecutionResult:
    """Execute a Local Compute node — runs heavy tasks isolated in a ProcessPool."""
    data = node.data
    device = data.get("device", "cpu").lower()
    script = data.get("script", "")
    params = data.get("params", {})

    hw_status = get_hardware_status()
    
    # Map vague "gpu" from frontend to specific PyTorch device logic
    target_device = device
    if device == "gpu":
        if hw_status.get("cuda"): 
            target_device = "cuda"
        elif hw_status.get("mps"): 
            target_device = "mps"
        else: 
            target_device = "cpu"

    start = time.perf_counter()
    try:
        # Phase 2: Intercept 'poc_sentiment' to execute heavy AI workload in isolated process pool
        if script == "poc_sentiment" or params.get("type") == "poc_sentiment":
            text_input = params.get("text", "I love using FlowForge!")
            
            # Inject dynamic context if available
            for dep_id, dep_data in context.items():
                if isinstance(dep_data, dict) and "body" in dep_data:
                    text_input = f"{text_input} {dep_data['body']}"
            
            from app.compute_tasks import run_sentiment_analysis
            loop = asyncio.get_running_loop()
            
            # Offload heavy text analysis to avoid blocking FastAPI
            result = await loop.run_in_executor(
                process_pool, 
                run_sentiment_analysis, 
                text_input, 
                target_device
            )
            
            elapsed = (time.perf_counter() - start) * 1000
            
            if result.get("status") == "success":
                return ExecutionResult(
                    node.id, "success", 
                    data=result, 
                    duration_ms=elapsed
                )
            else:
                return ExecutionResult(
                    node.id, "error", 
                    error=str(result), 
                    duration_ms=elapsed
                )
                
        # Subprocess fallback for Phase 1 arbitrary scripts
        env_vars = {f"FLOWFORGE_PARAM_{k.upper()}": str(v) for k, v in params.items()}
        env_vars["FLOWFORGE_DEVICE"] = target_device

        # Inject upstream context
        for dep_id, dep_data in context.items():
            env_vars[f"FLOWFORGE_INPUT_{dep_id.replace('-', '_').upper()}"] = str(dep_data)[:10000]

        import os
        full_env = {**os.environ, **env_vars}

        process = await asyncio.create_subprocess_shell(
            script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)
        elapsed = (time.perf_counter() - start) * 1000

        if process.returncode == 0:
            return ExecutionResult(
                node.id, "success",
                data={"stdout": stdout.decode()[:5000], "stderr": stderr.decode()[:2000]},
                duration_ms=elapsed,
            )
        else:
            return ExecutionResult(
                node.id, "error",
                data={"stdout": stdout.decode()[:5000]},
                error=stderr.decode()[:2000] or f"Exit code: {process.returncode}",
                duration_ms=elapsed,
            )

    except asyncio.TimeoutError:
        elapsed = (time.perf_counter() - start) * 1000
        return ExecutionResult(node.id, "error", error="Task timed out (120s)", duration_ms=elapsed)
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        import traceback
        return ExecutionResult(node.id, "error", error=f"{str(e)}\n{traceback.format_exc()}", duration_ms=elapsed)


async def run_workflow(workflow_json_data: dict, db: AsyncSession) -> dict:
    """
    Execute a complete workflow from React Flow JSON.

    Returns a dict with overall status and per-node results.
    """
    dag_nodes = parse_flow_to_dag(workflow_json_data)
    context: dict[str, Any] = {}  # Stores outputs from completed nodes
    results: list[dict] = []
    overall_status = "success"

    for node in dag_nodes:
        if node.type == "apiRequest":
            result = await execute_api_request_node(node, context, db)
        elif node.type == "localCompute":
            result = await execute_local_compute_node(node, context)
        else:
            result = ExecutionResult(node.id, "skipped", error=f"Unknown node type: {node.type}")

        # Store output in context for downstream nodes
        if result.status == "success" and result.data:
            context[node.id] = result.data

        results.append(result.to_dict())

        if result.status == "error":
            overall_status = "failed"
            break  # Stop execution on first error

    return {
        "status": overall_status,
        "results": results,
        "nodes_executed": len(results),
        "nodes_total": len(dag_nodes),
    }
