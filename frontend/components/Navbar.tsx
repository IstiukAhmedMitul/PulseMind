"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { generatePdfReport } from "@/lib/pdfGenerator";

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="navbar bg-base-200/80 backdrop-blur-md border-b border-base-300 px-6 py-3 sticky top-0 z-50">
      <div className="flex-1 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-emerald-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          {t("appName")}
        </Link>
        <span className="hidden sm:inline text-xs text-base-content/60 border-l border-base-300 pl-3">
          {t("appSubtitle")}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-2 mr-2">
          <Link
            href="/"
            className="btn btn-ghost btn-sm text-sm hover:text-emerald-400 transition-colors"
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/education"
            className="btn btn-ghost btn-sm text-sm hover:text-emerald-400 transition-colors"
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
          className="btn btn-emerald btn-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-md shadow-emerald-950/30"
        >
          <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t("exportPdf")}
        </button>
      </div>
    </header>
  );
}
