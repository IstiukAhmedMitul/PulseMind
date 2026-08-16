"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fetchAnalysis, shareReport, type AnalysisResponse } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

export default function AnalysisPanel() {
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalysis(500);
      setAnalysis(result);
    } catch {
      setError("Could not load analysis — check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!analysis || sharing) return;
    setSharing(true);
    try {
      const report = await shareReport({
        bpm: analysis.bpm,
        sdnn_ms: analysis.sdnn_ms,
        rmssd_ms: analysis.rmssd_ms,
        rhythm_note: analysis.rhythm_note,
        ai_summary: analysis.ai_summary,
        sample_count: analysis.sample_count,
      });
      const url = `${window.location.origin}/report/${report.id}`;
      setShareUrl(url);
    } catch {
      alert("Could not generate share link.");
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-base-200/70 backdrop-blur-md border border-base-300 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-base text-emerald-400 font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> {t("aiAnalysisTitle")}
          </h2>
          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="btn btn-outline btn-emerald btn-xs hover:bg-emerald-600 hover:text-white"
              >
                {sharing ? "..." : t("shareReport")}
              </button>
            )}
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="btn btn-emerald btn-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium"
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : t("analyze")}
            </button>
          </div>
        </div>

        {error && <p className="text-error text-sm mt-2">{error}</p>}

        {!analysis && !loading && !error && (
          <p className="text-sm text-base-content/50 mt-2">
            Click the Analyze button to get live AI findings of your ECG signal.
          </p>
        )}

        {analysis && (
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-base-300/40 p-3 rounded-lg border border-emerald-500/20 text-center">
                <div className="text-xs text-base-content/60">{t("heartRate")}</div>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {analysis.bpm !== null ? `${analysis.bpm.toFixed(0)} BPM` : "—"}
                </div>
              </div>

              <div className="bg-base-300/40 p-3 rounded-lg border border-emerald-500/20 text-center">
                <div className="text-xs text-base-content/60">{t("rhythmStatus")}</div>
                <div className="text-sm font-semibold text-emerald-300 mt-2">
                  {analysis.rhythm_note}
                </div>
              </div>

              {analysis.sdnn_ms !== null && (
                <div className="bg-base-300/40 p-3 rounded-lg border border-emerald-500/20 text-center">
                  <div className="text-xs text-base-content/60">{t("sdnnHrv")}</div>
                  <div className="text-lg font-bold text-teal-300 mt-1">
                    {analysis.sdnn_ms.toFixed(1)} ms
                  </div>
                </div>
              )}

              {analysis.rmssd_ms !== null && (
                <div className="bg-base-300/40 p-3 rounded-lg border border-emerald-500/20 text-center">
                  <div className="text-xs text-base-content/60">{t("rmssdHrv")}</div>
                  <div className="text-lg font-bold text-teal-300 mt-1">
                    {analysis.rmssd_ms.toFixed(1)} ms
                  </div>
                </div>
              )}
            </div>

            <div className="bg-base-100/90 rounded-lg p-3.5 border border-base-300 text-sm prose prose-sm prose-invert max-w-none shadow-inner">
              <ReactMarkdown>{analysis.ai_summary}</ReactMarkdown>
            </div>

            {/* Share Link Modal / Banner */}
            {shareUrl && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center justify-between gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="input input-xs flex-1 bg-black/40 text-emerald-300 font-mono text-xs border border-emerald-500/30"
                />
                <button onClick={handleCopy} className="btn btn-emerald btn-xs">
                  {copied ? t("linkCopied") : t("copyLink")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}