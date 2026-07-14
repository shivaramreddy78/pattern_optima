import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Authentication Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    mobile_number: Optional[str] = None
    profile_image: Optional[str] = None
    accent_color: Optional[str] = "blue"
    theme: Optional[str] = "dark"
    language: Optional[str] = "en"

    @field_validator('mobile_number')
    @classmethod
    def validate_mobile_number(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{10,15}$", clean):
            raise ValueError('Mobile number must be 10-15 digits long and can start with +')
        return clean

class UserCreate(UserBase):
    password: str

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long.')
        if not re.search(r"[A-Za-z]", v):
            raise ValueError('Password must contain at least one letter.')
        if not re.search(r"\d", v):
            raise ValueError('Password must contain at least one digit.')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    role: str = "Admin"
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long.')
        if not re.search(r"[A-Za-z]", v):
            raise ValueError('Password must contain at least one letter.')
        if not re.search(r"\d", v):
            raise ValueError('Password must contain at least one digit.')
        return v


# --- Nesting Engine Schemas ---
class ShapeInput(BaseModel):
    id: str
    points: List[List[float]] # polygon coordinates [[x1, y1], [x2, y2], ...]
    quantity: int = 1
    allow_rotation: bool = True

class NestingRequest(BaseModel):
    fabric_width: float
    fabric_height: float # Fixed sheet length or maximum length
    shapes: List[ShapeInput]
    algorithm: str = "Skyline"  # "Skyline", "Guillotine", "Shelf"
    margin: float = 0.0 # margin between shapes

class PlacedShape(BaseModel):
    id: str
    x: float
    y: float
    rotation: float # in degrees (e.g. 0 or 90)
    points: List[List[float]] # coordinates after placement

class NestingResponse(BaseModel):
    job_id: Optional[int] = None
    status: str
    fabric_width: float
    fabric_height: float
    utilization_percentage: float
    waste_percentage: float
    saved_area: float
    saved_money: float
    optimized_layout: List[PlacedShape]
    algorithm_used: str
    processing_time: float = 0.0

class NestingJobResponse(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    fabric_width: float
    fabric_height: Optional[float]
    original_shapes: List[Dict[str, Any]]
    optimized_layout: Optional[List[Dict[str, Any]]]
    status: str
    utilization_percentage: Optional[float]
    waste_percentage: Optional[float]
    saved_area: float
    saved_money: float
    algorithm_used: str
    processing_time: Optional[float] = 0.0
    created_at: datetime

    class Config:
        from_attributes = True

class NestingUploadRequest(BaseModel):
    upload_ids: List[str]
    fabric_width: float
    fabric_height: float
    algorithm: str = "Skyline"
    margin: float = 2.0
    quantities: Dict[str, int]

class DashboardStats(BaseModel):
    total_optimizations: int
    waste_saved_sqm: float
    fabric_saved_sqm: float
    money_saved_usd: float
    utilization_trend: List[Dict[str, Any]] # e.g. [{"date": "2026-07-01", "utilization": 92.5}, ...]
    algorithm_popularity: List[Dict[str, Any]] # e.g. [{"name": "Skyline", "count": 15}, ...]
    recent_jobs: List[NestingJobResponse]

class UploadResponse(BaseModel):
    id: str
    user_id: int
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    upload_date: datetime
    status: str
    metadata_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
