"""
RideCast - Transport Authority Operations REST Router
=====================================================
Provides API endpoints for the Transport Authority Portal:
- Network-wide executive overview and key performance indicators (KPIs).
- Route-level passenger demand forecasting and crowd congestion alerts.
- Smart nearest-bus recommendations based on Haversine distance.
- Bus dispatch allocation execution and audit logging in SQLite.
- Live fleet inventory status (Idle vs Allocated).
- PDF intelligence report generation and download.
"""

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
import pandas as pd
from typing import Optional, List, Dict, Any

from backend.services.model_service import (
    predict_all_routes_authority, predict_route_authority
)
from backend.services.allocation_service import (
    get_fleet_df, recommend_buses, execute_allocation
)
from backend.services.report_service import generate_authority_pdf
from backend.db.database import get_allocation_history, get_allocations_for_date

router = APIRouter(prefix="/api/authority", tags=["authority"])


class AllocationRequest(BaseModel):
    """Payload sent by the authority UI when dispatching a bus to a route."""
    date: str
    service_id: str
    bus_id: str
    reason: str
    allocated_by: Optional[str] = "Ravi"


@router.get("/overview")
def get_authority_overview(date: str = Query(...)):
    """
    Computes aggregated network KPIs across all routes for the executive dashboard:
    - Total forecasted vs scheduled baseline passengers.
    - Overall network crowd ratio (%).
    - Number of extra buses recommended to eliminate congestion.
    - Fleet inventory counts (total, idle, allocated).
    """
    target_dt = pd.Timestamp(date)
    routes_forecast = predict_all_routes_authority(target_dt)

    total_expected = sum(r["expected_passengers"] for r in routes_forecast.values())
    total_normal = sum(r["normal_passengers"] for r in routes_forecast.values())
    total_buses_needed = sum(r["buses_required"] for r in routes_forecast.values())
    crowd_ratio = round((total_expected / max(1, total_normal)) * 100, 1)

    fleet_df = get_fleet_df(date)
    idle_count = int((fleet_df["status"] == "Idle").sum())
    allocated_count = int((fleet_df["status"] == "Allocated").sum())
    total_fleet = len(fleet_df)

    return {
        "date": date,
        "total_expected_passengers": total_expected,
        "total_normal_capacity": total_normal,
        "total_buses_needed": total_buses_needed,
        "crowd_ratio_pct": crowd_ratio,
        "fleet_status": {
            "total": total_fleet,
            "idle": idle_count,
            "allocated": allocated_count
        },
        "routes": routes_forecast
    }


@router.get("/route/{service_id}")
def get_route_forecast(service_id: str, date: str = Query(...)):
    """Returns detailed demand breakdown and trip slot occupancies for a specific route."""
    target_dt = pd.Timestamp(date)
    forecast = predict_route_authority(service_id, target_dt)
    return forecast


@router.get("/recommendations")
def get_bus_recommendations(
    service_id: str = Query(...),
    date: str = Query(...),
    capacity: int = Query(50)
):
    """
    Ranks idle buses by Haversine distance to the starting point of `service_id`.
    Returns the closest candidate buses to assist the dispatcher.
    """
    recommendations = recommend_buses(service_id, date, capacity)
    return {
        "service_id": service_id,
        "date": date,
        "recommendations": recommendations
    }


@router.post("/allocate")
def allocate_bus(req: AllocationRequest):
    """
    Executes a bus dispatch, marking the bus as allocated for the date
    and persisting the audit record into the SQLite database.
    """
    success = execute_allocation(
        date_str=req.date,
        service_id=req.service_id,
        bus_id=req.bus_id,
        reason=req.reason,
        allocated_by=req.allocated_by or "Ravi"
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to allocate bus. Bus ID not found.")

    return {
        "success": True,
        "message": f"Bus {req.bus_id} dispatched to route {req.service_id} successfully.",
        "allocation": req.dict()
    }


@router.get("/allocations")
def get_allocations(date: Optional[str] = None):
    """Retrieves bus allocation history from SQLite, optionally filtered by date."""
    if date:
        df = get_allocations_for_date(date)
    else:
        df = get_allocation_history()
    return df.to_dict(orient="records")


@router.get("/fleet")
def get_fleet_status(date: str = Query(...)):
    """Returns live fleet inventory and status (Idle/Allocated) for the given date."""
    df = get_fleet_df(date)
    return df.to_dict(orient="records")


@router.get("/export-pdf")
def export_authority_pdf(date: str = Query(...), service_id: str = Query("All Routes")):
    """
    Generates and returns an executive PDF intelligence report for download.
    Sets the 'Content-Disposition' header to prompt browser file download.
    """
    target_dt = pd.Timestamp(date)
    forecast_data = predict_all_routes_authority(target_dt)
    alloc_df = get_allocation_history()
    fleet_df = get_fleet_df(date)

    pdf_bytes = generate_authority_pdf(
        forecast_data=forecast_data,
        alloc_df=alloc_df,
        fleet_df=fleet_df,
        target_date_str=date,
        selected_route=service_id
    )

    filename = f"RideCast_Intelligence_Report_{date}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
