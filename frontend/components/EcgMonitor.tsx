"use client";

/**
 * components/EcgMonitor.tsx
 * ------------------------------------------------------------
 * HTML Canvas দিয়ে monitor-style ECG waveform আঁকে। ক্লাসিক
 * hospital-monitor look: কালো ব্যাকগ্রাউন্ড, সবুজ গ্রিড, সবুজ
 * ট্রেস লাইন, sweep effect (নতুন ডেটা বামে যোগ হয়, পুরনোটা ডানে
 * সরে গিয়ে fade/erase হয়)।
 */

import { useEffect, useRef } from "react";
import type { LiveReading } from "@/lib/useEcgSocket";

interface EcgMonitorProps {
  readings: LiveReading[];
  status: "connecting" | "connected" | "disconnected";
}

const GRID_COLOR = "rgba(0, 255, 100, 0.15)";
const TRACE_COLOR = "#00ff66";
const BG_COLOR = "#03110a";

export default function EcgMonitor({ readings, status }: EcgMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // ব্যাকগ্রাউন্ড
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // গ্রিড আঁকা (monitor এর মতো)
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

    // সাম্প্রতিক N টা reading নিয়ে waveform আঁকা (স্ক্রিন প্রস্থ অনুযায়ী)
    const visibleCount = Math.min(readings.length, Math.floor(width / 2));
    const visible = readings.slice(readings.length - visibleCount);

    const values = visible.map((r) => r.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    // ADC রেঞ্জ ফ্ল্যাট হলে (সব একই ভ্যালু) division-by-zero এড়াতে margin
    const range = Math.max(maxVal - minVal, 10);

    const padding = height * 0.1;
    const plotHeight = height - padding * 2;

    ctx.strokeStyle = TRACE_COLOR;
    ctx.lineWidth = 2;
    ctx.shadowColor = TRACE_COLOR;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    visible.forEach((r, i) => {
      const x = (i / (visibleCount - 1)) * width;
      const normalized = (r.value - minVal) / range; // 0..1
      const y = height - padding - normalized * plotHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [readings]);

  const statusColor =
    status === "connected"
      ? "bg-green-500"
      : status === "connecting"
      ? "bg-yellow-500"
      : "bg-red-500";

  const statusText =
    status === "connected"
      ? "লাইভ"
      : status === "connecting"
      ? "সংযোগ হচ্ছে..."
      : "সংযোগ বিচ্ছিন্ন";

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-base-300">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
        <span className={`inline-block w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
        <span className="text-xs text-white">{statusText}</span>
      </div>
      {readings.length === 0 && status === "connected" && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
          ডেটার অপেক্ষায়... (ESP8266 থেকে ডেটা আসছে কিনা যাচাই করো)
        </div>
      )}
    </div>
  );
}
