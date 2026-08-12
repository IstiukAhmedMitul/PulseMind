"""
services/filters.py
------------------------------------------------------------
ECG সিগন্যাল থেকে noise সরানোর জন্য দুইটা filter:
  1. Bandpass (0.5-40Hz) — ধীর baseline drift ও উচ্চ-ফ্রিকোয়েন্সি
     noise বাদ দেয়, শুধু ECG-relevant frequency range রাখে
  2. Notch (50Hz) — power-line/mains hum বাদ দেয়

এই ফাইলটা raw signal_processing.py এর আগে apply হয় — অর্থাৎ
আগে filter, তারপর peak detection/BPM calculation।
"""

import numpy as np
from scipy.signal import butter, filtfilt, iirnotch


def bandpass_filter(values, fs, lowcut=0.5, highcut=40.0, order=2):
    """
    values: raw ADC readings এর list
    fs: sample rate (Hz) — আমাদের ESP8266 সেটআপে প্রায় ১২৫Hz
    """
    values = np.array(values, dtype=float)
    nyquist = fs / 2.0
    low = lowcut / nyquist
    high = min(highcut / nyquist, 0.99)

    # খুব কম sample থাকলে filter apply করা সম্ভব না (filtfilt এর জন্য
    # ন্যূনতম sample count লাগে), তখন raw ডেটাই ফেরত দেওয়া হয়
    if len(values) < order * 3 + 1:
        return values

    b, a = butter(order, [low, high], btype="band")
    return filtfilt(b, a, values)


def notch_filter(values, fs, notch_freq=50.0, quality=30.0):
    """৫০Hz (বাংলাদেশের mains frequency) power-line noise বাদ দেয়।"""
    values = np.array(values, dtype=float)
    nyquist = fs / 2.0

    if notch_freq >= nyquist or len(values) < 20:
        return values

    b, a = iirnotch(notch_freq / nyquist, quality)
    return filtfilt(b, a, values)


def apply_filters(values, fs):
    """Bandpass ও notch filter একসাথে apply করার convenience function।"""
    filtered = bandpass_filter(values, fs)
    filtered = notch_filter(filtered, fs, notch_freq=50.0)
    return filtered.tolist()