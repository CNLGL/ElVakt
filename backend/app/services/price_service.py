import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import models

def fetch_and_save_prices(db: Session, target_date: datetime = None):
    if target_date is None:
        target_date = datetime.now()

    regions = ["SE1", "SE2", "SE3", "SE4"]
    year = target_date.year
    month = f"{target_date.month:02d}"
    day = f"{target_date.day:02d}"
    
    total_added = 0

    for region in regions:
        url = f"https://www.elprisetjustnu.se/api/v1/prices/{year}/{month}-{day}_{region}.json"
        
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                for item in data:
                    start_time = datetime.fromisoformat(item['time_start'])
                    
                    # Veritabanında bu saat ve bölge için kayıt var mı? (Duplicate Kontrolü)
                    exists = db.query(models.ElectricityPrice).filter(
                        models.ElectricityPrice.region == region,
                        models.ElectricityPrice.start_time == start_time
                    ).first()

                    if not exists:
                        new_price = models.ElectricityPrice(
                            region=region,
                            price=item['SEK_per_kWh'],
                            start_time=start_time,
                            end_time=datetime.fromisoformat(item['time_end'])
                        )
                        db.add(new_price)
                        total_added += 1
                db.commit()
        except Exception as e:
            print(f"Hata: {region} için veri çekilemedi: {e}")
            continue
            
    return total_added