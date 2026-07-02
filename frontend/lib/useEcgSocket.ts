/**
 * lib/useEcgSocket.ts
 * ------------------------------------------------------------
 * WebSocket কানেকশন ম্যানেজ করে (/ws/ecg), auto-reconnect সহ।
 * ব্যাকএন্ড থেকে "new_readings" মেসেজ এলে সেগুলো একটা fixed-size
 * ring buffer এ জমা রাখে, যা EcgMonitor canvas এ প্লট করবে।
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface LiveReading {
  id: number;
  value: number;
  esp_millis: number;
  received_at: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/ecg";
const MAX_BUFFER_SIZE = 1000; // canvas এ প্লট করার জন্য যথেষ্ট, মেমরি বাউন্ডেড রাখতে

export function useEcgSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [readings, setReadings] = useState<LiveReading[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_readings" && Array.isArray(data.readings)) {
          setReadings((prev) => {
            const combined = [...prev, ...data.readings];
            // ring buffer: শুরুর দিকের পুরনো readings ফেলে দেওয়া
            if (combined.length > MAX_BUFFER_SIZE) {
              return combined.slice(combined.length - MAX_BUFFER_SIZE);
            }
            return combined;
          });
        }
      } catch {
        // malformed message হলে চুপচাপ ইগনোর — সংযোগ বজায় রাখাটাই বেশি জরুরি
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      if (shouldReconnectRef.current) {
        // ৩ সেকেন্ড পর reconnect চেষ্টা
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      // onclose এমনিতেই ট্রিগার হবে এর পর, এখানে আলাদা কিছু করার দরকার নেই
      ws.close();
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  /** যখন historical readings (initial load) আসে, সেগুলো দিয়ে buffer seed করার জন্য */
  const seedReadings = useCallback((initial: LiveReading[]) => {
    setReadings((prev) => {
      if (prev.length > 0) return prev; // ইতিমধ্যে live ডেটা এসে গেলে overwrite করব না
      return initial.slice(-MAX_BUFFER_SIZE);
    });
  }, []);

  return { status, readings, seedReadings };
}
