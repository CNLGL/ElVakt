from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import session, models
from app.services import price_service
from app.core import utils
from app import schemas

models.Base.metadata.create_all(bind=session.engine)

app = FastAPI(title="ElVakt API", version="2.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "timestamp": datetime.now()
    }

@app.get("/prices/{postcode}", response_model=schemas.PriceResponse)
def get_daily_prices(postcode: str, db: Session = Depends(session.get_db)):
    # utils.get_region_by_postcode içinde:
    # 1. isdigit() kontrolü ile harf engelleniyor.
    # 2. len() != 5 kontrolü ile hane sayısı zorlanıyor.
    # 3. Posta kodundan SE bölgesi tespit ediliyor.
    
    target_region = utils.get_region_by_postcode(postcode, db)
    
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    prices = db.query(models.ElectricityPrice).filter(
        models.ElectricityPrice.region == target_region,
        models.ElectricityPrice.start_time >= today_start
    ).order_by(models.ElectricityPrice.start_time.asc()).all()
    
    if not prices:
        raise HTTPException(
            status_code=404, 
            detail="Bu bölge için güncel fiyat verisi bulunamadı."
        )
    
    return {
        "city": postcode, # Ekranda girilen posta kodu görünsün
        "region": target_region,
        "prices": prices
    }

@app.post("/admin/update-prices", tags=["Admin"])
def manual_update_prices(db: Session = Depends(session.get_db)):
    try:
        added_today = price_service.fetch_and_save_prices(db, target_date=datetime.now())
        added_tomorrow = price_service.fetch_and_save_prices(db, target_date=datetime.now() + timedelta(days=1))
        return {"status": "success", "added_total": added_today + added_tomorrow}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))