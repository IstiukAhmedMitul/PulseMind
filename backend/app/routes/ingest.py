"""
routes/ingest.py
------------------------------------------------------------
ESP8266 এখানে POST করে ব্যাচ readings পাঠায়।
প্রতিটা reading SQLite এ সেভ হয়, এবং WebSocket দিয়ে
frontend এ লাইভ push করা হয়।
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import IngestPayload, IngestResponse
from app.ws_manager import manager

router = APIRouter()


@router.post("/data", response_model=IngestResponse)
async def receive_data(payload: IngestPayload, db: Session = Depends(get_db)):
    readings = payload.readings

    db_objects = [
        models.Reading(esp_millis=r.millis, value=r.value)
        for r in readings
    ]
    db.add_all(db_objects)
    db.commit()

    # DB commit এর পর id/received_at auto-generate হয়ে যায়, তাই refresh
    # করে সেই ভ্যালুগুলো নিয়ে broadcast payload বানানো হচ্ছে
    for obj in db_objects:
        db.refresh(obj)

    await manager.broadcast({
        "type": "new_readings",
        "readings": [
            {
                "id": obj.id,
                "value": obj.value,
                "esp_millis": obj.esp_millis,
                "received_at": obj.received_at.isoformat(),
            }
            for obj in db_objects
        ],
    })

    return IngestResponse(status="ok", count=len(readings))