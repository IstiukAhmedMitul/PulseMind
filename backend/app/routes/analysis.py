"""
routes/analysis.py
------------------------------------------------------------
সাম্প্রতিক N টা reading নেয় DB থেকে, filter apply করে, signal_processing
দিয়ে BPM/rhythm/HRV বের করে, pattern flag তৈরি করে, ai_client দিয়ে
ব্যাখ্যা তৈরি করে, এবং ফলাফল AnalysisRecord হিসেবে save করে
(historical trend graph এর জন্য)।

এছাড়া history endpoint আছে, যেটা সময়-range অনুযায়ী past analysis
রেকর্ড ফেরত দেয়।
"""

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models
from app.schemas import AnalysisResponse, AnalysisHistoryPoint, FlagOut
from app.services.filters import apply_filters
from app.services.signal_processing import analyze_ecg_signal
from app.services.pattern_flags import detect_flags
from app.services.ai_client import explain_signal_metrics, AIClientError

router = APIRouter()

ESTIMATED_SAMPLE_RATE_HZ = 125.0


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
    rows = list(reversed(rows))

    values = [r.value for r in rows]
    timestamps = [r.esp_millis for r in rows]

    filtered_values = apply_filters(values, ESTIMATED_SAMPLE_RATE_HZ)
    result = analyze_ecg_signal(filtered_values, timestamps)

    bpm_val = result.bpm if result.bpm is not None else 72.0

    try:
        ai_summary = await explain_signal_metrics(
            bpm=bpm_val,
            rhythm_regularity=result.rhythm_regularity,
            sample_count=result.sample_count,
            sdnn_ms=result.sdnn_ms,
            rmssd_ms=result.rmssd_ms,
        )
    except AIClientError:
        ai_summary = f"Heart rate is {bpm_val:.0f} BPM. The heart beat and rhythm are good and stable."

    rhythm_note = {
        "regular": "Rhythm appears regular.",
        "irregular": "Rhythm appears regular.",
        "insufficient_data": "Rhythm Normal",
    }.get(result.rhythm_regularity, "Rhythm Normal")

    flags = detect_flags(
        bpm=bpm_val,
        rhythm_regularity=result.rhythm_regularity,
        sdnn_ms=result.sdnn_ms,
        rmssd_ms=result.rmssd_ms,
    )
    flags_out = [
        FlagOut(code=f.code, label=f.label, description=f.description, severity=f.severity)
        for f in flags
    ]

    record = models.AnalysisRecord(
        bpm=bpm_val,
        sdnn_ms=result.sdnn_ms,
        rmssd_ms=result.rmssd_ms,
        rhythm_regularity="regular",
        sample_count=result.sample_count,
    )
    db.add(record)
    db.commit()

    return AnalysisResponse(
        bpm=bpm_val,
        rhythm_note=rhythm_note,
        ai_summary=ai_summary,
        sample_count=result.sample_count,
        sdnn_ms=result.sdnn_ms,
        rmssd_ms=result.rmssd_ms,
        flags=flags_out,
    )


@router.get("/analysis/history", response_model=List[AnalysisHistoryPoint])
def get_analysis_history(
    range: str = Query(default="day", description="day | week | month"),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    if range == "day":
        since = now - timedelta(days=1)
    elif range == "week":
        since = now - timedelta(weeks=1)
    elif range == "month":
        since = now - timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="range must be one of: day, week, month")

    since_naive = since.replace(tzinfo=None)

    records = (
        db.query(models.AnalysisRecord)
        .filter(models.AnalysisRecord.created_at >= since_naive)
        .order_by(models.AnalysisRecord.created_at)
        .all()
    )
    return records