from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database.session import Base

class ElectricityPrice(Base):
    __tablename__ = "electricity_prices"

    id = Column(Integer, primary_key=True, index=True)
    region = Column(String)    # SE1, SE2, SE3, SE4
    price = Column(Float)      # kWh başına fiyat
    start_time = Column(DateTime)
    end_time = Column(DateTime)

class CityRegionCache(Base):
    __tablename__ = "city_region_cache"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String, unique=True, index=True)
    region = Column(String)