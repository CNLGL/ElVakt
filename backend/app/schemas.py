from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr


class PriceEntry(BaseModel):
    id: int
    region: str
    price: float
    start_time: datetime
    end_time: datetime

    class Config:
        from_attributes = True


class PriceResponse(BaseModel):
    city: str
    region: str
    prices: List[PriceEntry]


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    postcode: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    postcode: str
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    postcode: str
    target_price: float
    direction: str


class AlertResponse(BaseModel):
    id: int
    postcode: str
    target_price: float
    direction: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
