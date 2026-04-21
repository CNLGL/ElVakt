from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.session import Base


class ElectricityPrice(Base):
    __tablename__ = "electricity_prices"

    id = Column(Integer, primary_key=True, index=True)
    region = Column(String, index=True)  # SE1, SE2, SE3, SE4
    price = Column(Float)  # kWh basina fiyat
    start_time = Column(DateTime, index=True)
    end_time = Column(DateTime)


class CityRegionCache(Base):
    __tablename__ = "city_region_cache"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String, unique=True, index=True)
    region = Column(String)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    postcode = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    postcode = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    direction = Column(String, nullable=False)  # below | above
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="alerts")
