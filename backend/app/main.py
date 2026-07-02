"""
main.py
------------------------------------------------------------
FastAPI অ্যাপের এন্ট্রিপয়েন্ট।

এখন এই ধাপে শুধু:
  - অ্যাপ ইনিশিয়ালাইজেশন
  - CORS (Next.js frontend থেকে রিকোয়েস্ট আসতে দেওয়ার জন্য)
  - DB টেবিল অটো-ক্রিয়েট
  - একটা /health চেক endpoint

পরের ধাপে এখানে routers যোগ হবে (ingest, readings/websocket,
analysis, chat) — তখন এই ফাইলে include_router() কল যোগ হবে।

চালানোর কমান্ড:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401 — এই ইম্পোর্টটা জরুরি, নাহলে Base টেবিল রেজিস্টার পায় না
from app.routes import ingest, readings, analysis, chat

# টেবিল না থাকলে তৈরি করে দেয় (models.py তে যা যা ডিফাইন করা আছে)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ECG Monitor Backend", version="0.1.0")

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
app.include_router(readings.ws_router, tags=["websocket"])  # /ws/ecg — prefix ছাড়া
app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
