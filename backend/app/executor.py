"""Async workflow execution engine for FlowForge."""

import httpx
import asyncio
import time
import json
import re
import operator
import logging
from datetime import datetime, timezone
from typing import Any
from app.dag_parser import DAGNode, parse_flow_to_dag, build_edge_list, get_downstream_nodes
from app.security import decrypt_credential
from app.token_tracker import estimate_tokens
from app.hardware_detector import get_hardware_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Credential
import concurrent.futures

logger = logging.getLogger(__name__)

# Process pool for isolating heavy AI compute from the FastAPI event loop
process_pool = concurrent.futures.ProcessPoolExecutor(max_workers=2)

# Safe operators for condition evaluation
SAFE_OPERATORS = {
    "==": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    "<": operator.lt,
    ">=": operator.ge,
    "<=": operator.le,
}


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


def resolve_json_path(data: Any, path: str) -> Any:
    """Resolve a dot-separated path into nested data. e.g., 'body.items' on {'body': {'items': [1,2]}}"""
    parts = path.strip().split(".")
    current = data
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
    return current


def evaluate_condition(condition: str, context: dict[str, Any]) -> bool:
    """
    Safely evaluate a condition expression against upstream context.
    Supports: upstream_id.field == value, len(upstream_id.field) > 0, etc.
    """
    condition = condition.strip()

    # Resolve {{ placeholder }} references first
    def replace_ref(match):
        ref = match.group(1).strip()
        parts = ref.split(".", 1)
        node_id = parts[0]
        path = parts[1] if len(parts) > 1 else None

        if node_id in context:
            value = context[node_id]
            if path:
                value = resolve_json_path(value, path)
            return json.dumps(value) if not isinstance(value, (int, float, bool)) else str(value)
        return "null"

    resolved = re.sub(r"\{\{\s*(.+?)\s*\}\}", replace_ref, condition)

    # Try to evaluate with safe operators
    for op_str, op_fn in SAFE_OPERATORS.items():
        if op_str in resolved:
            parts = resolved.split(op_str, 1)
            if len(parts) == 2:
                try:
                    left = json.loads(parts[0].strip())
                    right = json.loads(parts[1].strip())
                    return op_fn(left, right)
                except (json.JSONDecodeError, TypeError):
                    pass

    # Simple truthy/falsy check
    try:
        val = json.loads(resolved)
        return bool(val)
    except (json.JSONDecodeError, TypeError):
        return bool(resolved and resolved.lower() not in ("false", "null", "0", "none", ""))


async def execute_with_retry(execute_fn, node: DAGNode, context: dict[str, Any], db: AsyncSession = None) -> ExecutionResult:
    """Wrap a node execution with configurable retry logic."""
    retries = node.data.get("retryCount", 0)
    delay_ms = node.data.get("retryDelay", 1000)
    backoff = node.data.get("retryBackoff", "linear")

    result = None
    for attempt in range(retries + 1):
        if db is not None:
            result = await execute_fn(node, context, db)
        else:
            result = await execute_fn(node, context)

        if result.status == "success":
            return result

        if attempt < retries:
            if backoff == "exponential":
                wait = (delay_ms / 1000.0) * (2 ** attempt)
            else:
                wait = (delay_ms / 1000.0) * (attempt + 1)
            logger.info(f"Retrying node {node.id} (attempt {attempt + 2}/{retries + 1}) after {wait:.1f}s")
            await asyncio.sleep(wait)

    return result


async def execute_api_request_node(node: DAGNode, context: dict[str, Any], db: AsyncSession) -> ExecutionResult:
    """Execute an API Request node — makes an async HTTP call."""
    data = node.data
    url = data.get("url", "")
    method = data.get("method", "GET").upper()
    headers = data.get("headers", {})
    body = data.get("body", None)

    # Parse headers if string
    if isinstance(headers, str):
        try:
            headers = json.loads(headers) if headers.strip() else {}
        except json.JSONDecodeError:
            headers = {}

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


async def execute_conditional_node(node: DAGNode, context: dict[str, Any]) -> ExecutionResult:
    """Execute a Conditional node — evaluates a condition and determines branch."""
    data = node.data
    condition = data.get("condition", "true")

    start = time.perf_counter()
    try:
        branch_result = evaluate_condition(condition, context)
        elapsed = (time.perf_counter() - start) * 1000

        return ExecutionResult(
            node_id=node.id,
            status="success",
            data={
                "branch": "true" if branch_result else "false",
                "condition": condition,
                "evaluated": branch_result,
            },
            duration_ms=elapsed,
        )
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return ExecutionResult(node.id, "error", error=f"Condition evaluation failed: {str(e)}", duration_ms=elapsed)


