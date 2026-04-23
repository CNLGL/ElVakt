from datetime import datetime, timedelta
import math
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import schemas
from app.core import utils
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.database import models, session
from app.services import price_service

UTC_TZ = ZoneInfo("UTC")
SWEDEN_TZ = ZoneInfo("Europe/Stockholm")

models.Base.metadata.create_all(bind=session.engine)

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_postcode(postcode: str) -> str:
    clean_code = postcode.strip().replace(" ", "")
    if not clean_code.isdigit() or len(clean_code) != 5:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid 5-digit Swedish postcode.",
        )
    return clean_code


def sweden_now() -> datetime:
    return datetime.now(SWEDEN_TZ)


def sweden_day_start(value: datetime | None = None) -> datetime:
    current = value or sweden_now()
    if current.tzinfo is None:
        current = current.replace(tzinfo=SWEDEN_TZ)
    return current.astimezone(SWEDEN_TZ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def to_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=SWEDEN_TZ)
    return value.astimezone(UTC_TZ).replace(tzinfo=None)


def db_utc_to_sweden(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC_TZ)
    return value.astimezone(SWEDEN_TZ)


def serialize_price(price: models.ElectricityPrice) -> dict:
    return {
        "id": price.id,
        "region": price.region,
        "price": price.price,
        "start_time": db_utc_to_sweden(price.start_time),
        "end_time": db_utc_to_sweden(price.end_time),
    }


def get_prices_for_postcode(postcode: str, db: Session):
    target_region = utils.get_region_by_postcode(postcode, db)

    today_start_sweden = sweden_day_start()
    end_sweden = today_start_sweden + timedelta(days=2)

    today_start_utc = to_utc_naive(today_start_sweden)
    end_utc = to_utc_naive(end_sweden)

    prices = (
        db.query(models.ElectricityPrice)
        .filter(
            models.ElectricityPrice.region == target_region,
            models.ElectricityPrice.start_time >= today_start_utc,
            models.ElectricityPrice.start_time < end_utc,
        )
        .order_by(models.ElectricityPrice.start_time.asc())
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="Bu bolge icin guncel fiyat verisi bulunamadi.",
        )

    return {
        "city": postcode,
        "region": target_region,
        "prices": [serialize_price(price) for price in prices],
    }


def find_price_for_time(db: Session, postcode: str, measured_at: datetime) -> float | None:
    region = utils.get_region_by_postcode(postcode, db)
    measured_at_utc = to_utc_naive(measured_at)

    price = (
        db.query(models.ElectricityPrice)
        .filter(
            models.ElectricityPrice.region == region,
            models.ElectricityPrice.start_time <= measured_at_utc,
            models.ElectricityPrice.end_time > measured_at_utc,
        )
        .first()
    )

    return price.price if price else None


def get_device_or_404(db: Session, user_id: int, device_id: int):
    device = (
        db.query(models.Device)
        .filter(models.Device.user_id == user_id, models.Device.id == device_id)
        .first()
    )

    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    return device


@app.get("/health")
def health_check(db: Session = Depends(session.get_db)):
    cache_count = db.query(models.CityRegionCache).count()

    return {
        "status": "online",
        "cached_postcodes": cache_count,
        "timestamp": sweden_now(),
    }


