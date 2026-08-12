"""
main.py
------------------------------------------------------------
FastAPI অ্যাপের এন্ট্রিপয়েন্ট।

চালানোর কমান্ড:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401 — এই ইম্পোর্টটা জরুরি, নাহলে Base টেবিল রেজিস্টার পায় না
from app.routes import ingest, readings, analysis, chat, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PulseMind ECG Backend", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(readings.router, prefix="/api", tags=["readings"])
app.include_router(readings.ws_router, tags=["websocket"])
app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(reports.router, prefix="/api", tags=["reports"])