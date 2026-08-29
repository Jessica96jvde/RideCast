from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.db.database import verify_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    token: str
    username: str
    role: str
    message: str


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if verify_user(req.username, req.password):
        # Return simple session token
        return LoginResponse(
            success=True,
            token=f"token-{req.username}-authorized",
            username=req.username,
            role="authority",
            message="Authentication successful"
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid officer credentials. Please check your username and password."
    )


@router.get("/verify")
def verify_token(token: str = ""):
    if token and "authorized" in token:
        return {"valid": True, "role": "authority"}
    return {"valid": False}
