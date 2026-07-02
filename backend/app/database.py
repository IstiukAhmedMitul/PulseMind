"""
database.py
------------------------------------------------------------
SQLAlchemy engine, session factory, এবং Base ক্লাস — সব মডেল
এখান থেকে Base ইনহেরিট করবে।
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# SQLite এর জন্য check_same_thread=False দরকার, কারণ FastAPI
# একাধিক থ্রেড থেকে একই কানেকশন ব্যবহার করতে পারে (dev সার্ভারে)
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — প্রতিটা রিকোয়েস্টে একটা DB session দেয়, শেষে বন্ধ করে দেয়।"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
