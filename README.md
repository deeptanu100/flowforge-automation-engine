# FlowForge: Local-First Workflow Automation Engine ⚙️

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20|%20macOS-blue.svg)](https://github.com/deeptanu100/flowforge-automation-engine)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)

**FlowForge** is a high-performance, local-first automation platform designed for developers and AI engineers. It bridges the gap between low-code visual design and high-performance native execution, enabling complex workflows that leverage your local hardware (GPU/NPU) without compromising data privacy.

---

## 🌐 Live Preview
**Experience the interface here**: [https://deeptanu100.github.io/flowforge-automation-engine/](https://deeptanu100.github.io/flowforge-automation-engine/)

> [!WARNING]
> **Static Preview Mode**: The live link above is a **static frontend build**. While you can explore the visual canvas and node interactions, the **local Python backend** is required for real-time workflow execution and hardware-accelerated tasks.

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏗️ Core Architecture](#-core-architecture)
- [🧩 Node Types](#-node-types)
- [🛡️ Security & Privacy](#-security--privacy)
- [🚀 Quick Start](#-quick-start)
- [📂 Project Structure](#-project-structure)
- [📄 License](#-license)

---

## ✨ Key Features

### 🎨 Visual Programming Canvas
- **Drag-and-Drop Editor**: Powered by `@xyflow/react`, featuring a fluid, high-performance DAG (Directed Acyclic Graph) canvas.
- **Dynamic Connection Validation**: Ensures logical data flow between nodes in real-time.
- **Auto-Layout & MiniMap**: Manage complex automation flows with built-in navigation tools.

### ⚡ Hybrid Execution Engine
- **Atomic Node Execution**: Each node in the graph is an independent execution unit.
- **Dependency Flow**: The engine automatically resolves execution order based on graph topology.
- **High-Performance Bridge**: A seamless integration between the React UI and a Python-based execution core.

### 🏎️ Hardware Acceleration (HAL)
- **Native Device Detection**: Automatically scans for **NVIDIA CUDA**, **Apple Silicon MPS**, or **NPU** platforms.
- **Optimal Routing**: Heavy AI/ML compute tasks are intelligently routed to the most efficient available hardware.

---

## 🏗️ Core Architecture

FlowForge uses a **Decoupled Mono-repo** architecture:
1.  **React Frontend**: A modern, responsive dashboard for workflow design and monitoring.
2.  **FastAPI Backend**: A robust async server that manages state, stores credentials, and orchestrates the execution engine.
3.  **Process-Isolated Executor**: Heavy compute tasks (like AI model runs) are offloaded to a dedicated `ProcessPoolExecutor` to prevent blocking the main event loop.

---

## 🧩 Node Types

| Node Type | Description | Capabilities |
| :--- | :--- | :--- |
| **API Request** | Standard HTTP client | `GET`, `POST`, `PUT`, `DELETE` with JSON body support. |
| **Local Compute** | Native Python executor | Runs AI models or script blocks with hardware acceleration. |
| **Tutorial Node** | Embedded documentation | Full Markdown support for in-canvas guides and notes. |

---

## 🛡️ Security & Privacy

We take a **Local-First** approach to security:
- **AES-256 Encryption**: All sensitive API keys and credentials are encrypted using the `cryptography` library.
- **Local Storage**: Your sensitive data never leaves your machine. It is stored in a local SQLite database, encrypted with a key known only to your local environment.
- **In-Memory Injection**: Credentials are only decrypted in-memory during exact execution and never logged.

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18.x+ (npm or yarn)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/deeptanu100/flowforge-automation-engine.git
cd flowforge-automation-engine

# Setup Backend
cd backend
python -m venv venv
# Windows: venv\\Scripts\\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python run.py

# Setup Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```text
flowforge/
├── .github/          # GitHub Actions (Auto-Deploy)
├── backend/          # FastAPI Server & Execution Engine
│   ├── app/          # Core Logic (HAL, Security, Executor)
│   ├── data/         # Local DB Storage (Encrypted)
│   └── run.py        # Entry Point
├── frontend/         # React Application
│   ├── src/          # Components, Hooks, Canvas Logic
│   └── vite.config.ts # Deployment Config
└── docs/             # Technical Specification (FEATURES, ARCHITECTURE)
```

---

## 📄 License

This project is governed by the **FlowForge Custom License**. It is a restrictive license that requires mandatory attribution, prohibits direct sale of the software, and requires written authorization for commercial use. 

See the full [LICENSE](./LICENSE) file for the complete legal text, attribution requirements, and jurisdictional details (Supreme Court of India).

---

**Built with ❤️ for the future of local-first AI automation.**
