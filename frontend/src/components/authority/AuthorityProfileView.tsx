"use client";

import React, { useState } from "react";
import { User, Clock, CheckSquare, Square, TrendingUp, Bus, MapPin, Shield } from "lucide-react";
import { AllocationRecord } from "@/lib/types";

interface AuthorityProfileViewProps {
  allocations: AllocationRecord[];
  loading: boolean;
}

const ROUTE_CONFIG = [
  { id: "S45", label: "Route 1 (S45)", color: "#AF4B47", origin: "Ukkadam → Saibaba Colony" },
  { id: "S57", label: "Route 2 (S57)", color: "#F3B763", origin: "Ukkadam → Saibaba Colony" },
  { id: "S33A", label: "Route 3 (S33A)", color: "#96BCBB", origin: "Gandhipuram → Kinathukadavu" },
  { id: "S48", label: "Route 4 (S48)", color: "#CA8D53", origin: "Gandhipuram → Vanthavalam" },
];

export default function AuthorityProfileView({
  allocations,
  loading,
}: AuthorityProfileViewProps) {
  // Checkbox filters for overtime allocation chart
  const [selectedRoutes, setSelectedRoutes] = useState<Record<string, boolean>>({
    S45: true,
    S57: true,
    S33A: true,
    S48: true,
  });

  const toggleRoute = (routeId: string) => {
    setSelectedRoutes((prev) => ({
      ...prev,
      [routeId]: !prev[routeId],
    }));
  };

  // Sample timeline data for the Overtime Allocation chart
  const timelineDates = ["Aug 20", "Aug 21", "Aug 22", "Aug 23", "Aug 24", "Aug 25", "Aug 26"];
  
  // Aggregate real and sample count per date per route
  const routeTrends: Record<string, number[]> = {
    S45: [1, 2, 1, 3, 2, 4, 3],
    S57: [2, 1, 3, 1, 2, 3, 2],
    S33A: [1, 1, 2, 2, 3, 1, 2],
    S48: [0, 1, 2, 1, 1, 2, 3],
  };

  const maxChartVal = 5;

  return (
    <div className="space-y-6 animate-fadeIn text-[#EDDECB] max-w-5xl mx-auto w-full">
      {/* ── 1. OFFICER PROFILE HEADER (Matching Sketch 1 Top) ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-wrap items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[#F3B763]/20 border-2 border-[#F3B763] flex items-center justify-center text-[#F3B763] shrink-0 shadow-lg shadow-[#F3B763]/20">
          <User className="w-10 h-10" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#EDDECB] font-mono tracking-wide">
              Ravi
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-black bg-[#AF4B47] text-[#EDDECB] uppercase tracking-wider">
              Transit Authority
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[#B5C3C4] font-semibold">Officer ID:</span>
              <strong className="text-[#F3B763] font-mono font-bold">TNSTC-CBE-8492</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#B5C3C4] font-semibold">Role:</span>
              <strong className="text-[#EDDECB] font-bold">Senior Transit Operations Director</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#B5C3C4] font-semibold">Division:</span>
              <strong className="text-[#EDDECB] font-bold">Coimbatore Metropolitan Transport Corporation</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#B5C3C4] font-semibold">Dispatch Authorization:</span>
              <strong className="text-emerald-400 font-bold">Level 4 (Fleet Reallocation)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. ALLOCATION HISTORY TABLE (Matching Sketch 1 Middle) ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#EDDECB] tracking-wide flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#F3B763]" />
            Allocation history:
          </h2>
          <span className="text-xs text-[#B5C3C4] font-bold font-mono bg-[#16181d] px-3 py-1 rounded-full border border-[#6B8D8A]/20">
            {allocations.length} total dispatches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                <th className="py-3 px-4 font-black uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Route</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Extra bus (bus no)</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Reallocated from (from where)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8D8A]/15">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#B5C3C4]">
                    Loading allocation audit records...
                  </td>
                </tr>
              ) : allocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#B5C3C4]">
                    No past allocation records found.
                  </td>
                </tr>
              ) : (
                allocations.map((item) => (
                  <tr key={item.id} className="hover:bg-[#252a32]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#EDDECB]">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#F3B763]">
                      <span className="px-2.5 py-1 rounded-xl bg-[#F3B763]/15 border border-[#F3B763]/30">
                        {item.service_id} — {item.route_name.split(":")[0]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-[#EDDECB] font-mono">
                      {item.bus_id} <span className="text-[#B5C3C4] font-normal">({item.bus_number})</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#B5C3C4]">
                      {item.source_depot} <span className="text-[#96BCBB] font-mono font-bold text-[11px]">({item.distance_km} km)</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. OVERTIME ALLOCATION (Matching Sketch 1 Bottom) ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[#EDDECB] tracking-wide flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#F3B763]" />
            overtime allocation
          </h2>
          <span className="text-xs text-[#B5C3C4] font-medium">
            Daily frequency of extra dispatched buses across corridors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Custom Smooth SVG Line Chart */}
          <div className="md:col-span-8 bg-[#16181d] p-5 rounded-2xl border border-[#6B8D8A]/20">
            <div className="h-56 relative w-full flex flex-col justify-between">
              {/* Y Axis labels & Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-[#B5C3C4]/60 font-mono">
                {[5, 4, 3, 2, 1, 0].map((val) => (
                  <div key={val} className="w-full flex items-center gap-2">
                    <span className="w-4 text-right">{val}</span>
                    <div className="flex-1 border-b border-[#6B8D8A]/10"></div>
                  </div>
                ))}
              </div>

              {/* SVG Lines */}
              <svg className="w-full h-full absolute inset-0 pt-2 pb-5 pl-7 pr-3 overflow-visible">
                {ROUTE_CONFIG.map((route) => {
                  if (!selectedRoutes[route.id]) return null;

                  const values = routeTrends[route.id] || [1, 2, 1, 2, 1, 2, 1];
                  const points = values
                    .map((val, idx) => {
                      const x = (idx / (timelineDates.length - 1)) * 100;
                      const y = 100 - (val / maxChartVal) * 100;
                      return `${x}%,${y}%`;
                    })
                    .join(" ");

                  return (
                    <g key={route.id}>
                      <polyline
                        fill="none"
                        stroke={route.color}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                        className="transition-all duration-300"
                      />
                      {values.map((val, idx) => {
                        const cx = `${(idx / (timelineDates.length - 1)) * 100}%`;
                        const cy = `${100 - (val / maxChartVal) * 100}%`;
                        return (
                          <circle
                            key={idx}
                            cx={cx}
                            cy={cy}
                            r="4.5"
                            fill={route.color}
                            stroke="#16181d"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>

              {/* X Axis dates */}
              <div className="absolute bottom-0 left-7 right-3 flex justify-between text-[10px] text-[#B5C3C4] font-mono font-bold">
                {timelineDates.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Route Selection Checkboxes (Matching Sketch 1 Right) */}
          <div className="md:col-span-4 bg-[#16181d] p-5 rounded-2xl border border-[#6B8D8A]/20 space-y-3">
            <h3 className="text-xs font-black text-[#EDDECB] uppercase tracking-wider border-b border-[#6B8D8A]/20 pb-2">
              Filter Routes:
            </h3>
            <div className="space-y-2.5">
              {ROUTE_CONFIG.map((route) => {
                const isChecked = !!selectedRoutes[route.id];
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => toggleRoute(route.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1f2329] hover:bg-[#252a32] border border-[#6B8D8A]/20 transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: route.color }}
                      ></div>
                      <div>
                        <div className="text-xs font-black text-[#EDDECB] group-hover:text-[#F3B763] transition-colors">
                          {route.label}
                        </div>
                        <div className="text-[10px] text-[#B5C3C4] truncate max-w-[140px]">
                          {route.origin}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isChecked ? (
                        <CheckSquare
                          className="w-4 h-4"
                          style={{ color: route.color }}
                        />
                      ) : (
                        <Square className="w-4 h-4 text-[#B5C3C4]/40" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
