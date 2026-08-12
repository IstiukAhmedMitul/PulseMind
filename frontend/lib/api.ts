const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface ReadingOut {
  id: number;
  received_at: string;
  esp_millis: number;
  value: number;
}

export interface FlagOut {
  code: string;
  label: string;
  description: string;
  severity: "info" | "notice";
}

export interface AnalysisResponse {
  bpm: number | null;
  rhythm_note: string;
  ai_summary: string;
  sample_count: number;
  sdnn_ms: number | null;
  rmssd_ms: number | null;
  flags: FlagOut[];
}

export interface AnalysisHistoryPoint {
  id: number;
  created_at: string;
  bpm: number | null;
  sdnn_ms: number | null;
  rmssd_ms: number | null;
  rhythm_regularity: string;
}

export interface ChatResponse {
  reply: string;
}

export interface SharedReportData {
  id: string;
  created_at: string;
  bpm: number | null;
  sdnn_ms: number | null;
  rmssd_ms: number | null;
  rhythm_note: string;
  ai_summary: string;
  sample_count: number;
}

export type HistoryRange = "day" | "week" | "month";

export async function fetchLatestReadings(limit = 500): Promise<ReadingOut[]> {
  const res = await fetch(`${API_BASE_URL}/api/readings/latest?limit=${limit}`);
  if (!res.ok) throw new Error(`fetchLatestReadings failed: ${res.status}`);
  return res.json();
}

export async function fetchAnalysis(window = 500): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE_URL}/api/analysis?window=${window}`);
  if (!res.ok) throw new Error(`fetchAnalysis failed: ${res.status}`);
  return res.json();
}

export async function fetchAnalysisHistory(range: HistoryRange = "day"): Promise<AnalysisHistoryPoint[]> {
  const res = await fetch(`${API_BASE_URL}/api/analysis/history?range=${range}`);
  if (!res.ok) throw new Error(`fetchAnalysisHistory failed: ${res.status}`);
  return res.json();
}

export async function sendChatMessage(
  message: string,
  ecg_context?: { bpm?: number | null; rhythm_note?: string; sdnn_ms?: number | null; rmssd_ms?: number | null }
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ecg_context }),
  });
  if (!res.ok) throw new Error(`sendChatMessage failed: ${res.status}`);
  return res.json();
}

export async function shareReport(payload: Partial<SharedReportData>): Promise<SharedReportData> {
  const res = await fetch(`${API_BASE_URL}/api/reports/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`shareReport failed: ${res.status}`);
  return res.json();
}

export async function fetchSharedReport(reportId: string): Promise<SharedReportData> {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}`);
  if (!res.ok) throw new Error(`fetchSharedReport failed: ${res.status}`);
  return res.json();
}