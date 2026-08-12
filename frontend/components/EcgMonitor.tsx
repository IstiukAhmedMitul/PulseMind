"use client";

import { useEffect, useRef } from "react";
import type { LiveReading } from "@/lib/useEcgSocket";
import { useLanguage } from "@/lib/LanguageContext";

interface EcgMonitorProps {
  readings: LiveReading[];
  status: "connecting" | "connected" | "disconnected";
}

const GRID_COLOR = "rgba(0, 255, 100, 0.12)";
const TRACE_COLOR = "#00ff66";
const BG_COLOR = "#03110a";

export default function EcgMonitor({ readings, status }: EcgMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (readings.length < 2) return;

    const visibleCount = Math.min(readings.length, Math.floor(width / 2));
    const visible = readings.slice(readings.length - visibleCount);

    const values = visible.map((r) => r.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = Math.max(maxVal - minVal, 10);

    const padding = height * 0.15;
    const plotHeight = height - padding * 2;

    ctx.strokeStyle = TRACE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = TRACE_COLOR;
    ctx.shadowBlur = 6;
    ctx.beginPath();

    visible.forEach((r, i) => {
      const x = (i / (visibleCount - 1)) * width;
      const normalized = (r.value - minVal) / range;
      const y = height - padding - normalized * plotHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [readings]);

  const statusColor =
    status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500" : "bg-rose-500";
  const statusText =
    status === "connected" ? t("liveStatus") : status === "connecting" ? t("connecting") : t("disconnected");

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-emerald-900/40 shadow-xl bg-black/40 backdrop-blur-md">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      <div className="absolute top-3 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/20">
        <span className="text-xs font-semibold text-emerald-400">{t("ecgWaveform")}</span>
      </div>

      <div className="absolute top-3 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-base-300/20">
        <span className={`inline-block w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
        <span className="text-xs text-white/90 font-medium">{statusText}</span>
      </div>

      {readings.length === 0 && status === "connected" && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
          {t("waitingData")}
        </div>
      )}
    </div>
  );
}