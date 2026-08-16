"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendChatMessage, fetchAnalysis, type AnalysisResponse } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am PulseMind AI, your educational ECG assistant. Ask me about your heart rate, ECG waves, or general health topics.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liveContext, setLiveContext] = useState<AnalysisResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial analysis for context
    fetchAnalysis(500).then((data) => setLiveContext(data)).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const ecgContext = liveContext
        ? {
            bpm: liveContext.bpm,
            rhythm_note: liveContext.rhythm_note,
            sdnn_ms: liveContext.sdnn_ms,
            rmssd_ms: liveContext.rmssd_ms,
          }
        : undefined;

      const res = await sendChatMessage(trimmed, ecgContext);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not send message. Check if backend is running." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-base-200/60 backdrop-blur-md rounded-xl overflow-hidden border border-base-300 shadow-md">
      <div className="p-3 border-b border-base-300 flex items-center justify-between bg-base-300/30 flex-shrink-0">
        <h2 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
          <Bot className="w-4 h-4" /> {t("chatTitle")}
        </h2>
        {liveContext && (
          <span className="badge badge-emerald badge-xs py-1 px-2 text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" /> {t("liveContextBadge")}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
            <div
              className={`chat-bubble text-sm prose prose-sm prose-invert max-w-none shadow-sm ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-base-300/90 text-base-content border border-base-100"
              }`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat chat-start">
            <div className="chat-bubble bg-base-300">
              <span className="loading loading-dots loading-sm text-emerald-400" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-base-300 flex gap-2 bg-base-300/20 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chatPlaceholder")}
          className="input input-bordered input-sm flex-1 bg-base-100/80 focus:border-emerald-500"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="btn btn-emerald btn-sm bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {t("chatSend")}
        </button>
      </div>
    </div>
  );
}