async def execute_loop_node(node: DAGNode, context: dict[str, Any], dag_nodes: list[DAGNode],
                            edges, db: AsyncSession) -> ExecutionResult:
    """Execute a Loop node — iterates over an array and runs downstream subgraph per item."""
    data = node.data
    array_path = data.get("arrayPath", "")
    max_iterations = int(data.get("maxIterations", 100))

    start = time.perf_counter()

    # Resolve the input array from upstream context
    input_array = None
    for dep_id in node.dependencies:
        if dep_id in context:
            if array_path:
                input_array = resolve_json_path(context[dep_id], array_path)
            else:
                input_array = context[dep_id]
            break

    if not isinstance(input_array, list):
        elapsed = (time.perf_counter() - start) * 1000
        return ExecutionResult(
            node.id, "error",
            error=f"Loop input is not an array. Got: {type(input_array).__name__}. "
                  f"Check the Array Path expression.",
            duration_ms=elapsed,
        )

    # Cap iterations
    items = input_array[:max_iterations]
    iteration_results = []

    # Find downstream nodes of this loop node
    downstream_ids = get_downstream_nodes(node.id, edges)
    downstream_nodes = [n for n in dag_nodes if n.id in downstream_ids]

    for idx, item in enumerate(items):
        # Create iteration context with loop metadata
        iter_context = {**context}
        iter_context["loop"] = {
            "current": item,
            "index": idx,
            "total": len(items),
        }
        iter_context[node.id] = {"current": item, "index": idx}

        # Execute downstream subgraph for this iteration
        for sub_node in downstream_nodes:
            if sub_node.type == "apiRequest":
                result = await execute_with_retry(execute_api_request_node, sub_node, iter_context, db)
            elif sub_node.type == "localCompute":
                result = await execute_with_retry(execute_local_compute_node, sub_node, iter_context)
            else:
                continue

            if result.status == "success" and result.data:
                iter_context[sub_node.id] = result.data

            iteration_results.append({
                "iteration": idx,
                "node_id": sub_node.id,
                **result.to_dict(),
            })

    elapsed = (time.perf_counter() - start) * 1000
    return ExecutionResult(
        node_id=node.id,
        status="success",
        data={
            "iterations_completed": len(items),
            "total_items": len(input_array),
            "capped": len(input_array) > max_iterations,
            "results": iteration_results,
        },
        duration_ms=elapsed,
    )


async def run_workflow(workflow_json_data: dict, db: AsyncSession) -> dict:
    """
    Execute a complete workflow from React Flow JSON.

    Returns a dict with overall status and per-node results.
    """
    dag_nodes = parse_flow_to_dag(workflow_json_data)
    edges = build_edge_list(workflow_json_data)
    context: dict[str, Any] = {}  # Stores outputs from completed nodes
    results: list[dict] = []
    overall_status = "success"
    skipped_nodes: set[str] = set()  # Nodes on non-taken conditional branches

    for node in dag_nodes:
        # Skip nodes on non-taken branches
        if node.id in skipped_nodes:
            results.append(ExecutionResult(node.id, "skipped", data={"reason": "Branch not taken"}).to_dict())
            continue

        # Skip tutorial/note nodes
        if node.type == "tutorialNode":
            results.append(ExecutionResult(node.id, "skipped", data={"reason": "Tutorial node"}).to_dict())
            continue

        if node.type == "apiRequest":
            result = await execute_with_retry(execute_api_request_node, node, context, db)
        elif node.type == "localCompute":
            result = await execute_with_retry(execute_local_compute_node, node, context)
        elif node.type == "conditional":
            result = await execute_conditional_node(node, context)

            # Determine which branch to skip
            if result.status == "success" and result.data:
                taken_branch = result.data.get("branch", "true")
                skip_handle = "false-output" if taken_branch == "true" else "true-output"
                # Mark all downstream nodes on the non-taken branch as skipped
                nodes_to_skip = get_downstream_nodes(node.id, edges, source_handle=skip_handle)
                skipped_nodes.update(nodes_to_skip)

        elif node.type == "loop":
            result = await execute_loop_node(node, context, dag_nodes, edges, db)

            # Mark loop's downstream nodes as already handled (don't re-execute them)
            downstream_ids = get_downstream_nodes(node.id, edges)
            skipped_nodes.update(downstream_ids)
        else:
            result = ExecutionResult(node.id, "skipped", error=f"Unknown node type: {node.type}")

        # Store output in context for downstream nodes
        if result.status == "success" and result.data:
            context[node.id] = result.data

        results.append(result.to_dict())

        if result.status == "error":
            # Check continueOnError flag
            if node.data.get("continueOnError", False):
                logger.warning(f"Node {node.id} failed but continueOnError is set — continuing")
                overall_status = "partial"
            else:
                overall_status = "failed"
                break  # Stop execution on first error

    return {
        "status": overall_status,
        "results": results,
        "nodes_executed": len(results),
        "nodes_total": len(dag_nodes),
    }
