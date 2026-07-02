"""
routes/chat.py
------------------------------------------------------------
বেসিক মেডিকেল Q&A চ্যাটবট endpoint। প্রতিটা বার্তা (user + assistant)
DB তে লগ হয় (chat_history টেবিল), যদিও এই ভার্সনে conversation context
আগের মেসেজ থেকে টেনে আনা হচ্ছে না (প্রতিটা রিকোয়েস্ট independent) —
সেটা চাইলে পরে extend করা যাবে।
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import ChatRequest, ChatResponse
from app.services.ai_client import chat_reply, AIClientError

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    # ইউজারের মেসেজ লগ করা
    db.add(models.ChatMessage(role="user", content=payload.message))
    db.commit()

    try:
        reply_text = await chat_reply(payload.message)
    except AIClientError as e:
        reply_text = f"দুঃখিত, এই মুহূর্তে উত্তর দিতে সমস্যা হচ্ছে ({e})"

    # অ্যাসিস্ট্যান্টের রিপ্লাই লগ করা
    db.add(models.ChatMessage(role="assistant", content=reply_text))
    db.commit()

    return ChatResponse(reply=reply_text)
