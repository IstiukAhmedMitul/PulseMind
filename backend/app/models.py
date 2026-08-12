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
    esp_millis = Column(Integer)
    value = Column(Integer)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)

    session = relationship("MeasurementSession", back_populates="readings")


class MeasurementSession(Base):
    """একটা measurement সেশন (device চালু থেকে বন্ধ পর্যন্ত)।"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=utc_now)
    ended_at = Column(DateTime, nullable=True)
    label = Column(String, nullable=True)

    readings = relationship("Reading", back_populates="session")


class ChatMessage(Base):
    """চ্যাটবট কথোপকথনের লগ।"""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=utc_now)
    role = Column(String)
    content = Column(Text)


class AnalysisRecord(Base):
    """
    প্রতিবার AI analysis চালানো হলে (Analyze বাটনে ক্লিক), তার ফলাফল
    এখানে সংরক্ষিত হয় — এটাই historical trend graph এর ডেটা সোর্স।
    """
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    bpm = Column(Float, nullable=True)
    sdnn_ms = Column(Float, nullable=True)
    rmssd_ms = Column(Float, nullable=True)
    rhythm_regularity = Column(String)
    sample_count = Column(Integer)


class SharedReport(Base):
    """
    পাবলিক শেয়ারযোগ্য ECG রিপোর্ট স্ন্যাপশট।
    """
    __tablename__ = "shared_reports"

    id = Column(String, primary_key=True, index=True)  # unique string code e.g. report_xyz
    created_at = Column(DateTime, default=utc_now)
    bpm = Column(Float, nullable=True)
    sdnn_ms = Column(Float, nullable=True)
    rmssd_ms = Column(Float, nullable=True)
    rhythm_note = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    sample_count = Column(Integer, default=500)