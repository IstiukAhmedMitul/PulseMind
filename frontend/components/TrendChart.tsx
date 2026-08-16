"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchAnalysisHistory, type AnalysisHistoryPoint, type HistoryRange } from "@/lib/api";

const RANGE_OPTIONS: { label: string; value: HistoryRange }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

export default function TrendChart() {
  const [range, setRange] = useState<HistoryRange>("day");
  const [data, setData] = useState<AnalysisHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (r: HistoryRange) => {
    setLoading(true);
    setError(null);
    try {
      const points = await fetchAnalysisHistory(r);
      setData(points);
    } catch {
      setError("Could not load trend history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(range);
  }, [range, loadHistory]);

  const chartData = data
    .filter((p) => p.bpm !== null)
    .map((p) => ({
      time: new Date(p.created_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      bpm: p.bpm,
    }));

  return (
    <div className="card bg-base-200/70 backdrop-blur-md border border-base-300 shadow-md">
      <div className="card-body p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="card-title text-base text-emerald-400 font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Heart Rate Trend
          </h2>
          <div className="join border border-emerald-500/20 rounded-lg p-0.5 bg-base-300/40">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`btn btn-xs join-item ${
                  range === opt.value
                    ? "btn-emerald text-white bg-emerald-600 hover:bg-emerald-700"
                    : "btn-ghost"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-base-content/50">Loading history...</p>}
        {error && <p className="text-error text-sm">{error}</p>}

        {!loading && !error && chartData.length === 0 && (
          <p className="text-sm text-base-content/50 my-4">
            No analysis history yet for this range. Click &quot;Analyze&quot; to build historical trends.
          </p>
        )}

        {!loading && !error && chartData.length > 0 && (
          <div className="h-52 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 100, 0.1)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#06130c", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}