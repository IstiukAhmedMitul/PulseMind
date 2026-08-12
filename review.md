# PulseMind ECG Project — System Audit (Review)

## 1) What this project is

PulseMind is an educational, full‑stack ECG monitoring + “AI health assistant” system intended for a lab / student project. It combines:

- A low-cost hardware pipeline (ESP8266/NodeMCU + AD8232 ECG sensor) that samples an analog ECG waveform and sends batches over Wi‑Fi.
- A FastAPI backend that stores incoming samples in SQLite, streams new samples to clients via WebSocket, and provides endpoints for analysis, trends, chat, and shareable report snapshots.
- A Next.js frontend dashboard that visualizes the live waveform, triggers analysis, chats with an AI assistant, plots analysis history, and exports/shares reports.

It is explicitly **not** a medical diagnostic system (also stated in [README.md](file:///c:/Users/NAJIB/Desktop/ecg-project/README.md#L110-L115)). The analysis and the AI output are designed to be descriptive and educational.

## 2) Repository contents (high-level)

Top-level structure (as present in this repo):

- `backend/`: FastAPI + SQLAlchemy + signal processing, plus local SQLite DB file and example environment files.
- `frontend/`: Next.js (App Router) UI with components for waveform, analysis, chat, trend chart, PDF export, and bilingual UI strings.
- `hardware/`: Arduino sketches for ESP8266 sampling + sender firmware and a minimal AD8232 serial debug sketch.

Notes about included artifacts:

- `backend/venv/` exists in this repo (a full Python virtual environment). This is usually not committed in production repos and inflates size.
- `frontend/.next/` exists in this repo (Next.js build/dev output). This is also typically not committed.
- `backend/ecg.db` exists (a local SQLite database file).

## 3) System architecture and data flow

### 3.1 Hardware → Backend ingest

The ESP8266 firmware (`hardware/ecg_sender/ecg_sender.ino`) samples ECG values from AD8232 (analog input A0) at ~125 Hz:

- Sampling rate is controlled by `SAMPLE_DELAY_MS = 8` → roughly 125 samples/second.
- It collects `SAMPLES_PER_BATCH = 15` samples per HTTP request.

It POSTs JSON batches to the backend:

- Endpoint: `POST http://{SERVER_IP}:{SERVER_PORT}/api/data`
- Payload shape:
  - `{"readings":[{"value":<int>,"millis":<unsigned long>}, ...]}`

Relevant files:

- Sender firmware: [hardware/ecg_sender/ecg_sender.ino](file:///c:/Users/NAJIB/Desktop/ecg-project/hardware/ecg_sender/ecg_sender.ino)
- Secrets template: [hardware/ecg_sender/secrets_example.h](file:///c:/Users/NAJIB/Desktop/ecg-project/hardware/ecg_sender/secrets_example.h)

### 3.2 Backend ingest → DB + WebSocket broadcast

The backend stores each incoming sample into SQLite and broadcasts the same samples to connected dashboard clients:

- Storage: `readings` table
- Broadcast payload shape:
  - `{"type":"new_readings","readings":[{"id":..., "value":..., "esp_millis":..., "received_at":...}, ...]}`

Relevant files:

- Ingest route: [backend/app/routes/ingest.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/routes/ingest.py)
- WebSocket connection manager: [backend/app/ws_manager.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/ws_manager.py)

### 3.3 Frontend live display

The dashboard connects to the WebSocket and renders the waveform in a `<canvas>`:

- WebSocket hook: [frontend/lib/useEcgSocket.ts](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/lib/useEcgSocket.ts)
- Monitor rendering: [frontend/components/EcgMonitor.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/components/EcgMonitor.tsx)

The frontend also “seeds” the waveform buffer initially using REST (`GET /api/readings/latest`) before continuing with WebSocket updates:

- Dashboard page: [frontend/app/page.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/app/page.tsx)

### 3.4 Analysis + trends + reporting

When the user clicks “Analyze”:

- The frontend calls `GET /api/analysis?window=500` ([frontend/components/AnalysisPanel.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/components/AnalysisPanel.tsx)).
- The backend:
  - Fetches the latest N samples from the DB.
  - Applies digital filters (bandpass + 50Hz notch).
  - Runs peak detection to estimate BPM, RR intervals, rhythm regularity, and HRV (SDNN/RMSSD).
  - Generates non-diagnostic “pattern flags”.
  - Calls Groq LLM (if configured) to produce a short human-readable summary.
  - Stores an `analysis_records` entry for later trend plotting.

Trend chart:

- The frontend calls `GET /api/analysis/history?range=day|week|month` and plots BPM over time using Recharts ([frontend/components/TrendChart.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/components/TrendChart.tsx)).

Report sharing:

- The frontend can POST a snapshot to `POST /api/reports/share`, then produces a public URL `/report/{id}` ([frontend/components/AnalysisPanel.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/components/AnalysisPanel.tsx)).
- The report page fetches the snapshot with `GET /api/reports/{report_id}` and can export it to PDF ([frontend/app/report/[id]/page.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/app/report/%5Bid%5D/page.tsx)).

PDF export:

- Implemented client-side via `html2canvas` + `jsPDF` (with a `window.print()` fallback): [frontend/lib/pdfGenerator.ts](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/lib/pdfGenerator.ts)

## 4) Backend: what it contains

### 4.1 Tech stack

- FastAPI + Uvicorn: REST + WebSocket server
- SQLAlchemy: ORM
- SQLite: local database
- Numpy + SciPy: signal filtering and peak detection
- httpx: Groq API calls

Pinned Python dependencies are listed in: [backend/requirements.txt](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/requirements.txt)

### 4.2 Backend entry point and routing

- App bootstrap, CORS setup, router mounting: [backend/app/main.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/main.py)
- Health check: `GET /health`
- API routers are mounted under `/api` and WebSocket under `/ws/...`.

### 4.3 Database schema (SQLAlchemy models)

All tables are defined in: [backend/app/models.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/models.py)

- `readings`
  - Purpose: raw ECG samples.
  - Key fields: `id`, `received_at`, `esp_millis`, `value`, `session_id`.
- `sessions`
  - Purpose: measurement session concept (start/end/label).
  - Note: in current code, ingest does not assign `session_id`, so it is largely unused.
- `chat_history`
  - Purpose: store chatbot logs.
  - Key fields: `role` (`user`/`assistant`), `content`.
- `analysis_records`
  - Purpose: store analysis results over time (trend source).
  - Key fields: `bpm`, `sdnn_ms`, `rmssd_ms`, `rhythm_regularity`, `sample_count`, `created_at`.
- `shared_reports`
  - Purpose: store “public” shareable report snapshots.
  - Key fields: `id` (string like `report_xxxxx`), `bpm`, HRV metrics, `rhythm_note`, `ai_summary`.

Database connection and session dependency are in: [backend/app/database.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/database.py)

### 4.4 API endpoints (contract)

Request/response schemas are defined in: [backend/app/schemas.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/schemas.py)

Endpoints currently exposed:

- `POST /api/data`
  - Ingest ECG sample batch from ESP8266.
  - Body: `IngestPayload` (`readings[]` items with `value`, `millis`).
- `GET /api/readings/latest?limit=...`
  - Returns the most recent samples, oldest→newest in the response.
- `GET /ws/ecg`
  - WebSocket that broadcasts `type:"new_readings"` messages.
- `GET /api/analysis?window=...`
  - Runs filtering + peak detection + optional Groq summary.
  - Returns `bpm`, rhythm note text, AI summary, HRV metrics if available, and flags.
- `GET /api/analysis/history?range=day|week|month`
  - Returns `analysis_records` for plotting.
- `POST /api/chat`
  - Body includes a user message plus optional ECG context (`bpm`, `rhythm_note`, `sdnn_ms`, `rmssd_ms`).
  - Returns an AI response (Groq-backed when configured).
- `POST /api/reports/share`
  - Stores a snapshot and returns an ID.
- `GET /api/reports/{report_id}`
  - Retrieves a snapshot.

### 4.5 Signal processing implementation details

Filtering:

- Bandpass filter (0.5–40 Hz) and 50 Hz notch filter:
  - [backend/app/services/filters.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/services/filters.py)

Peak detection + metrics:

- The analysis uses a detrending step + `scipy.signal.find_peaks` with:
  - dynamic threshold based on signal std,
  - a minimum peak distance of ~350 ms (to reduce T-wave mis-detection),
  - prominence threshold based on signal std.
- It rejects physiologically impossible intervals (<250 ms or >2400 ms).
- HRV metrics:
  - SDNN and RMSSD are computed only if at least 3 RR intervals exist.

Relevant file:

- [backend/app/services/signal_processing.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/services/signal_processing.py)

Non-diagnostic “pattern flags”:

- Flags are descriptive (e.g., “rate above typical resting range”) and intentionally avoid diagnosing conditions.
- Implemented in: [backend/app/services/pattern_flags.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/services/pattern_flags.py)

### 4.6 AI integration (Groq)

The backend uses Groq’s OpenAI-compatible Chat Completions API:

- Endpoint used: `https://api.groq.com/openai/v1/chat/completions`
- Wrapper + output sanitization: [backend/app/services/ai_client.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/services/ai_client.py)

Two AI features:

- `explain_signal_metrics(...)`: generates a short English summary for analysis results.
- `chat_reply(...)`: answers general questions; attempts to match Bengali vs English based on the user message, and can inject “live ECG context”.

## 5) Frontend: what it contains

### 5.1 Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS + daisyUI for UI styling
- Recharts for trend plotting
- react-markdown for rich text rendering of AI messages
- html2canvas + jsPDF for PDF export

See dependencies in: [frontend/package.json](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/package.json)

### 5.2 Pages and UI layout

- Main dashboard (`/`): waveform + analysis + chat + trends
  - [frontend/app/page.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/app/page.tsx)
- Educational guide (`/education`): ECG wave anatomy + HRV explanation + hardware setup guide
  - [frontend/app/education/page.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/app/education/page.tsx)
- Shared report (`/report/[id]`): printable public snapshot page with PDF export
  - [frontend/app/report/[id]/page.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/app/report/%5Bid%5D/page.tsx)

### 5.3 Bilingual UI

UI strings are built into the app (English + Bengali) and stored in localStorage key `pulsemind_lang`:

- [frontend/lib/LanguageContext.tsx](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/lib/LanguageContext.tsx)

### 5.4 Frontend ↔ backend communication

REST client wrapper:

- [frontend/lib/api.ts](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/lib/api.ts)

WebSocket live updates:

- [frontend/lib/useEcgSocket.ts](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/lib/useEcgSocket.ts)

## 6) Hardware: what it contains

### 6.1 Sender firmware (production sketch)

- `hardware/ecg_sender/ecg_sender.ino` reads `analogRead(A0)` and POSTs batches to the backend.
- It holds AD8232 SDN pin high on D7 to keep the sensor active.
- It intentionally does not use LO+/LO- leads-off signals (the comments explain mismatch vs onboard indicator on their setup).

### 6.2 Debug sketch

- `hardware/debug_ad8232/debug_ad8232.ino` prints raw ADC values to Serial for validation.

## 7) Features provided (what you can claim in a lab report)

### 7.1 Implemented features

- Real-time ECG waveform streaming:
  - Hardware samples ECG and sends data to server.
  - Backend broadcasts to all connected clients via WebSocket.
  - Frontend renders live waveform in canvas with connection status indicators.
- ECG analysis pipeline:
  - Digital filtering (bandpass + notch) suitable for basic ECG cleanup.
  - R-peak-based BPM estimation.
  - Rhythm regularity heuristic (coefficient of variation on RR intervals).
  - HRV metrics (SDNN, RMSSD) when enough RR intervals are present.
- AI augmentation:
  - AI “summary” of the numeric results (Groq-backed).
  - Chat assistant that can answer ECG and health-education questions, optionally with live context.
- Data persistence:
  - Stores raw readings and analysis points in SQLite.
  - Stores chat history in SQLite.
- Trends:
  - Stores analysis results and plots BPM trend (day/week/month range).
- Reporting:
  - Exports a printable/PDF report of the dashboard area.
  - Creates shareable public snapshot reports with a public report URL.
- Educational UI:
  - A dedicated education page explaining ECG wave anatomy, HRV metrics, and sensor wiring.
- Language support:
  - UI toggle: English / Bengali.

### 7.2 Typical user workflow

1. Start backend (`uvicorn app.main:app ...`).
2. Start frontend (`npm run dev`).
3. Connect hardware to Wi‑Fi and point it to backend IP/port.
4. Observe waveform on dashboard.
5. Press “Analyze” to compute BPM/HRV and generate an AI summary.
6. View trend chart after repeated analyses (it only grows when analysis is run).
7. Chat with assistant (optionally uses “live context” from analysis).
8. Export PDF or generate a share link for a public snapshot report.

## 8) Setup and configuration (what is required to run)

### 8.1 Backend configuration

Environment variables (defaults exist; `.env` is optional):

- `DATABASE_URL` (default: `sqlite:///./ecg.db`)
- `GROQ_API_KEY` (required for AI features)
- `GROQ_MODEL` (default: `llama-3.1-8b-instant`)
- `FRONTEND_ORIGIN` (default: `http://localhost:3000` for CORS)

See: [backend/app/config.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/config.py), [backend/.env.example](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/.env.example)

### 8.2 Frontend configuration

Public environment variables:

- `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000`)
- `NEXT_PUBLIC_WS_URL` (default: `ws://localhost:8000/ws/ecg`)

See: [frontend/.env.local.example](file:///c:/Users/NAJIB/Desktop/ecg-project/frontend/.env.local.example)

### 8.3 Hardware configuration

You must create `hardware/ecg_sender/secrets.h` from the template and set:

- `WIFI_SSID`, `WIFI_PASSWORD`
- `SERVER_IP`, `SERVER_PORT`

Template: [hardware/ecg_sender/secrets_example.h](file:///c:/Users/NAJIB/Desktop/ecg-project/hardware/ecg_sender/secrets_example.h)

## 9) Limitations, risks, and known gaps (important for lab report discussion)

### 9.1 Medical/clinical limitations

- The project is **educational** and should not be treated as diagnostic.
- The “pattern flags” are descriptive and intentionally avoid diagnosing conditions.
- The analysis uses a simplified single-lead signal and heuristic peak detection; results can be inaccurate with noise, motion artifacts, poor electrode contact, different sampling rates, etc.

### 9.2 AI-related limitations

- AI features require a valid Groq API key; without it:
  - Analysis summary falls back to a hardcoded positive sentence.
  - Chat replies with a Bengali error string that includes the underlying error message.
- The AI analysis system prompt explicitly forces a positive/stable summary and forbids mentioning signal quality issues (see `ANALYSIS_SYSTEM_PROMPT` in [backend/app/services/ai_client.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/services/ai_client.py#L29-L37)), which limits realism and can mask problems.
- Output sanitization attempts to remove “foreign script leakage”, but cannot guarantee perfect safety or correctness.

### 9.3 Data and security limitations

- No authentication/authorization:
  - Anyone who can reach the backend can ingest data, chat, and create/read shared reports.
  - Shared reports are “public” by ID.
- No rate limiting or abuse protection on ingest/chat endpoints.
- Stored data is in a local SQLite file (`backend/ecg.db`), which is not suitable for multi-user production deployments without further work.

### 9.4 Backend logic limitations (observable in code)

- The analysis endpoint is a `GET` request but **writes** to the database (creates an `analysis_records` row). This is convenient but not REST-ideal.
- If peak detection fails (`result.bpm is None`), the backend uses a fallback `bpm_val = 72.0` before generating AI summaries and storing an analysis record (see [backend/app/routes/analysis.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/routes/analysis.py#L52-L64)). This can misrepresent “no detection” as a normal rate.
- `rhythm_note` and `analysis_records.rhythm_regularity` are effectively forced to “regular” in current implementation (see [backend/app/routes/analysis.py](file:///c:/Users/NAJIB/Desktop/ecg-project/backend/app/routes/analysis.py#L65-L88)), which reduces the usefulness of irregularity detection.
- Measurement sessions exist as a table, but ingest does not assign `session_id`, so session tracking is incomplete.

### 9.5 Frontend/UI limitations

- The waveform display is a normalization of raw ADC range over a moving window; it is for visualization, not calibrated ECG voltage scale.
- PDF export is “screenshot-based” (DOM → canvas → PDF). It may:
  - produce large files,
  - clip content if the captured area exceeds one page,
  - vary by browser rendering and fonts.
- The chat UI only fetches “live context” once on mount; it does not automatically refresh context unless the page is reloaded.

### 9.6 Repo hygiene limitations (for evaluation notes)

- Generated artifacts (`frontend/.next/`) and a full Python `venv/` are included. For formal software engineering practice, these should usually be excluded and recreated from lockfiles/requirements.

## 10) Suggested lab report angles (how to write about it)

This project supports a strong lab report narrative around:

- End-to-end IoT pipeline: sensor → MCU sampling → Wi‑Fi batching → backend ingestion → realtime WebSocket streaming → dashboard visualization.
- Digital signal processing: filtering (bandpass + notch), peak detection, BPM estimation, basic HRV metrics.
- Human-computer interaction: dashboard layout, realtime visualization, bilingual support, educational page.
- AI augmentation: converting numeric metrics into readable summaries and enabling contextual Q&A, with clear safety constraints (non-diagnostic intent).
- Software architecture: separation of concerns (hardware sender, backend services/routes/models, frontend components/hooks).

