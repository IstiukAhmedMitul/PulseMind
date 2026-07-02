# PulseMind — Real-time ECG Health Monitoring System with an AI Assistant

PulseMind is a real-time ECG (electrocardiogram) monitoring system built around an AD8232 heart-rate sensor, an ESP8266 microcontroller, a FastAPI backend, and a Next.js web dashboard. It streams live ECG signal data to a browser, computes heart rate (BPM) and rhythm regularity using signal processing, and layers an AI assistant on top for plain-language explanations and basic medical Q&A.

> **Disclaimer:** This is an academic/student project built for learning purposes. It is **not** a certified medical device and must not be used for real diagnosis or treatment decisions. Always consult a licensed medical professional for actual health concerns.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Hardware Components](#hardware-components)
- [Pinout / Wiring](#pinout--wiring)
- [Software Stack](#software-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [API Endpoints](#api-endpoints)
- [Setup Guide](#setup-guide)
  - [1. Hardware Setup](#1-hardware-setup)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Running Everything Together](#4-running-everything-together)
- [Environment Variables](#environment-variables)
- [OpenRouter Free-Tier Notes](#openrouter-free-tier-notes)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

## Overview

PulseMind reads analog ECG signal from an AD8232 sensor via two independent paths:

1. An **ESP8266** samples the signal and streams it over WiFi to a backend server for storage, real-time web display, and AI-assisted analysis.
2. An **Arduino UNO with a TFT display** independently reads the same sensor and renders a classic sweep-style waveform directly on hardware — a standalone bedside-monitor-style display that works with no network dependency.

The backend (FastAPI) stores incoming readings in SQLite, pushes them to connected web clients over a WebSocket for a live canvas-drawn waveform, and exposes endpoints that compute heart rate/rhythm and generate AI explanations via OpenRouter. The frontend (Next.js + Tailwind + DaisyUI) presents a two-panel dashboard: a chatbot on the left, and the live ECG monitor with AI analysis on the right.

---

## System Architecture

```
                    ┌─────────────────────┐
                    │      AD8232         │
                    │   ECG Sensor Module │
                    └──────────┬──────────┘
                               │ shared analog output
                 ┌─────────────┴───────────────┐
                 │                             │
        ┌────────▼────────┐          ┌─────────▼─────────┐
        │    ESP8266      │          │  Arduino UNO +    │
        │  (WiFi sender)  │          │  2.4" TFT Display │
        └────────┬────────┘          │ (standalone sweep)│
                 │ HTTP POST (JSON)  └───────────────────┘
                 │ batched readings
        ┌────────▼─────────────────────────────────┐
        │           FastAPI Backend                │
        │  ┌─────────────────────────────────────┐ │
        │  │  /api/data   -> ingest + SQLite     │ │
        │  │  /ws/ecg     -> WebSocket broadcast │ │
        │  │  /api/readings/latest -> history    │ │
        │  │  /api/analysis -> BPM + AI summary  │ │
        │  │  /api/chat    -> AI chatbot         │ │
        │  └─────────────────────────────────────┘ │
        └─────────── ┬───────────────┬─────────────┘
                     │               │
           SQLite DB │               │ OpenRouter API
        (readings,   │               │ (LLM inference)
        sessions,    │               │
        chat_history)│               │
                     │               │
        ┌─────────── ▼───────────────▼─────────────────┐
        │              Next.js Frontend                │
        │  ┌──────────────┐  ┌───────────────────────┐ │
        │  │  Chat Panel  │  │  ECG Monitor (Canvas) │ │
        │  │  (left)      │  │  + AI Analysis Panel  │ │
        │  │              │  │  (right)              │ │
        │  └──────────────┘  └───────────────────────┘ │
        └──────────────────────────────────────────────┘
```

**Data flow summary:**
1. AD8232 outputs an analog ECG waveform.
2. ESP8266 samples it (~125 Hz), batches ~15 samples, and POSTs them as JSON to the backend.
3. The backend stores each reading in SQLite and immediately broadcasts it over WebSocket to any connected browser.
4. The frontend draws the live waveform on an HTML5 canvas as new WebSocket messages arrive.
5. Periodically, the frontend requests `/api/analysis`, which pulls the most recent samples, computes BPM/rhythm with `scipy`-based peak detection, and asks an LLM (via OpenRouter) to explain the numbers in plain language.
6. The chatbot panel sends free-form questions to `/api/chat`, which forwards them to the same LLM with a safety-oriented system prompt.

---

## Hardware Components

| Component | Purpose |
|---|---|
| AD8232 ECG Measurement Module | Captures raw ECG analog signal from electrodes |
| ESP8266 (NodeMCU) | Reads AD8232 output, sends batched readings to backend over WiFi |
| Arduino UNO R3 | Drives the standalone TFT sweep display |
| Quentacy 2.4" TFT LCD Shield (UNO/Mega compatible) | Renders a real-time waveform directly on hardware, independent of the network |
| ECG electrodes + leads | Physical sensor attachment to the body |
| Breadboard / jumper wires | Shared wiring between AD8232 and both microcontrollers |

---

## Pinout / Wiring

### AD8232 → ESP8266 (WiFi sender)

| AD8232 Pin | ESP8266 Pin | Notes |
|---|---|---|
| GND | GND | Common ground |
| 3.3V | 3.3V | Powering at 3.3V keeps output in ESP8266's safe ADC range |
| OUTPUT | A0 | Only analog input pin on ESP8266 |
| LO-, LO+, SDN | Not used | Leads-off detection / shutdown pins, unused in current firmware |

### AD8232 → Arduino UNO (standalone TFT display)

| AD8232 Pin | UNO Pin | Notes |
|---|---|---|
| GND | GND | Common ground |
| 3.3V | 3.3V | UNO has a native 3.3V rail |
| OUTPUT | A5 | Chosen to avoid conflicting with TFT shield's control pins (typically A0–A3) |
| LO-, LO+ | Not used | — |

### Sharing one AD8232 between both boards

Since both devices read from the same sensor simultaneously:

```
AD8232 OUTPUT ──┬── ESP8266 A0
                └── Arduino UNO A5

AD8232 GND ──┬── ESP8266 GND
             └── Arduino UNO GND

AD8232 3.3V ──┬── ESP8266 3.3V
              └── Arduino UNO 3.3V
```

**Important:** Both boards' GND must be tied together, or signal noise/ground-loop issues will occur. Power the AD8232 from a single consistent source where possible.

---

## Software Stack

| Layer | Technology |
|---|---|
| Firmware (sender) | Arduino C++ (ESP8266) |
| Firmware (display) | Arduino C++ (UNO + TFT shield, MCUFRIEND-compatible) |
| Backend framework | FastAPI (Python) |
| Database | SQLite (via SQLAlchemy ORM) |
| Signal processing | NumPy + SciPy (peak detection, BPM calculation) |
| AI inference | OpenRouter API (LLM of choice, free-tier compatible) |
| Real-time transport | WebSockets (native FastAPI support) |
| Frontend framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS + DaisyUI |
| ECG rendering | HTML5 Canvas (custom monitor-style sweep, no charting library) |
| Markdown rendering | react-markdown (for AI responses in chat/analysis) |

---

## Project Structure

```
ecg-project/
├── hardware/
│   ├── ecg_sender/
│   │   ├── ecg_sender.ino          # ESP8266 firmware — reads AD8232, POSTs to backend
│   │   └── secrets_example.h       # Template for WiFi/server credentials (copy to secrets.h)
│   └── ecg_display_uno/
│       └── ecg_display_uno.ino     # UNO + TFT firmware — standalone waveform display
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entrypoint, CORS, router registration
│   │   ├── config.py               # Environment-based settings (pydantic-settings)
│   │   ├── database.py             # SQLAlchemy engine/session setup
│   │   ├── models.py               # ORM models: Reading, MeasurementSession, ChatMessage
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── ws_manager.py           # WebSocket connection manager (broadcast to clients)
│   │   ├── routes/
│   │   │   ├── ingest.py           # POST /api/data — receives ESP8266 batches
│   │   │   ├── readings.py         # GET /api/readings/latest, WS /ws/ecg
│   │   │   ├── analysis.py         # GET /api/analysis — BPM/rhythm + AI explanation
│   │   │   └── chat.py             # POST /api/chat — AI chatbot
│   │   └── services/
│   │       ├── signal_processing.py # R-peak detection, BPM, rhythm regularity (SciPy)
│   │       └── ai_client.py         # OpenRouter wrapper + output sanitization
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout, DaisyUI dark theme
│   │   ├── page.tsx                 # Main dashboard (chat + monitor + analysis)
│   │   └── globals.css              # Tailwind + DaisyUI + typography plugin setup
│   ├── components/
│   │   ├── EcgMonitor.tsx           # Canvas-based real-time ECG sweep renderer
│   │   ├── AnalysisPanel.tsx        # BPM/rhythm display + AI summary (auto-refreshing)
│   │   └── ChatPanel.tsx            # Chatbot UI with markdown-rendered messages
│   ├── lib/
│   │   ├── api.ts                   # REST helper functions (fetch wrappers)
│   │   └── useEcgSocket.ts          # WebSocket hook with auto-reconnect + ring buffer
│   └── .env.local.example
│
└── .gitignore
```

---

## How It Works

### 1. Signal acquisition
The ESP8266 samples the AD8232 output roughly every 8ms (~125 Hz), collecting batches of 15 readings before sending them as a single HTTP POST request. This batching reduces network overhead while keeping end-to-end latency low.

### 2. Ingestion and storage
The backend's `/api/data` endpoint validates the incoming batch, writes each reading to SQLite (`readings` table), and immediately broadcasts the new readings to all connected WebSocket clients — this is what powers the live waveform in the browser.

### 3. Real-time visualization
The frontend maintains a WebSocket connection to `/ws/ecg`. Incoming readings are kept in a fixed-size ring buffer (1000 samples) and redrawn on an HTML5 canvas on every update, producing a classic hospital-monitor-style green trace on a black grid background.

### 4. Signal analysis (BPM + rhythm)
Rather than asking an LLM to interpret raw ADC values directly (unreliable), `signal_processing.py` performs deterministic peak detection using `scipy.signal.find_peaks` on a detrended version of the signal. It computes:
- **BPM** from the mean R-R interval between detected peaks
- **Rhythm regularity** (`regular` / `irregular`) from the coefficient of variation of R-R intervals
- Handles edge cases gracefully — insufficient data or a flat/disconnected signal returns `insufficient_data` instead of a fabricated number

### 5. AI explanation
The computed metrics (never raw signal values) are passed to an LLM via OpenRouter, which is instructed — via a strict system prompt — to explain the numbers in plain Bengali, avoid diagnosing, and always include an educational-use disclaimer. Since free-tier models occasionally leak non-target-language tokens (a known issue with some reasoning/MoE models), the backend also runs a `sanitize_output()` pass that strips any contiguous block of non-Bengali/non-Latin script from the response as a model-independent safety net.

### 6. Chatbot
The chat panel sends free-text questions to `/api/chat`, which uses a similarly constrained system prompt: no personal diagnosis, redirect urgent symptoms to emergency services, keep answers short, and always disclose that it's a student project, not a licensed medical source.

---

## API Endpoints

Base URL: `http://<backend-host>:8000`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check, returns `{"status": "ok"}` |
| `POST` | `/api/data` | Ingest a batch of ECG readings from the ESP8266. Body: `{"readings": [{"value": int, "millis": int}, ...]}` |
| `GET` | `/api/readings/latest?limit=200` | Returns the most recent `limit` readings (oldest → newest) |
| `WS` | `/ws/ecg` | WebSocket endpoint; broadcasts `{"type": "new_readings", "readings": [...]}` whenever new data is ingested |
| `GET` | `/api/analysis?window=500` | Runs signal processing + AI explanation over the last `window` samples. Returns BPM, rhythm note, AI summary, sample count |
| `POST` | `/api/chat` | Send a chat message. Body: `{"message": "..."}`. Returns `{"reply": "..."}` |
| `GET` | `/docs` | Interactive Swagger UI (auto-generated by FastAPI) |

---

## Setup Guide

### 1. Hardware Setup

1. Wire the AD8232 to both the ESP8266 and Arduino UNO as described in [Pinout / Wiring](#pinout--wiring).
2. Attach ECG electrodes per the AD8232 module's standard 3-lead placement (RA, LA, RL).
3. Confirm both boards share a common ground.

### 2. Backend Setup

**Requirements:** Python 3.10+

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
DATABASE_URL=sqlite:///./ecg.db
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openrouter/free
FRONTEND_ORIGIN=http://localhost:3000
```

Get an OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys). See [OpenRouter Free-Tier Notes](#openrouter-free-tier-notes) below before relying on free models for a live demo.

Run the server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify it's running by visiting `http://localhost:8000/docs`.

### 3. Frontend Setup

**Requirements:** Node.js 18+

```bash
cd frontend
npm install
```

Create your environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` — point it at your backend's IP (use your machine's actual LAN IP, not `localhost`, if the ESP8266 and frontend are on different devices):

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://192.168.x.x:8000
NEXT_PUBLIC_WS_URL=ws://192.168.x.x:8000/ws/ecg
```

Run the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 4. Running Everything Together

1. Find your backend machine's local IPv4 address (`ipconfig` on Windows, `ifconfig`/`ip addr` on Linux/Mac). Both the ESP8266 and your browser must be able to reach this address.
2. Copy `hardware/ecg_sender/secrets_example.h` to `hardware/ecg_sender/secrets.h` and fill in:
   ```cpp
   #define WIFI_SSID     "your_wifi_name"
   #define WIFI_PASSWORD "your_wifi_password"
   #define SERVER_IP     "192.168.x.x"   // your backend machine's LAN IP
   #define SERVER_PORT   8000
   ```
3. Flash `ecg_sender.ino` to the ESP8266 (Arduino IDE, with the ESP8266 board package installed). Open the Serial Monitor at 115200 baud to confirm it connects to WiFi and successfully POSTs batches (`HTTP 200`).
4. Optionally flash `ecg_display_uno.ino` to the Arduino UNO for the standalone hardware display.
5. Start the backend (`uvicorn ...`) and frontend (`npm run dev`) as described above.
6. Open the frontend in a browser — you should see a live waveform, periodic AI analysis, and a working chatbot.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./ecg.db` |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | Model ID used for chat + analysis | `openrouter/free` |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the frontend | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend REST base URL | `http://192.168.1.100:8000` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket URL | `ws://192.168.1.100:8000/ws/ecg` |

### Hardware (`hardware/ecg_sender/secrets.h`)

| Define | Description |
|---|---|
| `WIFI_SSID` / `WIFI_PASSWORD` | Local WiFi credentials |
| `SERVER_IP` / `SERVER_PORT` | Backend machine's LAN IP and port |

> All of the above are excluded from version control via `.gitignore`. Never commit `.env`, `.env.local`, or `secrets.h`.

---

## Known Limitations

- **Not a certified medical device.** BPM/rhythm output is for educational demonstration only.
- **Free-tier LLM reliability.** Free OpenRouter models can occasionally leak non-target-language tokens or hit rate limits; the backend includes output sanitization and graceful error handling, but responses are not guaranteed to be perfectly consistent.
- **Single shared sensor.** The ESP8266 and Arduino UNO read from the same AD8232 simultaneously; incorrect grounding between the two boards can introduce noise into the signal.
- **SQLite for storage.** Suitable for local/demo use; not designed for concurrent multi-writer production workloads. Migrating to PostgreSQL is straightforward if needed (see `DATABASE_URL`).
- **No authentication.** All API endpoints are open by default — this is a local/demo project and does not implement user accounts or access control.

## Future Improvements

- Session-based recording (start/stop measurement sessions, tagged in the `sessions` table)
- Export readings/analysis as PDF or CSV reports
- Multi-user support with authentication
- Migrate to PostgreSQL for concurrent access
- Add more robust ECG feature extraction (P/QRS/T wave segmentation, not just R-peak/BPM)
- Deploy backend + frontend to a public host (Render/Railway + Vercel) for remote access

---

## Contributors
*   **Md. Istiuk Ahmed Mitul:** [github.com/IstiukAhmedMitul](https://github.com/IstiukAhmedMitul)
*   **Md Najib Ul Azam Mahi:** [github.com/najibulazam](https://github.com/najibulazam)
*   **Md Ruhul Amin Maruf:** [github.com/marufhasan-122](https://github.com/marufhasan-122)