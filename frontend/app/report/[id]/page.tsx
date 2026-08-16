"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/Navbar";
import { fetchSharedReport, type SharedReportData } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { generatePdfReport } from "@/lib/pdfGenerator";

export default function SharedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t } = useLanguage();
  const [report, setReport] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedReport(resolvedParams.id)
      .then((data) => setReport(data))
      .catch(() => setError("Report not found or has expired."))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="btn btn-ghost btn-sm text-emerald-400 gap-1">
            <ArrowLeft className="w-4 h-4" /> {t("backToDashboard")}
          </Link>
          {report && (
            <button
              onClick={() => generatePdfReport("share-report-printable", `ECG_Report_${report.id}.pdf`)}
              className="btn btn-emerald btn-sm bg-emerald-600 text-white gap-1"
            >
              <Download className="w-4 h-4" /> {t("exportPdf")}
            </button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center p-12">
            <span className="loading loading-spinner loading-lg text-emerald-400" />
          </div>
        )}

        {error && (
          <div className="alert alert-error shadow-lg">
            <span>{error}</span>
          </div>
        )}

        {report && (
          <div
            id="share-report-printable"
            className="bg-base-200/90 border border-emerald-500/30 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6"
          >
            <div className="border-b border-base-300 pb-4 flex justify-between items-start flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-extrabold text-emerald-400">{t("sharedReportTitle")}</h1>
                <p className="text-xs text-base-content/60">{t("sharedReportSub")}</p>
              </div>
              <div className="text-right">
                <span className="badge badge-emerald badge-outline font-mono text-xs">{report.id}</span>
                <p className="text-[11px] text-base-content/50 mt-1">
                  {t("generatedAt")}: {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Vitals Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-base-300/40 p-4 rounded-xl text-center border border-emerald-500/20">
                <div className="text-xs text-base-content/60">{t("heartRate")}</div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                  {report.bpm !== null ? `${report.bpm.toFixed(0)} BPM` : "—"}
                </div>
              </div>

              <div className="bg-base-300/40 p-4 rounded-xl text-center border border-emerald-500/20">
                <div className="text-xs text-base-content/60">{t("rhythmStatus")}</div>
                <div className="text-sm font-semibold text-emerald-300 mt-2">
                  {report.rhythm_note}
                </div>
              </div>

              {report.sdnn_ms !== null && (
                <div className="bg-base-300/40 p-4 rounded-xl text-center border border-emerald-500/20">
                  <div className="text-xs text-base-content/60">{t("sdnnHrv")}</div>
                  <div className="text-xl font-bold text-teal-300 mt-1">
                    {report.sdnn_ms.toFixed(1)} ms
                  </div>
                </div>
              )}

              {report.rmssd_ms !== null && (
                <div className="bg-base-300/40 p-4 rounded-xl text-center border border-emerald-500/20">
                  <div className="text-xs text-base-content/60">{t("rmssdHrv")}</div>
                  <div className="text-xl font-bold text-teal-300 mt-1">
                    {report.rmssd_ms.toFixed(1)} ms
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary */}
            <div className="space-y-2">
              <h2 className="font-bold text-emerald-400 text-sm">{t("aiAnalysisTitle")}</h2>
              <div className="bg-base-100/90 rounded-xl p-4 border border-base-300 text-sm prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{report.ai_summary}</ReactMarkdown>
              </div>
            </div>

            <div className="text-center text-xs text-base-content/40 pt-4 border-t border-base-300">
              PulseMind Educational Project · {report.sample_count} Samples Analyzed
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
