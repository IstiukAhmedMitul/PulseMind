"""
models.py
------------------------------------------------------------
ডাটাবেস টেবিলের সংজ্ঞা (SQLAlchemy ORM মডেল)।
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Reading(Base):
    """প্রতিটা একক ECG স্যাম্পল ভ্যালু।"""
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    received_at = Column(DateTime, default=utc_now, index=True)
    esp_millis = Column(Integer)         # ESP8266 এর millis() টাইমস্ট্যাম্প (device-local)
    value = Column(Integer)              # raw ADC ভ্যালু (0-1023)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)

    session = relationship("MeasurementSession", back_populates="readings")


class MeasurementSession(Base):
    """একটা measurement সেশন (device চালু থেকে বন্ধ পর্যন্ত, বা ম্যানুয়াল সেশন)।"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=utc_now)
    ended_at = Column(DateTime, nullable=True)
    label = Column(String, nullable=True)   # যেমন "Test 1", "Patient A" ইত্যাদি

    readings = relationship("Reading", back_populates="session")


class ChatMessage(Base):
    """চ্যাটবট কথোপকথনের লগ (ঐচ্ছিক, পরে ব্যবহার হবে)।"""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=utc_now)
    role = Column(String)         # "user" বা "assistant"
    content = Column(Text)
