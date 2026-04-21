import logging
from datetime import datetime

import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import models

logger = logging.getLogger(__name__)


def fetch_and_save_prices(db: Session, target_date: datetime | None = None):
    if target_date is None:
        target_date = datetime.now()

    regions = ["SE1", "SE2", "SE3", "SE4"]
    year = target_date.year
    month = f"{target_date.month:02d}"
    day = f"{target_date.day:02d}"

    total_added = 0

    for region in regions:
        url = f"{settings.BASE_API_URL}/{year}/{month}-{day}_{region}.json"

        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            logger.warning(
                "Price fetch failed for region %s on %s: %s",
                region,
                target_date.date(),
                exc,
            )
            continue

        for item in data:
            start_time = datetime.fromisoformat(item["time_start"])

            exists = (
                db.query(models.ElectricityPrice)
                .filter(
                    models.ElectricityPrice.region == region,
                    models.ElectricityPrice.start_time == start_time,
                )
                .first()
            )

            if exists:
                continue

            new_price = models.ElectricityPrice(
                region=region,
                price=item["SEK_per_kWh"],
                start_time=start_time,
                end_time=datetime.fromisoformat(item["time_end"]),
            )
            db.add(new_price)
            total_added += 1

        db.commit()

    return total_added
