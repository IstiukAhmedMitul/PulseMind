"use client";

import { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import EcgMonitor from "@/components/EcgMonitor";
import AnalysisPanel from "@/components/AnalysisPanel";
import ChatPanel from "@/components/ChatPanel";
import TrendChart from "@/components/TrendChart";
import { useEcgSocket } from "@/lib/useEcgSocket";
import { fetchLatestReadings } from "@/lib/api";

export default function Home() {
  const { status, readings, seedReadings } = useEcgSocket();
  const [chatOpen, setChatOpen] = useState(false);

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
      .catch(() => {});
  }, [seedReadings]);

  return (
    <div className="h-screen max-h-screen flex flex-col bg-base-100 text-base-content overflow-hidden">
      <Navbar />

      <main
        id="dashboard-report-area"
        className="flex-1 flex flex-col lg:flex-row gap-4 p-3 sm:p-4 min-h-0 overflow-y-auto lg:overflow-hidden max-w-[1600px] w-full mx-auto"
      >
        {/* Chatbot: inline sidebar on desktop only. On mobile it lives in the floating drawer below. */}
        <div className="hidden lg:flex lg:w-96 flex-shrink-0 h-full min-h-0">
          <ChatPanel />
        </div>

        {/* Main Column: Monitor on top, then Analysis, then Trend */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 lg:h-full lg:overflow-y-auto lg:pr-1">
          <div className="h-64 sm:h-72 flex-shrink-0">
            <EcgMonitor readings={readings} status={status} />
          </div>

          <div className="flex-shrink-0">
            <AnalysisPanel />
          </div>

          <div className="flex-shrink-0">
            <TrendChart />
          </div>
        </div>
      </main>

      {/* Mobile-only floating chat button */}
      <button
        onClick={() => setChatOpen(true)}
        aria-label="Open chat assistant"
        className={`lg:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/40 flex items-center justify-center transition-all duration-200 active:scale-95 ${
          chatOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Mobile-only chat drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          chatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!chatOpen}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setChatOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 h-[88vh] bg-base-100 rounded-t-2xl shadow-2xl border-t border-base-300 flex flex-col transition-transform duration-300 ease-out ${
            chatOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0">
            <span className="mx-auto h-1 w-10 rounded-full bg-base-300" />
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 px-3 pb-3">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}