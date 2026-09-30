# 🚌 RideCast — AI Bus Crowd Forecasting & Fleet Allocation Engine

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15+-FF6F00.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.3+-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

**RideCast** is an intelligent public transit demand forecasting and smart fleet management platform tailored for urban bus networks (Coimbatore TNSTC corridor). It uses a deep learning **Long Short-Term Memory (LSTM)** neural network to predict passenger crowding 7 days in advance and provides transport authorities with an automated decision-support engine for dynamic bus allocation.

---

## 🏛️ System Architecture

```
                          ┌──────────────────────────────────────┐
                          │         USER INTERFACE (Next.js)      │
                          │   http://localhost:3000              │
                          └──────────────────┬───────────────────┘
                                             │ HTTP REST / JSON
                                             ▼
                          ┌──────────────────────────────────────┐
                          │         FASTAPI BACKEND SERVER       │
                          │   http://127.0.0.1:8000              │
                          └──────┬───────────┬───────────┬───────┘
                                 │           │           │
                 ┌───────────────┘           │           └──────────────┐
                 ▼                           ▼                          ▼
       ┌───────────────────┐       ┌───────────────────┐      ┌───────────────────┐
       │   TENSORFLOW LSTM │       │  HAVERSINE ENGINE │      │   SQLITE3 LOGS    │
       │   Crowd Forecaster│       │  Fleet Proximity  │      │  Auth & Auditing  │
       └───────────────────┘       └───────────────────┘      └───────────────────┘
```

---

## 📁 Repository Directory Structure

```
RideCast/
├── main.py                   # ⭐ Root application entry point
├── run.py                    # Runner alias (python run.py)
├── run_backend.bat           # 1-click Windows launcher for Backend
├── run_frontend.bat          # 1-click Windows launcher for Frontend
├── requirements.txt          # Python dependencies
│
├── backend/                  # 🔌 FastAPI REST Backend
│   ├── config.py             # Global paths, constants & Coimbatore coordinates
│   ├── main.py               # Server initialization, CORS & router mounting
│   ├── db/                   # SQLite database persistence layer
│   │   ├── database.py       # Table schemas, user hashing & allocation queries
│   │   ├── users.db          # Officer accounts & fleet allocation audit logs
│   │   └── feedback.db       # Commuter feedback records
│   ├── routers/              # Modular API endpoints
│   │   ├── auth.py           # Officer authentication & verification
│   │   ├── authority.py      # Operations dashboard, recommendations & PDF export
│   │   ├── feedback.py       # Commuter crowd ratings
│   │   ├── metadata.py       # Stops, routes, geometry & timetables
│   │   └── predict.py        # LSTM demand & crowd level forecasting
│   └── services/             # Core business & ML engines
│       ├── allocation_service.py # Haversine distance & depot bus selector
│       ├── model_service.py      # LSTM inference, 7-day sliding window & XAI
│       └── report_service.py     # PDF operations report compiler
│
├── frontend/                 # 🌐 Next.js 16 + React 19 Frontend
│   ├── public/               # Static assets & icons
│   ├── src/
│   │   ├── app/              # Next.js App Router (page.tsx, globals.css)
│   │   ├── components/       # Modular UI components
│   │   │   ├── auth/         # Login modal
│   │   │   ├── authority/    # Transport authority portal & dispatch views
│   │   │   ├── layout/       # Navbar & sidebar navigation
│   │   │   ├── map/          # Interactive Leaflet journey & network maps
│   │   │   └── passenger/    # Commuter search & crowd forecast cards
│   │   └── lib/              # API client & TypeScript interfaces
│   └── package.json
│
└── dataset/                  # 📊 Data Pipeline, Models & Tests
    ├── data/                 # Master CSV files (stops, routes, history, weather)
    │   └── processed/        # Preprocessed arrays, scalers & encoders
    ├── model/                # Trained LSTM neural network (.keras)
    ├── src/                  # Pipeline source scripts
    │   ├── data_generation/  # Data synthesizers & dimension enrichers
    │   ├── preprocessing/    # Feature scaling & sequence generation
    │   └── model/            # Model definition, training & evaluation
    └── tests/                # Automated integration & verification tests
```

---

## ⚡ Quick Start Guide

### 1. Start the Backend API Server
From the root `RideCast` directory:
```bash
python main.py
# Or run: python run.py
# Or double-click: run_backend.bat
```
* **API Server:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive Docs (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Start the Frontend Web Application
In a separate terminal window:
```bash
cd frontend
npm run dev
# Or double-click: run_frontend.bat
```
* **Frontend Web App:** [http://localhost:3000](http://localhost:3000)

---

## 🔑 Default Credentials

To access the **Transport Authority Operations Portal**:
* **Username:** `admin`
* **Password:** `admin123`

---

## 🧪 Running Verification Tests

To verify backend services, route lookups, and LSTM model inference:
```bash
python dataset/tests/test_backend_services.py
```

---

## 👥 Key Features

### For Commuters (Passenger Portal)
* **Smart Stop Selection:** Choose from 93 stops across 3 major Coimbatore transit corridors (Sathy Rd, Pollachi Rd, Palakkad Rd).
* **Crowd Density Forecasts:** View predicted passenger crowding (🟢 Low, 🟡 Moderate, 🔴 High) across all 6 daily time slots.
* **Explainable AI (XAI):** Clear rationale for demand surges (e.g. weather impacts, office peak hours, festival holidays).
* **Interactive Maps & Schedules:** Full street-snapped Leaflet routes and scheduled departure timetables.
* **Commuter Feedback:** One-click rating to refine predictions over time.

### For Transport Authorities (Authority Dashboard)
* **Executive KPIs:** Live metrics on network passengers, active fleet, and high-congestion corridors.
* **Smart Bus Allocation Engine:** Automatically finds and recommends the nearest idle depot bus using Haversine distance calculations.
* **Audit Trail:** Full chronological log of all bus dispatches with timestamps and officer accountability.
* **1-Click Executive PDF Export:** Generates official daily operations summary reports ready for management review.
