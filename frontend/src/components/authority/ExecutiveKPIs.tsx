"use client";

import React from "react";
import { Users, Bus, Gauge, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import { AuthorityKPIs } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface ExecutiveKPIsProps {
  kpis: AuthorityKPIs;
  loading: boolean;
}

export default function ExecutiveKPIs({ kpis, loading }: ExecutiveKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-4 animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  const items = [
    {
      title: "Expected Ridership",
      value: formatNumber(kpis.total_expected_passengers),
      subtitle: `vs ${formatNumber(kpis.total_normal_capacity)} normal cap.`,
      icon: <Users className="w-4 h-4 text-sky-400" />,
      color: "border-sky-500/20 bg-sky-500/5",
    },
    {
      title: "Network Load Ratio",
      value: `${kpis.crowd_ratio_pct}%`,
      subtitle: kpis.crowd_ratio_pct > 105 ? "High Congestion" : "Optimal Corridor Flow",
      icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
      color: kpis.crowd_ratio_pct > 105 ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5",
    },
    {
      title: "Smart Extra Buses",
      value: `${kpis.total_extra_buses_required} Units`,
      subtitle: "AI recommended allocation",
      icon: <Bus className="w-4 h-4 text-rose-400" />,
      color: "border-rose-500/20 bg-rose-500/5",
    },
    {
      title: "LSTM Confidence",
      value: `${kpis.model_confidence_score}%`,
      subtitle: "Historical sequence accuracy",
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      color: "border-emerald-500/20 bg-emerald-500/5",
    },
    {
      title: "Idle Fleet Ready",
      value: `${kpis.fleet_idle} Buses`,
      subtitle: "Available across 5 depots",
      icon: <CheckCircle2 className="w-4 h-4 text-sky-400" />,
      color: "border-sky-500/20 bg-sky-500/5",
    },
    {
      title: "Active Dispatched",
      value: `${kpis.fleet_allocated} Buses`,
      subtitle: `Out of ${kpis.fleet_total} total fleet`,
      icon: <Gauge className="w-4 h-4 text-amber-400" />,
      color: "border-amber-500/20 bg-amber-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`glass-panel rounded-xl p-4 border transition-all ${item.color} hover:border-slate-600`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">{item.title}</span>
            {item.icon}
          </div>
          <div className="text-xl font-black text-slate-100 tracking-tight">
            {item.value}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {item.subtitle}
          </div>
        </div>
      ))}
    </div>
  );
}
