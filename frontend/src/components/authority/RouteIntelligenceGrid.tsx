"use client";

import React, { useState } from "react";
import {
  Bus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send
} from "lucide-react";
import { AuthorityRouteForecast } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface RouteIntelligenceGridProps {
  routes: Record<string, AuthorityRouteForecast>;
  onOpenAllocate: (serviceId: string) => void;
  loading: boolean;
}

export default function RouteIntelligenceGrid({
  routes,
  onOpenAllocate,
  loading,
}: RouteIntelligenceGridProps) {
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({
    S45: true, // Expand first route by default
  });

  const toggleExpand = (sid: string) => {
    setExpandedRoutes((prev) => ({ ...prev, [sid]: !prev[sid] }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 h-64 animate-pulse"></div>
        ))}
      </div>
    );
  }

  const routeList = Object.values(routes);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {routeList.map((route) => {
        const isExpanded = !!expandedRoutes[route.service_id];
        const ratio = Math.round(
          (route.expected_passengers / Math.max(1, route.normal_passengers)) * 100
        );

        let badgeStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
        if (route.crowd_level === "Moderate") {
          badgeStyle = "bg-amber-500/10 border-amber-500/30 text-amber-400";
        } else if (route.crowd_level === "High") {
          badgeStyle = "bg-rose-500/10 border-rose-500/30 text-rose-400";
        }

        return (
          <div
            key={route.service_id}
            className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-800 text-sky-400 border border-slate-700">
                      Route {route.service_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
                      {route.crowd_level} {route.crowd_icon}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">
                    {route.route_name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {route.origin_name} ↔ {route.dest_name}
                  </p>
                </div>

                {/* Extra bus badge */}
                {route.buses_required > 0 ? (
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      +{route.buses_required} Extra Bus Needed
                    </span>
                  </div>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Fleet Sufficient
                  </span>
                )}
              </div>

              {/* Passenger Metrics */}
              <div className="grid grid-cols-2 gap-3 my-3 bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <div className="text-[11px] text-slate-400">Expected Ridership</div>
                  <div className="text-lg font-extrabold text-slate-100">
                    {formatNumber(route.expected_passengers)}{" "}
                    <span className="text-xs font-normal text-slate-400">passengers</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Normal Baseline</div>
                  <div className="text-lg font-extrabold text-slate-300">
                    {formatNumber(route.normal_passengers)}{" "}
                    <span className="text-xs font-normal text-slate-400">capacity</span>
                  </div>
                </div>
              </div>

              {/* Ratio bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Corridor Capacity Utilization</span>
                  <span className="font-mono font-bold text-slate-200">{ratio}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ratio > 105
                        ? "bg-rose-500"
                        : ratio > 85
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, ratio)}%` }}
                  ></div>
                </div>
              </div>

              {/* Last allocated bus snippet */}
              <div className="text-[11px] text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/50 mb-3 flex items-center justify-between">
                <span>Last Allocated Bus:</span>
                <span className="font-semibold text-slate-200 truncate ml-2">
                  {route.last_allocated_bus}
                </span>
              </div>

              {/* Explainable AI Factors Dropdown */}
              <div className="border-t border-slate-800/80 pt-2">
                <button
                  type="button"
                  onClick={() => toggleExpand(route.service_id)}
                  className="w-full flex items-center justify-between text-xs text-sky-400 hover:text-sky-300 font-semibold py-1 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Explainable AI Commuter Dynamics ({route.reasons.length} factors)
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-1.5 text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 animate-fadeIn">
                    {route.reasons.map((reason, rIdx) => (
                      <div key={rIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Confidence: <strong className="text-slate-200">94.6% LSTM</strong>
              </span>
              <button
                onClick={() => onOpenAllocate(route.service_id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                  route.buses_required > 0
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                {route.buses_required > 0 ? "Dispatch Recommended Bus" : "Manual Bus Allocation"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
