"""
schemas.py
------------------------------------------------------------
Pydantic মডেল — request body validation ও response shape এর জন্য।
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
        from_attributes = True


# ---------- Pattern flags ----------

class FlagOut(BaseModel):
    code: str
    label: str
    description: str
    severity: str


# ---------- AI Analysis ----------

class AnalysisResponse(BaseModel):
    bpm: Optional[float] = None
    rhythm_note: str
    ai_summary: str
    sample_count: int
    sdnn_ms: Optional[float] = None
    rmssd_ms: Optional[float] = None
    flags: List[FlagOut] = []


class AnalysisHistoryPoint(BaseModel):
    id: int
    created_at: datetime
    bpm: Optional[float] = None
    sdnn_ms: Optional[float] = None
    rmssd_ms: Optional[float] = None
    rhythm_regularity: str

    class Config:
        from_attributes = True


# ---------- Chatbot ----------

class EcgContext(BaseModel):
    bpm: Optional[float] = None
    rhythm_note: Optional[str] = None
    sdnn_ms: Optional[float] = None
    rmssd_ms: Optional[float] = None


class ChatRequest(BaseModel):
    message: str
    ecg_context: Optional[EcgContext] = None


class ChatResponse(BaseModel):
    reply: str


# ---------- Shared Reports ----------

class ShareReportCreate(BaseModel):
    bpm: Optional[float] = None
    sdnn_ms: Optional[float] = None
    rmssd_ms: Optional[float] = None
    rhythm_note: Optional[str] = None
    ai_summary: Optional[str] = None
    sample_count: int = 500


class ShareReportOut(BaseModel):
    id: str
    created_at: datetime
    bpm: Optional[float] = None
    sdnn_ms: Optional[float] = None
    rmssd_ms: Optional[float] = None
    rhythm_note: Optional[str] = None
    ai_summary: Optional[str] = None
    sample_count: int = 500

    class Config:
        from_attributes = True