# PulseMind ECG Monitoring System

PulseMind is an educational, full-stack **IoT-based ECG monitoring + AI health assistant** project. It combines:

- **Hardware** (ESP32/ESP8266 + AD8232) to acquire a single-lead ECG waveform and send batches over Wi‑Fi
- **Backend** (FastAPI) to store samples, stream them in real time via WebSocket, run signal processing, and generate shareable reports
- **Frontend** (Next.js) to visualize the live ECG waveform, run analysis (BPM/HRV), chat with an assistant, view trends, and export/share reports

This project is explicitly **not a medical diagnostic system**. The analysis and AI outputs are intended to be descriptive and educational only.

## Figures

Figure 1. Block diagram of the proposed IoT-based ECG monitoring system
![Figure 1. Block diagram of the proposed IoT-based ECG monitoring system](figures/Figure%204.%20Block%20diagram%20of%20the%20proposed%20IoT-based%20ECG%20monitoring%20system.png)

Figure 2. Hardware implementation of the ECG monitoring system using ESP32 and AD8232
![Figure 2. Hardware implementation of the ECG monitoring system using ESP32 and AD8232](figures/Figure%201.%20Hardware%20implementation%20of%20the%20ECG%20monitoring%20system%20using%20ESP32%20and%20AD8232..png)

Figure 3. Three-electrode placement used for ECG signal acquisition
![Figure 3. Three-electrode placement used for ECG signal acquisition](figures/Figure%202.%20Three-electrode%20placement%20used%20for%20ECG%20signal%20acquisition..png)

Figure 4. Real-time ECG monitoring interface displaying ECG waveform and heart rate analysis with chat
![Figure 4. Real-time ECG monitoring interface displaying ECG waveform and heart rate analysis with chat](figures/Figure%203.%20Real-time%20ECG%20monitoring%20interface%20displaying%20ECG%20waveform%20and%20heart%20rate%20analysis.%20with%20chat.png)

## Key Features

- Real-time ECG waveform monitoring via WebSocket streaming
- ECG analysis pipeline: filtering, peak detection, BPM estimation, rhythm regularity heuristic, HRV (SDNN/RMSSD when available)
- AI augmentation (Groq-backed): analysis summaries + ECG/health-education chat assistant
- Trend chart from stored analysis records (day/week/month)
- Shareable public report snapshots + printable/PDF export
- Educational page (ECG basics + HRV + wiring)
- Bilingual UI: English / Bengali
- Fully responsive dashboard: side-by-side layout on desktop; on mobile the ECG monitor, AI analysis, and trend chart stack vertically while the chat assistant collapses into a floating action button that opens a bottom-sheet drawer
- Clean, icon-based UI built with [lucide-react](https://lucide.dev/) (no emoji)

## System Architecture (data flow)

1. **Hardware** samples ECG from AD8232 (analog input) and sends **JSON batches** to the backend.
2. **Backend** stores samples in SQLite, and broadcasts new samples to clients via WebSocket.
3. **Analysis** endpoint fetches the latest window, filters the signal, detects peaks, estimates BPM/HRV, generates descriptive flags, and optionally produces an AI summary.
4. **Frontend** renders the waveform, analysis, trends, chat assistant, and report export/share controls.

## Tech Stack

- Frontend: Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, daisyUI, Recharts, react-markdown, lucide-react, html2canvas + jsPDF (PDF export)
- Backend: FastAPI, SQLAlchemy, Pydantic, SQLite, numpy, scipy, websockets, httpx
- Hardware: ESP32/ESP8266/NodeMCU + AD8232 ECG sensor module

## Project Structure

```text
backend/
  app/
    main.py           FastAPI entry point
    config.py         Environment settings
    database.py       Database setup
    models.py         SQLAlchemy models
    schemas.py        Pydantic request/response models
    routes/           API routes (ingest, readings, analysis, chat, reports)
    services/         Signal processing, filters, AI client, pattern flags
frontend/
  app/               Next.js pages and layout
  components/        Dashboard panels and UI widgets
  lib/               API client, WebSocket hook, PDF export, language context
hardware/
  ecg_sender/        ESP firmware that sends ECG batches to the backend
  debug_ad8232/      Serial test sketch for the sensor
```

## API Endpoints (backend)

- `GET /health` service health check
- `POST /api/data` ingest a batch of ECG readings
- `GET /api/readings/latest?limit=...` fetch recent samples
- `GET /ws/ecg` WebSocket stream for live ECG updates
- `GET /api/analysis?window=...` run ECG analysis for the latest window
- `GET /api/analysis/history?range=day|week|month` retrieve historical analysis points
- `POST /api/chat` chat with optional ECG context
- `POST /api/reports/share` create a public shareable report snapshot
- `GET /api/reports/{report_id}` fetch a shared report snapshot

## Setup

### 1) Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Optional `backend/.env` overrides:

```env
DATABASE_URL=sqlite:///./ecg.db
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
FRONTEND_ORIGIN=http://localhost:3000
```

Run the API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional frontend environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/ecg
```

### 3) Hardware (AD8232 wiring + firmware)

1. Upload the sketch in `hardware/ecg_sender/` to your board.
2. Create `hardware/ecg_sender/secrets.h` from `secrets_example.h` and set Wi‑Fi + backend IP/port.
3. Ensure the backend is reachable from the device network.

Typical wiring (board pin naming may vary between ESP8266 vs ESP32):

- AD8232 `OUTPUT` -> MCU ADC pin (e.g., ESP8266 `A0`)
- AD8232 `3.3V` -> MCU `3.3V`
- AD8232 `GND` -> MCU `GND`
- AD8232 `SDN` -> MCU GPIO (kept HIGH to enable)

## Limitations (important for reports)

- Educational/non-clinical: results can be inaccurate with noise, motion artifacts, or poor electrode contact.
- AI features require a valid Groq API key; without it, summaries/chat may fall back.
- No authentication/authorization or rate limiting: do not expose the backend publicly without adding protections.

## Contributors

- Md Najib Ul Azam Mahi - https://github.com/najibulazam
- Md. Istiuk Ahmed Mitul - https://github.com/IstiukAhmedMitul
- Md Ruhul Amin Maruf - https://github.com/marufhasan-122
