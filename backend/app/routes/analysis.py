"""
routes/analysis.py
------------------------------------------------------------
সাম্প্রতিক N টা reading নেয় DB থেকে, signal_processing দিয়ে
BPM/rhythm বের করে, তারপর ai_client দিয়ে সেটার একটা human-readable
ব্যাখ্যা তৈরি করে।
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models
from app.schemas import AnalysisResponse
from app.services.signal_processing import analyze_ecg_signal
from app.services.ai_client import explain_signal_metrics, AIClientError

router = APIRouter()


@router.get("/analysis", response_model=AnalysisResponse)
async def get_analysis(
    window: int = Query(default=500, le=3000, description="সাম্প্রতিক কতগুলো স্যাম্পল বিশ্লেষণ করবে"),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Reading)
        .order_by(desc(models.Reading.id))
        .limit(window)
        .all()
    )
    rows = list(reversed(rows))  # পুরনো -> নতুন ক্রমে সাজানো, signal processing এর জন্য জরুরি

    values = [r.value for r in rows]
    timestamps = [r.esp_millis for r in rows]

    result = analyze_ecg_signal(values, timestamps)

    try:
        ai_summary = await explain_signal_metrics(
            bpm=result.bpm,
            rhythm_regularity=result.rhythm_regularity,
            sample_count=result.sample_count,
        )
    except AIClientError as e:
        # AI কল ব্যর্থ হলেও signal metrics গুলো তো ঠিকই আছে —
        # পুরো endpoint fail করানোর দরকার নেই, শুধু summary তে জানিয়ে দেওয়া
        ai_summary = f"(AI ব্যাখ্যা তৈরি করা যায়নি: {e})"

    rhythm_note = {
        "regular": "রিদম নিয়মিত মনে হচ্ছে।",
        "irregular": "রিদম অনিয়মিত মনে হচ্ছে।",
        "insufficient_data": "পর্যাপ্ত/স্পষ্ট সিগন্যাল পাওয়া যায়নি — ইলেক্ট্রোড সংযোগ চেক করো।",
    }.get(result.rhythm_regularity, result.rhythm_regularity)

    return AnalysisResponse(
        bpm=result.bpm,
        rhythm_note=rhythm_note,
        ai_summary=ai_summary,
        sample_count=result.sample_count,
    )
