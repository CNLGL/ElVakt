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


class SavedLocationCreate(BaseModel):
    label: str
    postcode: str
    is_default: bool = False


class SavedLocationResponse(BaseModel):
    id: int
    label: str
    postcode: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceCreate(BaseModel):
    name: str
    device_type: str
    saved_location_id: int | None = None
    tuya_device_id: str | None = None


class DeviceResponse(BaseModel):
    id: int
    user_id: int
    saved_location_id: int | None
    name: str
    device_type: str
    tuya_device_id: str | None
    is_tuya_connected: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceReadingCreate(BaseModel):
    measured_at: datetime
    power_watts: float
    energy_kwh: float


class DeviceReadingResponse(BaseModel):
    id: int
    device_id: int
    measured_at: datetime
    power_watts: float
    energy_kwh: float
    price_sek_per_kwh: float | None
    cost_sek: float | None
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceSummaryResponse(BaseModel):
    total_energy_kwh: float
    total_cost_sek: float
    average_power_watts: float
    readings_count: int


class DeviceReadingsResponse(BaseModel):
    readings: list[DeviceReadingResponse]
    summary: DeviceSummaryResponse


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
