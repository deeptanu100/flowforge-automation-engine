This guide will help you get FlowForge up and running on your local machine.

> [!IMPORTANT]
> **Backend Requirement**: The FlowForge frontend interface is a visual engine that requires the **Python Backend** to be running locally to execute workflows. The live static preview (on GitHub Pages) cannot perform real-time automation. 

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher (npm or yarn)
- **Git**: To clone the repository

---

## Backend Setup (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - **Windows**: `venv\Scripts\activate`
   - **macOS/Linux**: `source venv/bin/activate`

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Initialize the database** (optional, will auto-init on first run):
   ```bash
   python seed_db.py
   ```

6. **Run the server**:
   ```bash
   python run.py
   ```
   The backend will be available at `http://localhost:8000`.

---

## Frontend Setup (React + Vite)

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory with the following (optional):
```env
ENCRYPTION_KEY=your-32-byte-base64-key-here
DATABASE_URL=sqlite+aiosqlite:///./flowforge.db
```

### Frontend (`frontend/.env`)
The frontend uses Vite's proxying or standard environment variables. Usually, no config is needed for local dev.

---

## Troubleshooting

- **Hardware Acceleration**: Ensure you have the latest drivers for your GPU (NVIDIA/AMD) or are on macOS (for Apple Silicon/MPS).
- **Port Conflicts**: If port 8000 or 5173 is in use, modify `run.py` or `vite.config.ts` respectively.
