"use client";

import React from "react";
import { Clock, Sparkles, TrendingUp, CheckCircle2, ChevronRight } from "lucide-react";
import { SlotPrediction } from "@/lib/types";

interface CrowdHeatmapGridProps {
  slots: SlotPrediction[];
  selectedSlotTime: string;
  onSelectSlot: (time: string) => void;
  loading: boolean;
}

export default function CrowdHeatmapGrid({
  slots,
  selectedSlotTime,
  onSelectSlot,
  loading,
}: CrowdHeatmapGridProps) {
  if (loading || !slots || slots.length === 0) {
    return null;
  }

  // Find lowest crowd slot for AI smart recommendation
  let optimalSlot = slots[0];
  let minCount = slots[0]?.outbound ?? 999;
  slots.forEach((s) => {
    if (s.outbound < minCount) {
      minCount = s.outbound;
      optimalSlot = s;
    }
  });

  return (
    <div className="bg-[#1f2329] rounded-3xl p-5 shadow-2xl border border-[#6B8D8A]/30 text-[#EDDECB]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-black text-[#EDDECB] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F3B763]" />
            Departure Time Crowd Timeline
          </h3>
        </div>

        {/* AI Optimal Recommendation Tag */}
        {optimalSlot && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3B763] text-[#121417] text-xs font-black shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#121417]" />
            <span>Optimal Window: {optimalSlot.slot_label.split(" (")[0]}</span>
          </div>
        )}
      </div>

      {/* Grid of 6 Slots */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {slots.map((slot) => {
          const isSelected =
            selectedSlotTime === slot.time ||
            (selectedSlotTime.startsWith(slot.time.substring(0, 2)));

          const isOptimal = optimalSlot?.slot_label === slot.slot_label;
          const pct = Math.min(100, Math.round(slot.outbound_pct * 100));

          let badgeColor = "bg-[#96BCBB]/20 text-[#96BCBB] border-[#96BCBB]/40";
          if (slot.crowd_level === "Moderate") {
            badgeColor = "bg-[#F3B763]/20 text-[#F3B763] border-[#F3B763]/40";
          } else if (slot.crowd_level === "High") {
            badgeColor = "bg-[#AF4B47]/25 text-[#AF4B47] border-[#AF4B47]/50";
          }

          return (
            <button
              key={slot.slot_label}
              onClick={() => onSelectSlot(slot.time)}
              className={`p-3.5 rounded-2xl text-left transition-all relative border-2 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "bg-[#242930] border-[#F3B763] ring-2 ring-[#F3B763]/25 shadow-xl scale-102"
                  : "bg-[#191c22] hover:bg-[#252930] border-[#6B8D8A]/25"
              }`}
            >
              {isOptimal && (
                <div className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-[#AF4B47] text-[#EDDECB] text-[9px] font-black uppercase tracking-wider shadow-md">
                  Best Time
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-[#EDDECB]">
                  {slot.slot_label.split(" (")[0]}
                </div>
                <div className="text-[10px] text-[#B5C3C4] mb-2 font-mono font-semibold">
                  Dep: {slot.time}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                    {slot.crowd_level}
                  </span>
                  <span className="text-[11px] font-mono text-[#EDDECB] font-bold">
                    {slot.outbound} passengers
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="w-full h-1.5 bg-[#14161a] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      slot.crowd_level === "Low"
                        ? "bg-[#96BCBB]"
                        : slot.crowd_level === "Moderate"
                        ? "bg-[#F3B763]"
                        : "bg-[#AF4B47]"
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
