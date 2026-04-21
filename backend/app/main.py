from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import schemas
from app.core import utils
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.database import models, session
from app.services import price_service

models.Base.metadata.create_all(bind=session.engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check(db: Session = Depends(session.get_db)):
    cache_count = db.query(models.CityRegionCache).count()
    return {
        "status": "online",
        "cached_postcodes": cache_count,
        "timestamp": datetime.now(),
    }


@app.get("/ready")
def readiness_check(db: Session = Depends(session.get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/prices/{postcode}", response_model=schemas.PriceResponse)
def get_daily_prices(postcode: str, db: Session = Depends(session.get_db)):
    target_region = utils.get_region_by_postcode(postcode, db)

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    prices = (
        db.query(models.ElectricityPrice)
        .filter(
            models.ElectricityPrice.region == target_region,
            models.ElectricityPrice.start_time >= today_start,
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
        "prices": prices,
    }


@app.post("/auth/register", response_model=schemas.UserResponse)
def register_user(payload: schemas.UserCreate, db: Session = Depends(session.get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == payload.email.lower().strip())
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered.")

    clean_postcode = payload.postcode.strip().replace(" ", "")
    if not clean_postcode.isdigit() or len(clean_postcode) != 5:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid 5-digit Swedish postcode.",
        )

    user = models.User(
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        postcode=clean_postcode,
        is_verified=False,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

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

    target_region = utils.get_region_by_postcode(user.postcode, db)

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    prices = (
        db.query(models.ElectricityPrice)
        .filter(
            models.ElectricityPrice.region == target_region,
            models.ElectricityPrice.start_time >= today_start,
        )
        .order_by(models.ElectricityPrice.start_time.asc())
        .all()
    )

    if not prices:
        raise HTTPException(
            status_code=404,
            detail="No current price data found for this user.",
        )

    return {
        "city": user.postcode,
        "region": target_region,
        "prices": prices,
    }


@app.post("/admin/update-prices", tags=["Admin"])
def manual_update_prices(db: Session = Depends(session.get_db)):
    try:
        added_today = price_service.fetch_and_save_prices(
            db, target_date=datetime.now()
        )
        added_tomorrow = price_service.fetch_and_save_prices(
            db, target_date=datetime.now() + timedelta(days=1)
        )

        return {
            "status": "success",
            "added_total": added_today + added_tomorrow,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
