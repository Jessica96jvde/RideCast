"""
RideCast - Passenger Crowd Prediction REST Router
=================================================
Provides API endpoints for computing machine learning ridership predictions
for commuter trips and journey segments.

Endpoints:
- POST /api/predict/demand    -> Predicts crowd density for a specific stop-to-stop trip & time slot.
- POST /api/predict/all-slots -> Predicts crowd density across all 6 time slots for the daily heatmap.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from typing import Optional, List, Dict, Any

from backend.services.model_service import (
    find_services, predict_demand, predict_all_slots_for_journey
)

router = APIRouter(prefix="/api/predict", tags=["predict"])


class PredictRequest(BaseModel):
    """Request payload for a single commuter trip prediction."""
    from_stop_id: str
    to_stop_id: str
    date: str
    time_slot: str
    service_id: Optional[str] = None


class BatchSlotsRequest(BaseModel):
    """Request payload for multi-slot journey heatmap prediction."""
    from_stop_id: str
    to_stop_id: str
    date: str
    service_id: Optional[str] = None


@router.post("/demand")
def predict_single_demand(req: PredictRequest):
    """
    Computes passenger crowd forecast for a specific journey segment and time slot.
    If `service_id` is omitted, automatically finds the best direct bus service connecting the stops.
    """
    service_id = req.service_id
    if not service_id:
        services = find_services(req.from_stop_id, req.to_stop_id)
        if not services:
            raise HTTPException(
                status_code=400,
                detail=f"No direct bus services found connecting {req.from_stop_id} to {req.to_stop_id}."
            )
        service_id = services[0]

    target_dt = pd.Timestamp(req.date)
    result = predict_demand(
        service_id=service_id,
        from_stop_id=req.from_stop_id,
        to_stop_id=req.to_stop_id,
        target_date=target_dt,
        time_slot=req.time_slot
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Attach list of all available alternative direct services for passenger choice
    result["available_services"] = find_services(req.from_stop_id, req.to_stop_id)
    return result


@router.post("/all-slots")
def predict_all_slots(req: BatchSlotsRequest):
    """
    Predicts demand across all 6 standardized daily time slots for a journey.
    Used by the frontend to render the visual 6-column Crowd Heatmap Grid.
    """
    services = find_services(req.from_stop_id, req.to_stop_id)
    if not services:
        raise HTTPException(
            status_code=400,
            detail=f"No direct bus services found connecting {req.from_stop_id} to {req.to_stop_id}."
        )

    service_id = req.service_id if req.service_id in services else services[0]
    target_dt = pd.Timestamp(req.date)

    slots_data = predict_all_slots_for_journey(
        service_id=service_id,
        from_stop_id=req.from_stop_id,
        to_stop_id=req.to_stop_id,
        target_date=target_dt
    )

    return {
        "service_id": service_id,
        "available_services": services,
        "date": req.date,
        "from_stop_id": req.from_stop_id,
        "to_stop_id": req.to_stop_id,
        "slots": slots_data
    }
