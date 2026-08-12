import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import ShareReportCreate, ShareReportOut

router = APIRouter()


@router.post("/reports/share", response_model=ShareReportOut)
def create_shared_report(payload: ShareReportCreate, db: Session = Depends(get_db)):
    report_id = f"report_{uuid.uuid4().hex[:10]}"
    report = models.SharedReport(
        id=report_id,
        bpm=payload.bpm,
        sdnn_ms=payload.sdnn_ms,
        rmssd_ms=payload.rmssd_ms,
        rhythm_note=payload.rhythm_note or "Rhythm Normal",
        ai_summary=payload.ai_summary or "Heart rate and rhythm monitored.",
        sample_count=payload.sample_count,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports/{report_id}", response_model=ShareReportOut)
def get_shared_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.SharedReport).filter(models.SharedReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
