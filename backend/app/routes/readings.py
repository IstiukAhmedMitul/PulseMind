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
    rows = (
        db.query(models.Reading)
        .order_by(desc(models.Reading.id))
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


ws_router = APIRouter()


@ws_router.websocket("/ws/ecg")
async def websocket_ecg(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)