from pydantic import BaseModel
from datetime import datetime
from typing import List

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