"""
routes/readings.py
------------------------------------------------------------
দুইটা জিনিস দেয়:
  1. GET /api/readings/latest  -> সাম্প্রতিক N টা reading (initial load/backup polling)
  2. WS   /ws/ecg               -> real-time push, নতুন ডেটা ইনজেস্ট হলেই broadcast হয়
"""

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from app.database import get_db
from app import models
from app.schemas import ReadingOut
from app.ws_manager import manager

router = APIRouter()


@router.get("/readings/latest", response_model=List[ReadingOut])
def get_latest_readings(
    limit: int = Query(default=200, le=2000),
    db: Session = Depends(get_db),
):
    """সবচেয়ে সাম্প্রতিক `limit` সংখ্যক reading, পুরনো থেকে নতুন ক্রমে
    (frontend এ সরাসরি প্লট করার জন্য সুবিধাজনক)।"""
    rows = (
        db.query(models.Reading)
        .order_by(desc(models.Reading.id))
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


# WebSocket route আলাদা রাখা হয়েছে (prefix ছাড়া), কারণ ws ক্লায়েন্ট সাধারণত
# /ws/... path এক্সপেক্ট করে, /api/ws/... না। main.py তে এটা prefix ছাড়াই
# include হবে।
ws_router = APIRouter()


@ws_router.websocket("/ws/ecg")
async def websocket_ecg(websocket: WebSocket):
    """
    Frontend এই এন্ডপয়েন্টে কানেক্ট করবে। ingest.py নতুন ব্যাচ পেলে
    এই ম্যানেজারের মাধ্যমে সব কানেক্টেড ক্লায়েন্টকে push করবে।
    """
    await manager.connect(websocket)
    try:
        while True:
            # ক্লায়েন্ট থেকে কিছু আসার দরকার নেই, শুধু কানেকশন খোলা রাখতে
            # ping/keepalive হিসেবে receive_text ব্যবহার করা হচ্ছে
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)