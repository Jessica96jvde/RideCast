# 🔌 RideCast Backend Architecture & API Service

This directory houses the FastAPI REST backend that powers crowd forecasting, fleet allocations, authentication, and reporting for RideCast.

---

## 🗂️ Backend Directory Structure

```
backend/
├── config.py                 # Central configuration, file paths & constants
├── main.py                   # FastAPI server entry point & CORS configuration
├── db/                       # Persistence Layer (SQLite)
│   ├── database.py           # SQLite connection, schema init & queries
│   ├── feedback.db           # Commuter accuracy feedback storage
│   └── users.db              # Officer accounts & fleet allocation audit logs
├── routers/                  # Modular REST API Route Handlers
│   ├── auth.py               # Officer authentication (/api/auth)
│   ├── authority.py          # Transit operations & fleet dispatch (/api/authority)
│   ├── feedback.py           # Commuter accuracy feedback (/api/feedback)
│   ├── metadata.py           # Stops, routes, geometry & timetables (/api/metadata)
│   └── predict.py            # LSTM crowd predictions (/api/predict)
└── services/                 # Core Business Logic & Intelligence Engines
    ├── allocation_service.py # Haversine proximity & fleet dispatch optimizer
    ├── model_service.py      # TensorFlow LSTM inference & 7-day sliding window
    └── report_service.py     # PDF generation engine (ReportLab)
```

---

## 🚀 Running the Backend Server

From the project root:
```bash
python main.py
```
Or directly using Uvicorn:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 📖 Key REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check |
| `GET` | `/api/stops` | Full list of 93 bus stops with GPS coordinates |
| `GET` | `/api/routes` | Active transit corridors & route metadata |
| `GET` | `/api/services-between` | Find services serving an origin/dest stop pair |
| `GET` | `/api/map/data` | Network GeoJSON coordinates & transit shapes |
| `POST` | `/api/predict/demand` | Single time-slot LSTM crowd forecast |
| `POST` | `/api/predict/all-slots` | Batch prediction for all 6 daily time-slots |
| `GET` | `/api/authority/overview` | Corridor crowd heatmaps & congestion alerts |
| `GET` | `/api/authority/recommendations`| Proximity-ranked idle buses for dispatch |
| `POST` | `/api/authority/allocate` | Dispatch extra bus & record audit log |
| `GET` | `/api/authority/export-pdf` | Download official daily operations PDF report |
| `POST` | `/api/auth/login` | Authority officer login |
| `POST` | `/api/feedback` | Commuter prediction accuracy rating |

---

## 🔒 Authentication & Default Credentials

* **Role:** Transport Authority Officer
* **Username:** `admin`
* **Password:** `admin123`
*(Stored as salted SHA-256 hash in `backend/db/users.db`)*
