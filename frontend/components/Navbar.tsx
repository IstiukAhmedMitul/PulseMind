"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { generatePdfReport } from "@/lib/pdfGenerator";

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="bg-base-200/80 backdrop-blur-md border-b border-base-300 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Link href="/" className="flex items-center gap-2 text-base sm:text-xl font-extrabold tracking-tight text-emerald-400 shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          {t("appName")}
        </Link>
        <span className="hidden md:inline text-xs text-base-content/60 border-l border-base-300 pl-3 truncate">
          {t("appSubtitle")}
        </span>
      </div>

      <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-3">
        <nav className="flex items-center gap-1 sm:gap-2 sm:mr-2">
          <Link
            href="/"
            className="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm hover:text-emerald-400 transition-colors"
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/education"
            className="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm hover:text-emerald-400 transition-colors"
          >
            {t("education")}
          </Link>
        </nav>

        {/* Language Switcher */}
        <div className="join border border-emerald-500/30 rounded-lg p-0.5 bg-base-300/40">
          <button
            onClick={() => setLang("en")}
            className={`join-item btn btn-xs px-2.5 ${
              lang === "en" ? "btn-emerald text-white bg-emerald-600 hover:bg-emerald-700" : "btn-ghost"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("bn")}
            className={`join-item btn btn-xs px-2.5 ${
              lang === "bn" ? "btn-emerald text-white bg-emerald-600 hover:bg-emerald-700" : "btn-ghost"
            }`}
          >
            বাং
          </button>
        </div>

        {/* PDF Export Button */}
        <button
          onClick={() => generatePdfReport("dashboard-report-area", "PulseMind_ECG_Report.pdf")}
          aria-label={t("exportPdf")}
          className="btn btn-emerald btn-xs sm:btn-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-md shadow-emerald-950/30"
        >
          <Download className="w-4 h-4 sm:mr-1 inline" />
          <span className="hidden sm:inline">{t("exportPdf")}</span>
        </button>
      </div>
    </header>
  );
}
