"use client";

/**
 * components/ChatPanel.tsx
 * ------------------------------------------------------------
 * বেসিক মেডিকেল Q&A চ্যাটবট UI। প্রতিটা মেসেজ backend এর
 * /api/chat এ পাঠানো হয়, রিপ্লাই মেসেজ লিস্টে যোগ হয়।
 */

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendChatMessage } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "হ্যালো! আমি একটা বেসিক মেডিকেল তথ্য সহকারী। ECG বা সাধারণ স্বাস্থ্য বিষয়ে প্রশ্ন করতে পারো। (এটি একটি শিক্ষামূলক প্রজেক্ট — চিকিৎসা পরামর্শের বিকল্প নয়)",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await sendChatMessage(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "দুঃখিত, উত্তর পাঠানো যায়নি। backend চলছে কিনা চেক করো।" },
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
    <div className="flex flex-col h-full bg-base-200 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-base-300">
        <h2 className="font-semibold text-sm">মেডিকেল সহকারী চ্যাটবট</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
            <div
              className={`chat-bubble text-sm prose prose-sm prose-invert max-w-none ${
                msg.role === "user" ? "chat-bubble-primary" : "chat-bubble-neutral"
              }`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat chat-start">
            <div className="chat-bubble chat-bubble-neutral">
              <span className="loading loading-dots loading-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-base-300 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="প্রশ্ন লিখো..."
          className="input input-bordered input-sm flex-1"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="btn btn-primary btn-sm"
        >
          পাঠাও
        </button>
      </div>
    </div>
  );
}
