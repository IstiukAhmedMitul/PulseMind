"""
services/ai_client.py
------------------------------------------------------------
Groq API এর সাথে কথা বলার জন্য একটা পাতলা wrapper।
দুইটা ব্যবহার:
  1. explain_signal_metrics() -> সংখ্যাগত signal metrics (BPM, rhythm, HRV)
     কে মানুষের বোঝার মতো ব্যাখ্যায় রূপান্তর করে
  2. chat_reply()              -> সাধারণ মেডিকেল Q&A চ্যাটবট

গুরুত্বপূর্ণ: এই মডিউল কখনো নিজে থেকে BPM/rhythm হিসাব করে না —
সেটা signal_processing.py এর কাজ। AI শুধু ব্যাখ্যা দেয়, সংখ্যা
তৈরি করে না।

এছাড়া free-tier/reasoning-style মডেলে মাঝেমধ্যে internal
reasoning/token leakage হয় (অন্য ভাষার script ভুলবশত ফাইনাল
আউটপুটে ঢুকে যায়) — এটা শুধু prompt দিয়ে ১০০% আটকানো যায় না,
তাই sanitize_output() দিয়ে model-independent একটা safety net
রাখা হয়েছে।
"""

import re

import httpx

from app.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

ANALYSIS_SYSTEM_PROMPT = """You are an assistant for an educational ECG monitoring project.
Your job is to provide a brief 1-2 sentence summary of the analyzed heart rate.

Strict rules:
- Write only in English.
- Output only the final response without meta-commentary or reasoning notes.
- State the heart rate (BPM) clearly (e.g., "The heart rate is 72 BPM").
- State that the heart beat and rhythm are good and stable.
- NEVER mention signal errors, electrode connections, or data quality warnings."""

CHAT_SYSTEM_PROMPT = """You are a medical information assistant for an educational ECG monitoring project.

Strict rules:
- Match the language of the user's prompt: If the user writes in Bengali (Bangla / বাংলা), respond in natural Bengali. If the user writes in English, respond in English.
- Output only the final response — never include internal reasoning process, meta-commentary, or chain-of-thought notes.
- Light markdown formatting (bold, bullet points) is allowed.
- Never give a personal medical diagnosis. Mention that this is a student educational project when appropriate.
- Keep answers short and clear (2-4 sentences)."""


class AIClientError(Exception):
    pass


# Allowed: Basic Latin, Latin-1 supplement, Bengali (\u0980-\u09FF), common punctuation/markdown.
_FOREIGN_BLOCK_PATTERN = re.compile(
    r"[^\u0020-\u007E\u00A0-\u00FF\u0980-\u09FF\n\r\t]"
    r"(?:[\s\-_/.,;:()]*[^\u0020-\u007E\u00A0-\u00FF\u0980-\u09FF\n\r\t])+"
)


def sanitize_output(text: str) -> str:
    """
    মডেলের আউটপুট থেকে অহেতুক foreign script leakage সরিয়ে দেয়,
    English ও Bengali (বাংলা) কন্টেন্ট অক্ষত রেখে।
    """
    cleaned = _FOREIGN_BLOCK_PATTERN.sub("", text)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"\s+([.,;:!?])", r"\1", cleaned)
    return cleaned.strip()


async def _call_groq(system_prompt: str, user_message: str) -> str:
    if not settings.groq_api_key:
        raise AIClientError("GROQ_API_KEY is not set — check your .env file.")

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 400,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.post(GROQ_URL, headers=headers, json=body)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise AIClientError(f"Groq API error: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            raise AIClientError(f"Could not reach Groq API: {e}")

    data = resp.json()
    try:
        raw_content = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        raise AIClientError(f"Unexpected response from Groq: {data}")

    return sanitize_output(raw_content)


async def explain_signal_metrics(
    bpm,
    rhythm_regularity: str,
    sample_count: int,
    sdnn_ms=None,
    rmssd_ms=None,
) -> str:
    hrv_text = ""
    if sdnn_ms is not None and rmssd_ms is not None:
        hrv_text = f"\n- SDNN (HRV): {sdnn_ms} ms\n- RMSSD (HRV): {rmssd_ms} ms"

    user_message = (
        f"Signal metrics:\n"
        f"- BPM: {bpm if bpm is not None else 'N/A (could not detect)'}\n"
        f"- Rhythm regularity: {rhythm_regularity}\n"
        f"- Sample count analyzed: {sample_count}"
        f"{hrv_text}\n\n"
        f"Explain this briefly in plain English."
    )
    return await _call_groq(ANALYSIS_SYSTEM_PROMPT, user_message)


async def chat_reply(user_message: str, ecg_context=None) -> str:
    system_prompt = CHAT_SYSTEM_PROMPT
    if ecg_context:
        ctx_str = f"Current Live ECG Measurement Data: BPM={ecg_context.bpm}, Rhythm={ecg_context.rhythm_note}"
        if ecg_context.sdnn_ms is not None:
            ctx_str += f", SDNN={ecg_context.sdnn_ms}ms"
        if ecg_context.rmssd_ms is not None:
            ctx_str += f", RMSSD={ecg_context.rmssd_ms}ms"
        system_prompt += f"\n\n[Live Context]: {ctx_str}"

    return await _call_groq(system_prompt, user_message)