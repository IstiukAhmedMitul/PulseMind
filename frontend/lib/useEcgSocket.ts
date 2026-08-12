import { useEffect, useRef, useState, useCallback } from "react";

export interface LiveReading {
  id: number;
  value: number;
  esp_millis: number;
  received_at: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/ecg";
const MAX_BUFFER_SIZE = 1000;

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

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_readings" && Array.isArray(data.readings)) {
          setReadings((prev) => {
            const combined = [...prev, ...data.readings];
            if (combined.length > MAX_BUFFER_SIZE) {
              return combined.slice(combined.length - MAX_BUFFER_SIZE);
            }
            return combined;
          });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      if (shouldReconnectRef.current) {
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const seedReadings = useCallback((initial: LiveReading[]) => {
    setReadings((prev) => {
      if (prev.length > 0) return prev;
      return initial.slice(-MAX_BUFFER_SIZE);
    });
  }, []);

  return { status, readings, seedReadings };
}