"""
RideCast - Commuter Feedback REST Router
========================================
Collects accuracy votes and helpfulness feedback from passengers to evaluate
model performance in real-world transit conditions.

Endpoints:
- POST /api/feedback -> Submits passenger feedback (useful: yes/no, stops, time slot).
- GET  /api/feedback -> Lists all stored feedback entries.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from backend.db.database import save_feedback, get_all_feedback

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    """Payload sent by the passenger feedback rating widget."""
    useful: bool
    from_stop: Optional[str] = ""
    to_stop: Optional[str] = ""
    time_slot: Optional[str] = ""


@router.post("")
def submit_feedback(req: FeedbackRequest):
    """Saves passenger feedback to SQLite database."""
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
    """Retrieves all feedback entries for system auditing."""
    return get_all_feedback()
