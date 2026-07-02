"use client";

/**
 * components/AnalysisPanel.tsx
 * ------------------------------------------------------------
 * প্রতি ১৫ সেকেন্ডে backend এর /api/analysis কল করে সাম্প্রতিক
 * সিগন্যাল থেকে BPM, rhythm, ও AI ব্যাখ্যা দেখায়।
 */

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { fetchAnalysis, type AnalysisResponse } from "@/lib/api";

const REFRESH_INTERVAL_MS = 15000;

export default function AnalysisPanel() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchAnalysis(500);
      setAnalysis(result);
      setError(null);
    } catch {
      setError("Analysis লোড করা যায়নি — backend চলছে কিনা চেক করো।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-base">AI বিশ্লেষণ</h2>
          {loading && <span className="loading loading-spinner loading-xs" />}
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        {analysis && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="stat p-0">
                <div className="stat-title text-xs">হার্ট রেট (BPM)</div>
                <div className="stat-value text-3xl">
                  {analysis.bpm !== null ? analysis.bpm.toFixed(0) : "—"}
                </div>
              </div>
              <div className="badge badge-outline">{analysis.rhythm_note}</div>
            </div>

            <div className="bg-base-100 rounded-lg p-3 prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{analysis.ai_summary}</ReactMarkdown>
            </div>

            <p className="text-xs text-base-content/50">
              {analysis.sample_count} টি স্যাম্পল বিশ্লেষণ করা হয়েছে · এটি একটি শিক্ষামূলক প্রজেক্ট, চিকিৎসা পরামর্শ নয়
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
