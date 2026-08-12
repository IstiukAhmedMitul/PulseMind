"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import EcgMonitor from "@/components/EcgMonitor";
import AnalysisPanel from "@/components/AnalysisPanel";
import ChatPanel from "@/components/ChatPanel";
import TrendChart from "@/components/TrendChart";
import { useEcgSocket } from "@/lib/useEcgSocket";
import { fetchLatestReadings } from "@/lib/api";

export default function Home() {
  const { status, readings, seedReadings } = useEcgSocket();

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
        className="flex-1 flex flex-col lg:flex-row gap-4 p-3 sm:p-4 min-h-0 overflow-hidden max-w-[1600px] w-full mx-auto"
      >
        {/* Left Sidebar Chatbot */}
        <div className="w-full lg:w-96 flex-shrink-0 h-[450px] lg:h-full min-h-0">
          <ChatPanel />
        </div>

        {/* Right Main Column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 min-h-0">
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
    </div>
  );
}