from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from backend.db.database import save_feedback, get_all_feedback

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    useful: bool
    from_stop: Optional[str] = ""
    to_stop: Optional[str] = ""
    time_slot: Optional[str] = ""


@router.post("")
def submit_feedback(req: FeedbackRequest):
    save_feedback(
        useful=req.useful,
        from_stop=req.from_stop or "",
        to_stop=req.to_stop or "",
        time_slot=req.time_slot or ""
    )
    return {
        "success": True,
        "message": "Thank you! Your feedback helps optimize our transit forecasting model."
    }


@router.get("")
def list_feedback():
    return get_all_feedback()
