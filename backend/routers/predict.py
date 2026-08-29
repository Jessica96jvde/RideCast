from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from typing import Optional, List, Dict, Any

from backend.services.model_service import (
    find_services, predict_demand, predict_all_slots_for_journey
)

router = APIRouter(prefix="/api/predict", tags=["predict"])


class PredictRequest(BaseModel):
    from_stop_id: str
    to_stop_id: str
    date: str
    time_slot: str
    service_id: Optional[str] = None


class BatchSlotsRequest(BaseModel):
    from_stop_id: str
    to_stop_id: str
    date: str
    service_id: Optional[str] = None


@router.post("/demand")
def predict_single_demand(req: PredictRequest):
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

    result["available_services"] = find_services(req.from_stop_id, req.to_stop_id)
    return result


@router.post("/all-slots")
def predict_all_slots(req: BatchSlotsRequest):
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
