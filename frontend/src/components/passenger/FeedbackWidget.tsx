"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

interface FeedbackWidgetProps {
  fromStop: string;
  toStop: string;
  timeSlot: string;
}

export default function FeedbackWidget({
  fromStop,
  toStop,
  timeSlot,
}: FeedbackWidgetProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (useful: boolean) => {
    setLoading(true);
    try {
      await api.submitFeedback({
        useful,
        from_stop: fromStop,
        to_stop: toStop,
        time_slot: timeSlot,
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1f2329] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-[#6B8D8A]/30 shadow-xl text-[#EDDECB]">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-[#F3B763]/20 text-[#F3B763] flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#EDDECB]">
            Was this crowd forecast useful for your trip?
          </h4>
          <p className="text-[11px] text-[#B5C3C4] font-medium">
            Your real-world feedback refines our neural network prediction algorithms.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="flex items-center gap-1.5 text-xs text-[#96BCBB] font-bold bg-[#96BCBB]/15 border border-[#96BCBB]/30 px-3 py-1.5 rounded-xl">
          <Check className="w-3.5 h-3.5" />
          Thank you! Feedback recorded.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFeedback(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-bold border border-[#AF4B47]/50 text-xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-md"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-[#EDDECB]" />
            Yes, Helpful
          </button>
          <button
            onClick={() => handleFeedback(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#252a32] hover:bg-[#303640] text-[#B5C3C4] hover:text-[#EDDECB] border border-[#6B8D8A]/30 text-xs font-bold transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <ThumbsDown className="w-3.5 h-3.5 text-[#B5C3C4]" />
            No
          </button>
        </div>
      )}
    </div>
  );
}
