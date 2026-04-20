from sqlalchemy.orm import Session
from app.database import models
from fastapi import HTTPException

def get_region_by_postcode(postcode_input: str, db: Session) -> str:
    # 1. Giriş Temizliği ve Format Kontrolü
    # Boşlukları sil (Örn: "432 44" -> "43244")
    clean_code = postcode_input.strip().replace(" ", "")

    # SADECE SAYI VE TAM 5 HANE KONTROLÜ
    if not clean_code.isdigit() or len(clean_code) != 5:
        raise HTTPException(
            status_code=400, 
            detail="Hatalı giriş! Lütfen sadece 5 haneli İsveç posta kodu giriniz (Örn: 43244)."
        )

    # 2. Cache (Veritabanı) Kontrolü
    # Daha önce bu kod aratıldıysa API'ye veya hesaplamaya gerek yok
    cached_item = db.query(models.CityRegionCache).filter(
        models.CityRegionCache.city_name == clean_code
    ).first()

    if cached_item:
        return cached_item.region

    # 3. Bölge Belirleme Mantığı (Resmi Posta Kodu Aralıkları)
    # İsveç'te posta kodunun ilk iki hanesi bölgeyi belirlemek için yeterlidir.
    prefix = int(clean_code[:2])
    
    # SE4 (En Güney): Skåne, Blekinge, Halland'ın güneyi
    se4_prefixes = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 37, 38, 39]

    if prefix >= 90:
        found_region = "SE1"
    elif prefix >= 80:
        found_region = "SE2"
    elif prefix in se4_prefixes:
        found_region = "SE4"
    else:
        # 10-19 (Stockholm) ve diğer orta kısımlar
        found_region = "SE3"

    # 4. Sonucu Veritabanına Kaydet (Cache)
    new_cache = models.CityRegionCache(city_name=clean_code, region=found_region)
    db.add(new_cache)
    db.commit()

    return found_region