# Architecture & Design Overview

This document explains the technical inner workings of FlowForge.

## System Architecture

FlowForge is a high-performance, local-first automation platform that bridges visual design with native execution.

### High-Level Components

- **Frontend (Visual Layer)**:
  - Built with **React** + **Vite**.
  - Uses **@xyflow/react** (React Flow) for the directed acyclic graph (DAG) visualization.
  - State management handles node connections, data validation, and real-time execution response updates.

- **Backend (Execution Layer)**:
  - Built with **FastAPI**.
  - **Uvicorn** handles high-throughput asynchronous requests.
  - **SQLAlchemy (Async)** manages persistent workflow storage and audit logs.

- **Database (Persistence Layer)**:
  - **SQLite** (aiosqlite) provides a reliable, zero-config local database.
  - Stores workflows, execution history, and cryptographically secured credentials.

---

## The Execution Lifecycle

1. **DAG Parsing**:
   - The React Flow JSON is parsed into a Directed Acyclic Graph (DAG) by `app.dag_parser`.
   - Dependencies are resolved to ensure nodes execute in order (e.g., API nodes before processing nodes).

2. **Hardware Abstraction Layer (HAL)**:
   - `app.hardware_detector` scans for **CUDA (NVIDIA)**, **MPS (Apple Silicon)**, and **NPU** capabilities.
   - The executor routes compute tasks (like AI/ML models) to the most efficient device available.

3. **Secure Context Execution**:
   - API requests are executed via `httpx.AsyncClient`.
   - Credentials are decrypted in-memory using **AES-256** and injected into request headers.
   - Upstream outputs are dynamically injected into downstream node templates (e.g., `{{ input_node_id }}`).

4. **Metrics & Tracking**:
   - Real-time **Token Usage Tracking** estimates consumption of LLM-style nodes.
   - Data transfer sizes (request/response bytes) and execution durations are logged for performance monitoring.

---

## Security Model

- **Local-First**: All data, including API keys and database files, stay on the user's local machine.
- **AES-256 Encryption**: Sensitive credentials are encrypted using the `cryptography` Fernet implementation.
- **Process Isolation**: Heavy compute tasks (like sentiment analysis) are isolated from the main FastAPI event loop using a **ProcessPoolExecutor** to maintain high UI responsiveness.
