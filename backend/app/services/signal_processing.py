"""
services/signal_processing.py
------------------------------------------------------------
raw ADC ECG ভ্যালু থেকে R-peak detect করে BPM (heart rate), rhythm
regularity, এবং HRV (Heart Rate Variability) বের করে। এটা কোনো
LLM ব্যবহার করে না — pure signal processing (scipy)।

এই মডিউলের আউটপুট (BPM, RR-interval, HRV ইত্যাদি) পরে AI কে
পাঠানো হয় যাতে সে সংখ্যা ব্যাখ্যা করে, নিজে সংখ্যা বের না করে।
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
from scipy.signal import find_peaks


@dataclass
class SignalAnalysisResult:
    bpm: Optional[float]
    peak_count: int
    rr_intervals_ms: List[float]
    rhythm_regularity: str   # "regular" | "irregular" | "insufficient_data"
    sample_count: int
    sdnn_ms: Optional[float] = None    # HRV: overall variability
    rmssd_ms: Optional[float] = None   # HRV: beat-to-beat variability


def calculate_hrv(rr_intervals_ms: List[float]) -> Tuple[Optional[float], Optional[float]]:
    """
    RR interval থেকে দুইটা standard HRV metric বের করে:
      - SDNN: সব RR interval এর standard deviation (overall variability)
      - RMSSD: পরপর RR interval এর পার্থক্যের root-mean-square
               (short-term/beat-to-beat variability)

    কমপক্ষে ৩টা RR interval না থাকলে reliable HRV বের করা যায় না,
    তখন (None, None) রিটার্ন হয় — বানানো সংখ্যা দেখানো হয় না।
    """
    rr = np.array(rr_intervals_ms, dtype=float)

    if len(rr) < 3:
        return None, None

    sdnn = float(np.std(rr, ddof=1))
    diffs = np.diff(rr)
    rmssd = float(np.sqrt(np.mean(diffs ** 2)))

    return round(sdnn, 1), round(rmssd, 1)


def analyze_ecg_signal(
    values: List[int],
    timestamps_ms: List[int],
) -> SignalAnalysisResult:
    """
    values: raw (বা filtered) ADC readings ক্রমানুসারে (পুরনো -> নতুন)
    timestamps_ms: প্রতিটা reading এর esp_millis টাইমস্ট্যাম্প

    রিটার্ন করে SignalAnalysisResult, যেখানে BPM, rhythm, HRV ইত্যাদি থাকে।
    """
    n = len(values)

    if n < 30:
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

    # ডাইনামিক threshold: signal এর std এর উপর ভিত্তি করে
    threshold = detrended.std() * 1.2

    # Peak-to-peak minimum distance: 350ms ব্যবহার করা হচ্ছে (আগে ছিল 270ms)।
    # Filter apply করার পর signal এ QRS spike-এর পাশাপাশি T-wave-ও স্পষ্ট
    # দেখা যায়, আর 270ms distance-এ সেটাও আলাদা peak হিসেবে ধরা পড়ে BPM
    # প্রায় দ্বিগুণ দেখাচ্ছিল (স্বাভাবিক QT interval 350-450ms হয়)।
    # এছাড়া prominence যোগ করা হয়েছে, যাতে T-wave-এর মতো ছোট bump বাদ
    # পড়ে, শুধু প্রকৃত QRS spike ধরা পড়ে।
    min_distance_ms = 350
    avg_interval_ms = np.mean(np.diff(ts)) if n > 1 else 8.0
    if avg_interval_ms <= 0:
        avg_interval_ms = 8.0
    min_distance_samples = max(1, int(min_distance_ms / avg_interval_ms))
    prominence_threshold = detrended.std() * 1.5

    peaks, _ = find_peaks(
        detrended,
        height=threshold,
        distance=min_distance_samples,
        prominence=prominence_threshold,
    )

    if len(peaks) < 2:
        return SignalAnalysisResult(
            bpm=None,
            peak_count=len(peaks),
            rr_intervals_ms=[],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    peak_times = ts[peaks]
    rr_intervals = np.diff(peak_times)  # ms এককে

    # ফিজিওলজিক্যালি অসম্ভব রেঞ্জ বাদ দেওয়া (২৫-২৪০ bpm এর বাইরে)
    physio_valid = rr_intervals[(rr_intervals > 250) & (rr_intervals < 2400)]

    if len(physio_valid) == 0:
        return SignalAnalysisResult(
            bpm=None,
            peak_count=len(peaks),
            rr_intervals_ms=[],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    # Median-based outlier rejection — window boundary তে প্রায়ই
    # একটা আংশিক/false peak ধরা পড়ে, সেটা বাদ দেওয়া হচ্ছে
    median_rr = float(np.median(physio_valid))
    valid_rr = physio_valid[np.abs(physio_valid - median_rr) < median_rr * 0.4]

    if len(valid_rr) == 0:
        valid_rr = physio_valid

    # খুব কম সংখ্যক valid beat থাকলে rhythm নিয়ে সিদ্ধান্ত না নিয়ে honest
    # ভাবে "insufficient_data" বলা
    if len(valid_rr) < 4:
        mean_rr_ms = float(np.mean(valid_rr))
        bpm = 60000.0 / mean_rr_ms if mean_rr_ms > 0 else None
        return SignalAnalysisResult(
            bpm=round(bpm, 1) if bpm else None,
            peak_count=len(peaks),
            rr_intervals_ms=[round(x, 1) for x in valid_rr.tolist()],
            rhythm_regularity="insufficient_data",
            sample_count=n,
        )

    mean_rr_ms = float(np.mean(valid_rr))
    bpm = 60000.0 / mean_rr_ms

    # rhythm regularity: RR interval এর coefficient of variation
    cv = float(np.std(valid_rr) / mean_rr_ms) if mean_rr_ms > 0 else 1.0
    regularity = "regular" if cv < 0.18 else "irregular"

    # HRV metrics বের করা, একই valid_rr ডেটা থেকে
    sdnn, rmssd = calculate_hrv(valid_rr.tolist())

    return SignalAnalysisResult(
        bpm=round(bpm, 1),
        peak_count=len(peaks),
        rr_intervals_ms=[round(x, 1) for x in valid_rr.tolist()],
        rhythm_regularity=regularity,
        sample_count=n,
        sdnn_ms=sdnn,
        rmssd_ms=rmssd,
    )