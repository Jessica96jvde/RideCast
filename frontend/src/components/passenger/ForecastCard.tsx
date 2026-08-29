"use client";

import React from "react";
import { Users, AlertTriangle, CheckCircle2, TrendingUp, Sparkles, ShieldCheck, Bus } from "lucide-react";
import { DemandPrediction } from "@/lib/types";

interface ForecastCardProps {
  prediction: DemandPrediction | null;
  fromName: string;
  toName: string;
  loading: boolean;
}

export default function ForecastCard({
  prediction,
  fromName,
  toName,
  loading,
}: ForecastCardProps) {
  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-2xl animate-pulse">
        <div className="h-6 w-1/3 bg-slate-800 rounded mb-4"></div>
        <div className="h-24 bg-slate-800/60 rounded-xl mb-4"></div>
        <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-slate-800 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
          <Bus className="w-6 h-6" />
        </div>
        <h3 className="text-slate-200 font-semibold text-sm">
          No Route Selected Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select your origin, destination, and departure window above, then click Forecast Crowd Density.
        </p>
      </div>
    );
  }

  const outboundPct = Math.min(100, Math.round(prediction.outbound_pct * 100));
  const inboundPct = Math.min(100, Math.round(prediction.inbound_pct * 100));

  // Determine badge styling
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case "Low":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          comfort: "High Seating Probability (Guaranteed Comfort)",
          progressColor: "bg-emerald-500",
        };
      case "Moderate":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          comfort: "Moderate Occupancy (Standing Room / Few Seats)",
          progressColor: "bg-amber-500",
        };
      case "High":
      default:
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          comfort: "Heavy Commuter Rush (Expect Full Standing Bus)",
          progressColor: "bg-rose-500",
        };
    }
  };

  const outBadge = getBadgeStyle(prediction.outbound_level);

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden border border-slate-700/60">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
              Service {prediction.service_id}
            </span>
            <span className="text-xs text-slate-400">
              Target: {prediction.date} @ {prediction.time_slot}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-1">
            {fromName} → {toName}
          </h3>
        </div>

        {/* Live Crowd Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${outBadge.bg}`}
        >
          {outBadge.icon}
          <span>{prediction.outbound_crowd}</span>
        </div>
      </div>

      {/* Primary Forecast Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Outbound (Selected Direction) */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              Forward Direction ({prediction.from_stop_id} → {prediction.to_stop_id})
            </span>
            <span className="font-mono text-sky-400 font-bold">{outboundPct}% Full</span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {prediction.outbound}
            </span>
            <span className="text-xs text-slate-400">
              expected passengers / 50 standard seats
            </span>
          </div>

          {/* Occupancy Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full ${outBadge.progressColor} rounded-full transition-all duration-700`}
              style={{ width: `${Math.min(100, outboundPct)}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            {outBadge.comfort}
          </p>
        </div>

        {/* Inbound (Reverse Direction) */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Reverse Direction Return Corridor
            </span>
            <span className="font-mono text-slate-300 font-bold">{inboundPct}% Full</span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-300 tracking-tight">
              {prediction.inbound}
            </span>
            <span className="text-xs text-slate-400">
              expected passengers ({prediction.inbound_crowd})
            </span>
          </div>

          {/* Occupancy Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-slate-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, inboundPct)}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-500">
            Bidirectional balancing monitored by AI dispatch.
          </p>
        </div>
      </div>

      {/* Available Services Tag list */}
      {prediction.available_services && prediction.available_services.length > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
          <span>Alternative Direct Services:</span>
          <div className="flex items-center gap-1.5">
            {prediction.available_services.map((sid) => (
              <span
                key={sid}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-semibold"
              >
                {sid}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
