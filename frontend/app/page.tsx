"use client";

/**
 * app/page.tsx
 * ------------------------------------------------------------
 * মূল ড্যাশবোর্ড — বামে চ্যাটবট, ডানে উপরে live ECG monitor,
 * ডানে নিচে AI analysis panel।
 */

import { useEffect } from "react";
import EcgMonitor from "@/components/EcgMonitor";
import AnalysisPanel from "@/components/AnalysisPanel";
import ChatPanel from "@/components/ChatPanel";
import { useEcgSocket } from "@/lib/useEcgSocket";
import { fetchLatestReadings } from "@/lib/api";

export default function Home() {
  const { status, readings, seedReadings } = useEcgSocket();

  // পেজ প্রথম লোড হওয়ার সময় সাম্প্রতিক ঐতিহাসিক ডেটা দিয়ে buffer seed করা,
  // যাতে WebSocket থেকে নতুন ডেটা আসার আগেই একটা প্রাথমিক waveform দেখা যায়
  useEffect(() => {
    fetchLatestReadings(500)
      .then((initial) => {
        seedReadings(
          initial.map((r) => ({
            id: r.id,
            value: r.value,
            esp_millis: r.esp_millis,
            received_at: r.received_at,
          }))
        );
      })
      .catch(() => {
        // initial load ব্যর্থ হলেও WebSocket দিয়ে live ডেটা আসতে পারবে, তাই silent fail
      });
  }, [seedReadings]);

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <header className="navbar bg-base-200 border-b border-base-300 px-4">
        <div className="flex-1">
          <span className="text-lg font-bold">PulseMind</span>
          <span className="text-xs text-base-content/50 ml-2">
            Real-time ECG Monitor + AI Assistant
          </span>
        </div>
      </header>

      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* বাম প্যানেল: চ্যাটবট */}
        <div className="w-80 flex-shrink-0">
          <ChatPanel />
        </div>

        {/* ডান প্যানেল: ECG monitor (উপরে) + analysis (নিচে) */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 min-h-0">
            <EcgMonitor readings={readings} status={status} />
          </div>
          <div className="flex-shrink-0">
            <AnalysisPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
