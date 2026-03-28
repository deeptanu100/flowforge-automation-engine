# FlowForge: Local Workflow Automation Engine

FlowForge is a high-performance, local-first automation platform that bridges visual node-based design with native execution and AI acceleration.

## 🔥 Key Features

- **Visual Workflow Canvas**: Drag-and-drop directed acyclic graph (DAG) editor.
- **Hybrid Execution Engine**: Run API requests or local compute tasks natively.
- **Hardware Acceleration (HAL)**: Auto-detects and leverages **NVIDIA CUDA**, **Apple Silicon MPS**, and **NPUs**.
- **Secure Credentials Manager**: All sensitive data is encrypted with **AES-256** using the `cryptography` library.
- **Metric Tracking**: Real-time token usage estimation and performance monitoring.
- **Tutorial Integration**: Built-in markdown-capable documentation nodes.

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + @xyflow/react
- **Backend**: FastAPI + SQLAlchemy (Async) + Uvicorn
- **Database**: SQLite (aiosqlite)
- **Security**: Python `cryptography` (Advanced Encryption Standard)

## 🚀 Quick Start

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/flowforge-automation-engine.git
    cd flowforge-automation-engine
    ```

2.  **Setup Backend**:
    - Build and activate a virtual environment.
    - Install dependencies from `backend/requirements.txt`.
    - Run `python backend/run.py`.

3.  **Setup Frontend**:
    - Install node modules in `frontend/`.
    - Run `npm run dev`.

**Detailed Setup Instructions**: [SETUP.md](./SETUP.md)

## 📖 Documentation

- **[FEATURES.md](./FEATURES.md)**: Deep dive into core functionalities.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Technical design and data flow.
- **[SETUP.md](./SETUP.md)**: Detailed installation and configuration guide.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

Built for high-performance automation and AI local computing.
