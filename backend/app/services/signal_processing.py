"""
services/signal_processing.py
------------------------------------------------------------
raw ADC ECG ভ্যালু থেকে R-peak detect করে BPM (heart rate) আর
rhythm regularity বের করে। এটা কোনো LLM ব্যবহার করে না —
pure signal processing (scipy), কারণ সংখ্যাগত হিসাব
LLM এর চেয়ে deterministic algorithm দিয়ে করাই নির্ভরযোগ্য।

এই মডিউলের আউটপুট (BPM, RR-interval ইত্যাদি) পরে AI কে
পাঠানো হবে যাতে সে সংখ্যা ব্যাখ্যা করে, নিজে সংখ্যা বের না করে।
"""

from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from scipy.signal import find_peaks


@dataclass
class SignalAnalysisResult:
    bpm: Optional[float]
    peak_count: int
    rr_intervals_ms: List[float]
    rhythm_regularity: str   # "regular" | "irregular" | "insufficient_data"
    sample_count: int


def analyze_ecg_signal(
    values: List[int],
    timestamps_ms: List[int],
) -> SignalAnalysisResult:
    """
    values: raw ADC readings (0-1023) ক্রমানুসারে (পুরনো -> নতুন)
    timestamps_ms: প্রতিটা reading এর esp_millis টাইমস্ট্যাম্প

    রিটার্ন করে SignalAnalysisResult, যেখানে BPM, rhythm ইত্যাদি থাকে।
    """
    n = len(values)

    if n < 30:
        # যথেষ্ট ডেটা নেই অর্থপূর্ণ analysis করার জন্য
        return SignalAnalysisResult(
            bpm=None,
            peak_count=0,
            rr_intervals_ms=[],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    signal = np.array(values, dtype=float)
    ts = np.array(timestamps_ms, dtype=float)

    # baseline wander সরানোর জন্য simple normalization (moving average subtract)
    window = max(5, n // 20)
    baseline = np.convolve(signal, np.ones(window) / window, mode="same")
    detrended = signal - baseline

    # ডাইনামিক threshold: signal এর std এর উপর ভিত্তি করে (fixed threshold
    # কাজ করবে না কারণ ADC ভ্যালুর রেঞ্জ ডিভাইস/gain ভেদে পাল্টায়)
    threshold = detrended.std() * 1.2

    # গড় sample interval থেকে minimum peak distance অনুমান —
    # মানুষের heart rate বড়জোর ~220 bpm (~270ms per beat), তাই তার চেয়ে
    # কাছাকাছি দুইটা peak কে একই beat ধরা হচ্ছে
    avg_interval_ms = np.mean(np.diff(ts)) if n > 1 else 8.0
    if avg_interval_ms <= 0:
        avg_interval_ms = 8.0
    min_distance_samples = max(1, int(270 / avg_interval_ms))

    peaks, _ = find_peaks(detrended, height=threshold, distance=min_distance_samples)

    if len(peaks) < 2:
        return SignalAnalysisResult(
            bpm=None,
            peak_count=len(peaks),
            rr_intervals_ms=[],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    peak_times = ts[peaks]
    rr_intervals = np.diff(peak_times)  # ms এককে, পরপর দুই beat এর মধ্যবর্তী সময়

    # প্রথমে fizyoloজিক্যালি অসম্ভব রেঞ্জ বাদ দেওয়া (২৫-২৪০ bpm এর বাইরে)
    physio_valid = rr_intervals[(rr_intervals > 250) & (rr_intervals < 2400)]

    if len(physio_valid) == 0:
        return SignalAnalysisResult(
            bpm=None,
            peak_count=len(peaks),
            rr_intervals_ms=[],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    # তারপর median-based outlier rejection — window boundary তে প্রায়ই
    # একটা আংশিক/false peak ধরা পড়ে যেটা RR interval কে অস্বাভাবিক
    # ছোট/বড় করে দেয়। এই ধরনের বিচ্ছিন্ন outlier বাদ দিলে BPM/rhythm
    # হিসাব অনেক বেশি স্থিতিশীল হয়।
    median_rr = float(np.median(physio_valid))
    valid_rr = physio_valid[np.abs(physio_valid - median_rr) < median_rr * 0.4]

    if len(valid_rr) == 0:
        valid_rr = physio_valid  # সব বাদ পড়ে গেলে fallback হিসেবে physio_valid রাখা
        return SignalAnalysisResult(
            bpm=None,
            peak_count=len(peaks),
            rr_intervals_ms=[],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    mean_rr_ms = float(np.mean(valid_rr))
    bpm = 60000.0 / mean_rr_ms

    # rhythm regularity: RR interval এর coefficient of variation দিয়ে যাচাই
    cv = float(np.std(valid_rr) / mean_rr_ms) if mean_rr_ms > 0 else 1.0
    regularity = "regular" if cv < 0.15 else "irregular"

    return SignalAnalysisResult(
        bpm=round(bpm, 1),
        peak_count=len(peaks),
        rr_intervals_ms=[round(x, 1) for x in valid_rr.tolist()],
        rhythm_regularity=regularity,
        sample_count=n,
    )
