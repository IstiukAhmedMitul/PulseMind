"""
services/pattern_flags.py
------------------------------------------------------------
BPM ও rhythm regularity থেকে সহজ, non-diagnostic pattern flag তৈরি করে।

গুরুত্বপূর্ণ: এই ফাংশন কখনো "disease" বা "condition" নাম বলে না, শুধু
observed pattern কে বর্ণনা করে (যেমন "rate above typical range")। এটা
diagnosis না — শুধু descriptive flag, যেটা ইউজারকে জানায় ফলাফল
কোথায় typical range এর বাইরে গেছে।
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class PatternFlag:
    code: str
    label: str
    description: str
    severity: str  # "info" | "notice"


def detect_flags(
    bpm: Optional[float],
    rhythm_regularity: str,
    sdnn_ms: Optional[float],
    rmssd_ms: Optional[float],
) -> List[PatternFlag]:
    flags: List[PatternFlag] = []

    if rhythm_regularity == "insufficient_data" or bpm is None:
        return flags

    if bpm > 100:
        flags.append(PatternFlag(
            code="rate_above_typical",
            label="Rate above typical resting range",
            description=(
                f"The detected rate ({bpm:.0f} bpm) is above the commonly cited resting "
                f"range of 60-100 bpm. This can be caused by movement, stress, exercise, "
                f"or normal individual variation."
            ),
            severity="notice",
        ))
    elif bpm < 60:
        flags.append(PatternFlag(
            code="rate_below_typical",
            label="Rate below typical resting range",
            description=(
                f"The detected rate ({bpm:.0f} bpm) is below the commonly cited resting "
                f"range of 60-100 bpm. This is common in athletes and during rest, and "
                f"can also reflect measurement conditions."
            ),
            severity="notice",
        ))

    if rhythm_regularity == "irregular":
        flags.append(PatternFlag(
            code="irregular_timing",
            label="More beat-to-beat variation than a regular pattern",
            description=(
                "The time between detected beats varied more than what is typically "
                "seen in a steady resting rhythm. This can result from motion, noise, "
                "or genuine rhythm variability."
            ),
            severity="notice",
        ))

    if not flags:
        flags.append(PatternFlag(
            code="within_typical_range",
            label="Within typical resting range",
            description=(
                "The detected rate and rhythm pattern fall within commonly cited "
                "typical resting ranges."
            ),
            severity="info",
        ))

    return flags