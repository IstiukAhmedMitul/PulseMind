"""
services/ai_client.py
------------------------------------------------------------
OpenRouter API এর সাথে কথা বলার জন্য একটা পাতলা wrapper।
দুইটা ব্যবহার:
  1. explain_signal_metrics() -> সংখ্যাগত signal metrics (BPM, rhythm)
     কে মানুষের বোঝার মতো ব্যাখ্যায় রূপান্তর করে
  2. chat_reply()              -> সাধারণ মেডিকেল Q&A চ্যাটবট

গুরুত্বপূর্ণ: এই মডিউল কখনো নিজে থেকে BPM/rhythm হিসাব করে না —
সেটা signal_processing.py এর কাজ। AI শুধু ব্যাখ্যা দেয়, সংখ্যা
তৈরি করে না (raw signal থেকে LLM কে diagnose করানো অনির্ভরযোগ্য)।

এছাড়া free-tier/reasoning-style মডেলে মাঝেমধ্যে internal
reasoning/token leakage হয় (অন্য ভাষার script, যেমন কোরিয়ান/
চাইনিজ/আরবি, ভুলবশত ফাইনাল আউটপুটে ঢুকে যায়) — এটা শুধু prompt
দিয়ে ১০০% আটকানো যায় না, তাই sanitize_output() দিয়ে
model-independent একটা safety net রাখা হয়েছে।
"""

import re

import httpx

from app.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ডিসক্লেইমারসহ সিস্টেম প্রম্পট — শিক্ষামূলক প্রজেক্ট, ডায়াগনস্টিক টুল না
ANALYSIS_SYSTEM_PROMPT = """তুমি একটা শিক্ষামূলক ECG মনিটরিং প্রজেক্টের সহকারী।
তোমাকে ইতিমধ্যে হিসাব করা signal metrics (BPM, rhythm regularity, sample count)
দেওয়া হবে। তোমার কাজ শুধু এই সংখ্যাগুলো ২-৩ বাক্যে সহজ ভাষায় ব্যাখ্যা করা।

কড়া নিয়ম:
- শুধুমাত্র বাংলা ভাষায় লিখবে, অন্য কোনো ভাষা বা meta-commentary/নোট থাকবে না
- শুধু চূড়ান্ত উত্তরটাই লিখবে, নিজের চিন্তা প্রক্রিয়া নয়
- কখনো নিজে থেকে নতুন সংখ্যা/BPM বানাবে না, শুধু যা দেওয়া হয়েছে তা ব্যাখ্যা করবে
- কোনো নির্দিষ্ট রোগ নির্ণয় (diagnosis) করবে না
- হালকা markdown ব্যবহার করা যাবে, কিন্তু জটিল/দীর্ঘ formatting এড়িয়ে চলবে
- সবসময় উত্তরের শেষে সংক্ষেপে বলবে এটা একটা ছাত্র প্রজেক্ট, চিকিৎসা পরামর্শ না
- bpm None বা rhythm "insufficient_data" হলে বলবে সিগন্যাল স্পষ্ট না বা ইলেক্ট্রোড ঠিকমতো লাগানো নেই"""

CHAT_SYSTEM_PROMPT = """তুমি একটা ECG মনিটরিং শিক্ষামূলক প্রজেক্টের মধ্যে থাকা একটা
বেসিক মেডিকেল তথ্য চ্যাটবট। তুমি সাধারণ, পাবলিকলি জানা মেডিকেল ধারণা
(যেমন হার্ট রেট, ECG কী, সাধারণ স্বাস্থ্য প্রশ্ন) ব্যাখ্যা করতে পারো।

কড়া নিয়ম:
- শুধুমাত্র বাংলা ভাষায় উত্তর দেবে (প্রয়োজনে মেডিকেল টার্মের ইংরেজি নাম বন্ধনীতে দিতে পারো)। অন্য কোনো ভাষা (কোরিয়ান, চাইনিজ ইত্যাদি) বা কোনো কোড-কমেন্ট/নোট জাতীয় টেক্সট কখনো আউটপুটে থাকবে না
- শুধু চূড়ান্ত উত্তরটাই লিখবে — নিজের চিন্তা প্রক্রিয়া, নোট, বা "এখানে জোর দিতে হবে" জাতীয় কোনো meta-commentary কখনো লিখবে না
- হালকা markdown (bold, bullet list) ব্যবহার করতে পারো, কিন্তু অতিরিক্ত জটিল formatting এড়িয়ে চলবে
- কখনো নির্দিষ্ট কারো ব্যক্তিগত ডায়াগনোসিস বা চিকিৎসা পরামর্শ দেবে না
- জরুরি উপসর্গ (বুকে ব্যথা, শ্বাসকষ্ট ইত্যাদি) উল্লেখ করলে সংক্ষেপে বলবে তাৎক্ষণিক চিকিৎসকের/জরুরি সেবার সাহায্য নিতে — এক-দুই বাক্যেই যথেষ্ট, দীর্ঘ তালিকা না
- উত্তর সংক্ষিপ্ত রাখবে (৩-৪ বাক্যের মধ্যে, একান্ত প্রয়োজন না হলে)
- তুমি একটা ছাত্র প্রজেক্টের অংশ, লাইসেন্সপ্রাপ্ত ডাক্তার না — এটা প্রয়োজনে সংক্ষেপে মনে করিয়ে দেবে"""


