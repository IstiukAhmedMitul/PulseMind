"use client";

import { BookOpen, HeartPulse, Activity, Plug } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/LanguageContext";

export default function EducationPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {/* Banner */}
        <section className="bg-gradient-to-r from-emerald-950/60 via-base-200 to-teal-950/40 p-6 sm:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" /> {t("eduTitle")}
          </h1>
          <p className="text-sm sm:text-base text-base-content/80 mt-2 max-w-2xl">
            {t("eduSubtitle")}
          </p>
        </section>

        {/* ECG Anatomy Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <HeartPulse className="w-5 h-5" /> {t("anatomyTitle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-base-200/80 border border-emerald-500/20 p-5 rounded-xl hover:border-emerald-500/50 transition-all">
              <div className="text-emerald-400 font-extrabold text-2xl mb-1">P Wave</div>
              <p className="text-sm text-base-content/80">{t("pWave")}</p>
            </div>

            <div className="card bg-base-200/80 border border-emerald-500/30 p-5 rounded-xl hover:border-emerald-500/50 transition-all">
              <div className="text-teal-400 font-extrabold text-2xl mb-1">QRS Complex</div>
              <p className="text-sm text-base-content/80">{t("qrsComplex")}</p>
            </div>

            <div className="card bg-base-200/80 border border-emerald-500/20 p-5 rounded-xl hover:border-emerald-500/50 transition-all">
              <div className="text-cyan-400 font-extrabold text-2xl mb-1">T Wave</div>
              <p className="text-sm text-base-content/80">{t("tWave")}</p>
            </div>
          </div>
        </section>

        {/* HRV Guide */}
        <section className="bg-base-200/50 p-6 rounded-2xl border border-base-300 space-y-4">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <Activity className="w-5 h-5" /> {t("hrvGuideTitle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-bold text-base text-teal-300">SDNN (Standard Deviation of NN Intervals)</h3>
              <p className="text-sm text-base-content/80 leading-relaxed">
                {t("sdnnDesc")}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-base text-cyan-300">RMSSD (Root Mean Square of Successive Differences)</h3>
              <p className="text-sm text-base-content/80 leading-relaxed">
                {t("rmssdDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Hardware Setup Guide */}
        <section className="bg-base-200/50 p-6 rounded-2xl border border-base-300 space-y-4">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <Plug className="w-5 h-5" /> {t("sensorSetupTitle")}
          </h2>

          <div className="space-y-3">
            <p className="text-sm text-base-content/80 leading-relaxed">
              {t("sensorPlacement")}
            </p>

            <div className="overflow-x-auto">
              <table className="table table-sm w-full bg-base-300/40 rounded-lg">
                <thead>
                  <tr className="text-emerald-400">
                    <th>AD8232 Pin</th>
                    <th>ESP8266 (NodeMCU) Pin</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm">
                  <tr>
                    <td className="font-mono text-emerald-300">OUTPUT</td>
                    <td className="font-mono">A0</td>
                    <td>Analog ECG Signal Input</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-emerald-300">3.3V</td>
                    <td className="font-mono">3.3V</td>
                    <td>3.3V Power Supply</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-emerald-300">GND</td>
                    <td className="font-mono">GND</td>
                    <td>Ground Pin</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-emerald-300">SDN</td>
                    <td className="font-mono">D7 (GPIO13)</td>
                    <td>Shutdown control pin (Held HIGH for active mode)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
