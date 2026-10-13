# ProcessPulse — AI-Powered Manufacturing Process Intelligence & Improvement System

> **Competition Prototype for Smart Manufacturing Hackathon**
> *"Every process deviation is worth understanding, but not every deviation is a mistake."*

---

## 1. System Overview

ProcessPulse bridges the gap between **Standard Operating Procedures (SOPs)** and **Shop-Floor Reality**. Traditional manufacturing monitors flag deviations blindly; ProcessPulse determines whether a variation causes defects/delays or represents an unrecorded worker innovation worth incorporating into official SOPs.

### Core Value Pipeline
```
SOP Definition ➡️ Actual Execution ➡️ Deviation Detection ➡️ Pattern Analysis 
➡️ Impact Analysis ➡️ AI Investigation ➡️ Human Validation ➡️ Process Memory 
➡️ SOP Review Opportunities
```

---

## 2. Technology Stack

- **Frontend:** React, Vite, Axios, Recharts, Lucide React, Vanilla CSS design tokens.
- **Backend:** Python 3.10+, FastAPI, Pandas, SQLAlchemy, SQLite, Pydantic, Uvicorn.
- **Testing:** Pytest, HTTPX / TestClient.
- **AI Engine:** Backend-only LLM integration with transparent deterministic fallback.

---

## 3. Quickstart Guide (Windows PowerShell)

### Prerequisites
- Python 3.10+ installed and added to PATH
- Node.js v18+ and npm installed

---

### Step 1: Backend Setup & Execution

Open a PowerShell terminal in the repository root:

```powershell
# Navigate to backend directory
cd backend

# Install dependencies (if not already present in environment)
pip install -r requirements.txt

# Run backend unit tests
python -m pytest tests/test_health.py -v

# Launch the FastAPI backend server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at:
- **API Health:** `http://127.0.0.1:8000/api/health`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

---

### Step 2: Frontend Setup & Execution

Open a second PowerShell terminal in the repository root:

```powershell
# Navigate to frontend directory
cd frontend

# Install npm dependencies (if first time)
npm install

# Start Vite development server
npm run dev
```

The frontend will start at:
- **Web Interface:** `http://localhost:5173`

---

## 4. Verification Check
1. Visit `http://localhost:5173` in your browser.
2. Check the **System Architecture Verification** card.
3. You should see `Status: healthy` and `System Operational` in green, confirming live end-to-end communication between React and FastAPI.
