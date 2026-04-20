import os

class Settings:
    PROJECT_NAME: str = "ElVakt"
    DATABASE_URL: str = "sqlite:///./database.db"
    
    # Nord Pool API (Elpriset Just Nu) Ayarları
    BASE_API_URL: str = "https://www.elprisetjustnu.se/api/v1/prices"

settings = Settings()