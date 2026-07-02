"""
schemas.py
------------------------------------------------------------
Pydantic মডেল — request body validation ও response shape এর জন্য।
এগুলো ORM মডেল (models.py) থেকে আলাদা রাখা হয়েছে ইচ্ছাকৃতভাবে,
যাতে API contract আর DB schema independently বদলানো যায়।
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------- Ingest (ESP8266 -> backend) ----------

class ReadingIn(BaseModel):
    value: int
    millis: int


class IngestPayload(BaseModel):
    readings: List[ReadingIn]


class IngestResponse(BaseModel):
    status: str
    count: int


# ---------- Readings output (backend -> frontend) ----------

class ReadingOut(BaseModel):
    id: int
    received_at: datetime
    esp_millis: int
    value: int

    class Config:
        from_attributes = True  # SQLAlchemy অবজেক্ট থেকে সরাসরি কনভার্ট করার জন্য


# ---------- AI Analysis ----------

class AnalysisResponse(BaseModel):
    bpm: Optional[float] = None
    rhythm_note: str
    ai_summary: str
    sample_count: int


# ---------- Chatbot ----------

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
