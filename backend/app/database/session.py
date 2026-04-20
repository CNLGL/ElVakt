from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Veritabanı motorunu oluştur (SQLite kullanıyoruz)
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

# Veritabanı ile konuşacak olan oturum (Session) fabrikası
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Modellerimizin (tabloların) türetileceği ana sınıf
Base = declarative_base()

# Her istekte (request) veritabanı bağlantısını açıp iş bitince kapatan yardımcı fonksiyon
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()