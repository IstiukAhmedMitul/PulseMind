/**
 * lib/api.ts
 * ------------------------------------------------------------
 * Backend এর সাথে REST কল করার helper functions ও shared types।
 * URL গুলো .env.local থেকে আসে, hardcoded না।
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface ReadingOut {
  id: number;
  received_at: string;
  esp_millis: number;
  value: number;
}

export interface AnalysisResponse {
  bpm: number | null;
  rhythm_note: string;
  ai_summary: string;
  sample_count: number;
}

export interface ChatResponse {
  reply: string;
}

export async function fetchLatestReadings(limit = 500): Promise<ReadingOut[]> {
  const res = await fetch(`${API_BASE_URL}/api/readings/latest?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`fetchLatestReadings failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchAnalysis(window = 500): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE_URL}/api/analysis?window=${window}`);
  if (!res.ok) {
    throw new Error(`fetchAnalysis failed: ${res.status}`);
  }
  return res.json();
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`sendChatMessage failed: ${res.status}`);
  }
  return res.json();
}