@app.get("/ready")
def readiness_check(db: Session = Depends(session.get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/prices/{postcode}", response_model=schemas.PriceResponse)
def get_daily_prices(postcode: str, db: Session = Depends(session.get_db)):
    clean_code = clean_postcode(postcode)
    return get_prices_for_postcode(clean_code, db)


@app.post("/auth/register", response_model=schemas.UserResponse)
def register_user(payload: schemas.UserCreate, db: Session = Depends(session.get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    email = payload.email.lower().strip()
    clean_code = clean_postcode(payload.postcode)

    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    user = models.User(
        email=email,
        password_hash=hash_password(payload.password),
        postcode=clean_code,
        is_verified=False,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    default_location = models.SavedLocation(
        user_id=user.id,
        label="Home",
        postcode=clean_code,
        is_default=True,
    )

    db.add(default_location)
    db.commit()

    return user


@app.post("/auth/login", response_model=schemas.UserResponse)
def login_user(payload: schemas.UserLogin, db: Session = Depends(session.get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email.lower().strip())
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive.")

    return user


@app.get("/users/{user_id}/prices", response_model=schemas.PriceResponse)
def get_user_prices(user_id: int, db: Session = Depends(session.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return get_prices_for_postcode(user.postcode, db)


@app.get(
    "/users/{user_id}/locations",
    response_model=list[schemas.SavedLocationResponse],
)
def get_user_locations(user_id: int, db: Session = Depends(session.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return (
        db.query(models.SavedLocation)
        .filter(models.SavedLocation.user_id == user_id)
        .order_by(
            models.SavedLocation.is_default.desc(),
            models.SavedLocation.created_at.asc(),
        )
        .all()
    )


@app.post(
    "/users/{user_id}/locations",
    response_model=schemas.SavedLocationResponse,
)
def create_user_location(
    user_id: int,
    payload: schemas.SavedLocationCreate,
    db: Session = Depends(session.get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    clean_code = clean_postcode(payload.postcode)
    label = payload.label.strip() or "Location"

    if payload.is_default:
        db.query(models.SavedLocation).filter(
            models.SavedLocation.user_id == user_id
        ).update({"is_default": False})

    location = models.SavedLocation(
        user_id=user_id,
        label=label,
        postcode=clean_code,
        is_default=payload.is_default,
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location


@app.delete("/users/{user_id}/locations/{location_id}")
def delete_user_location(
    user_id: int,
    location_id: int,
    db: Session = Depends(session.get_db),
):
    location = (
        db.query(models.SavedLocation)
        .filter(
            models.SavedLocation.user_id == user_id,
            models.SavedLocation.id == location_id,
        )
        .first()
    )

    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")

    db.delete(location)
    db.commit()

    return {"status": "deleted"}


@app.get("/users/{user_id}/devices", response_model=list[schemas.DeviceResponse])
def get_user_devices(user_id: int, db: Session = Depends(session.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return (
        db.query(models.Device)
        .filter(models.Device.user_id == user_id)
        .order_by(models.Device.created_at.asc())
        .all()
    )


@app.post("/users/{user_id}/devices", response_model=schemas.DeviceResponse)
def create_user_device(
    user_id: int,
    payload: schemas.DeviceCreate,
    db: Session = Depends(session.get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    saved_location_id = payload.saved_location_id

    if saved_location_id is not None:
        location = (
            db.query(models.SavedLocation)
            .filter(
                models.SavedLocation.user_id == user_id,
                models.SavedLocation.id == saved_location_id,
            )
            .first()
        )

        if not location:
            raise HTTPException(status_code=404, detail="Saved location not found.")

    device = models.Device(
        user_id=user_id,
        saved_location_id=saved_location_id,
        name=payload.name.strip() or "Device",
        device_type=payload.device_type.strip() or "smart_plug",
        tuya_device_id=payload.tuya_device_id,
        is_tuya_connected=bool(payload.tuya_device_id),
    )

    db.add(device)
    db.commit()
    db.refresh(device)

    return device


@app.delete("/users/{user_id}/devices/{device_id}")
def delete_user_device(
    user_id: int,
    device_id: int,
    db: Session = Depends(session.get_db),
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.user_id == user_id,
            models.Device.id == device_id,
        )
        .first()
    )

    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    db.delete(device)
    db.commit()

    return {"status": "deleted"}


@app.post(
    "/users/{user_id}/devices/{device_id}/test-readings",
    response_model=schemas.DeviceReadingsResponse,
)
def create_test_device_readings(
    user_id: int,
    device_id: int,
    db: Session = Depends(session.get_db),
):
    device = get_device_or_404(db, user_id, device_id)
    user = db.query(models.User).filter(models.User.id == user_id).first()

    postcode = user.postcode

    if device.saved_location:
        postcode = device.saved_location.postcode

    day_start = sweden_day_start().replace(tzinfo=None)

    db.query(models.DeviceReading).filter(
        models.DeviceReading.device_id == device_id,
        models.DeviceReading.measured_at >= day_start,
    ).delete()

    for index in range(96):
        measured_at = day_start + timedelta(minutes=15 * index)
        hour = measured_at.hour
        base_power = 120 + 80 * math.sin(index / 6)

        if 6 <= hour <= 8:
            base_power += 550

        if 17 <= hour <= 21:
            base_power += 850

        power_watts = max(35, round(base_power, 2))
        energy_kwh = round((power_watts / 1000) * 0.25, 5)

        price = find_price_for_time(db, postcode, measured_at)
        cost = round(energy_kwh * price, 5) if price is not None else None

        db.add(
            models.DeviceReading(
                device_id=device_id,
                measured_at=measured_at,
                power_watts=power_watts,
                energy_kwh=energy_kwh,
                price_sek_per_kwh=price,
                cost_sek=cost,
                source="test",
            )
        )

    db.commit()

    return get_device_readings(user_id=user_id, device_id=device_id, period="day", db=db)


@app.get(
    "/users/{user_id}/devices/{device_id}/readings",
    response_model=schemas.DeviceReadingsResponse,
)
def get_device_readings(
    user_id: int,
    device_id: int,
    period: str = Query(default="day", pattern="^(day|month)$"),
    db: Session = Depends(session.get_db),
):
    get_device_or_404(db, user_id, device_id)

    now = sweden_now()

    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    start_naive = start.replace(tzinfo=None)

    readings = (
        db.query(models.DeviceReading)
        .filter(
            models.DeviceReading.device_id == device_id,
            models.DeviceReading.measured_at >= start_naive,
        )
        .order_by(models.DeviceReading.measured_at.asc())
        .all()
    )

    total_energy = sum(reading.energy_kwh for reading in readings)
    total_cost = sum(reading.cost_sek or 0 for reading in readings)
    average_power = (
        sum(reading.power_watts for reading in readings) / len(readings)
        if readings
        else 0
    )

    return {
        "readings": readings,
        "summary": {
            "total_energy_kwh": round(total_energy, 3),
            "total_cost_sek": round(total_cost, 2),
            "average_power_watts": round(average_power, 1),
            "readings_count": len(readings),
        },
    }


@app.post("/admin/update-prices", tags=["Admin"])
def manual_update_prices(db: Session = Depends(session.get_db)):
    try:
        added_today = price_service.fetch_and_save_prices(
            db,
            target_date=sweden_now(),
        )
        added_tomorrow = price_service.fetch_and_save_prices(
            db,
            target_date=sweden_now() + timedelta(days=1),
        )

        return {
            "status": "success",
            "added_total": added_today + added_tomorrow,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
