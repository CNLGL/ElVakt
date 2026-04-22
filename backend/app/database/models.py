from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.session import Base


class ElectricityPrice(Base):
    __tablename__ = "electricity_prices"

    id = Column(Integer, primary_key=True, index=True)
    region = Column(String, index=True)
    price = Column(Float)
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

    saved_locations = relationship(
        "SavedLocation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    alerts = relationship(
        "Alert",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    devices = relationship(
        "Device",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    postcode = Column(String, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="saved_locations")
    devices = relationship("Device", back_populates="saved_location")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    saved_location_id = Column(
        Integer,
        ForeignKey("saved_locations.id"),
        nullable=True,
        index=True,
    )

    name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)
    tuya_device_id = Column(String, nullable=True, index=True)
    is_tuya_connected = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="devices")
    saved_location = relationship("SavedLocation", back_populates="devices")
    readings = relationship(
        "DeviceReading",
        back_populates="device",
        cascade="all, delete-orphan",
    )


class DeviceReading(Base):
    __tablename__ = "device_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)

    measured_at = Column(DateTime, nullable=False, index=True)
    power_watts = Column(Float, nullable=False)
    energy_kwh = Column(Float, nullable=False)

    price_sek_per_kwh = Column(Float, nullable=True)
    cost_sek = Column(Float, nullable=True)

    source = Column(String, default="test", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    device = relationship("Device", back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    postcode = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    direction = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="alerts")