class AIClientError(Exception):
    pass


# Bengali (\u0980-\u09FF), Basic Latin, Latin-1 supplement, common punctuation/
# markdown symbols, whitespace — এর বাইরের যেকোনো script (Hangul, CJK, Arabic,
# Devanagari ইত্যাদি) কে "বহিরাগত" ধরা হচ্ছে
_ALLOWED_CHAR_PATTERN = re.compile(
    r"[^\u0980-\u09FF\u0020-\u007E\u00A0-\u00FF\n\r\t]"
)

# পরপর ২+ বহিরাগত ক্যারেক্টার (মাঝে সাধারণ punctuation/space থাকলেও পুরো
# ব্লককে ধরা হয়) থাকলে সেটাকে "leaked segment" হিসেবে বাদ দেওয়া হয়
_FOREIGN_BLOCK_PATTERN = re.compile(
    r"[^\u0980-\u09FF\u0020-\u007E\u00A0-\u00FF\n\r\t]"
    r"(?:[\s\-_/.,;:()]*[^\u0980-\u09FF\u0020-\u007E\u00A0-\u00FF\n\r\t])+"
)


def sanitize_output(text: str) -> str:
    """
    মডেলের আউটপুট থেকে non-Bengali/non-Latin script এর ব্লক
    (কোরিয়ান/চাইনিজ/আরবি ইত্যাদি token leakage) সরিয়ে দেয়।
    বিদেশী ক্যারেক্টারগুলোর মাঝে সাধারণ punctuation/space থাকলেও
    পুরো সেগমেন্টটাকে এক leaked block হিসেবে ধরা হয়।
    """
    cleaned = _FOREIGN_BLOCK_PATTERN.sub("", text)
    # sanitize এর ফলে তৈরি হওয়া double punctuation/dangling separator পরিষ্কার করা
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"\s+([.,;:!?])", r"\1", cleaned)  # punctuation এর আগে অতিরিক্ত স্পেস
    return cleaned.strip()


async def _call_openrouter(system_prompt: str, user_message: str) -> str:
    if not settings.openrouter_api_key:
        raise AIClientError("OPENROUTER_API_KEY সেট করা নেই — .env ফাইল চেক করো।")

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 400,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.post(OPENROUTER_URL, headers=headers, json=body)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise AIClientError(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            raise AIClientError(f"OpenRouter এ পৌঁছানো যায়নি: {e}")

    data = resp.json()
    try:
        raw_content = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        raise AIClientError(f"OpenRouter থেকে অপ্রত্যাশিত রেসপন্স: {data}")

    return sanitize_output(raw_content)


async def explain_signal_metrics(bpm, rhythm_regularity: str, sample_count: int) -> str:
    user_message = (
        f"Signal metrics:\n"
        f"- BPM: {bpm if bpm is not None else 'N/A (could not detect)'}\n"
        f"- Rhythm regularity: {rhythm_regularity}\n"
        f"- Sample count analyzed: {sample_count}\n\n"
        f"এই তথ্য বাংলায় সংক্ষেপে ব্যাখ্যা করো।"
    )
    return await _call_openrouter(ANALYSIS_SYSTEM_PROMPT, user_message)


async def chat_reply(user_message: str) -> str:
    return await _call_openrouter(CHAT_SYSTEM_PROMPT, user_message)
