from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import ChatRequest, ChatResponse
from app.services.ai_client import chat_reply, AIClientError

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    db.add(models.ChatMessage(role="user", content=payload.message))
    db.commit()

    try:
        reply_text = await chat_reply(payload.message, ecg_context=payload.ecg_context)
    except AIClientError as e:
        reply_text = f"দুঃখিত, এই মুহূর্তে উত্তর দিতে সমস্যা হচ্ছে ({e})"

    db.add(models.ChatMessage(role="assistant", content=reply_text))
    db.commit()

    return ChatResponse(reply=reply_text)