"use client";

import React, { useState } from "react";
import { User, Clock, CheckSquare, Square, TrendingUp, MapPin } from "lucide-react";
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

// Helper to construct a smooth cubic bezier SVG path from points
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

function createAreaPath(points: { x: number; y: number }[], baseY: number): string {
  if (points.length < 2) return "";
  const linePath = createSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
}

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

  const [hoveredPoint, setHoveredPoint] = useState<{
    routeId: string;
    routeName: string;
    color: string;
    val: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);

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
  const baseY = 180;

  return (
    <div className="space-y-6 animate-fadeIn text-[#EDDECB] max-w-5xl mx-auto w-full">
      {/* ── 1. OFFICER PROFILE HEADER ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#F3B763]/20 border-2 border-[#F3B763] flex items-center justify-center text-[#F3B763] shrink-0 shadow-lg shadow-[#F3B763]/20">
          <User className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-[#EDDECB] font-mono tracking-wide">
            Ravi
          </h1>
          <span className="px-3.5 py-1 rounded-full text-xs font-black bg-[#AF4B47] text-[#EDDECB] uppercase tracking-wider shadow-sm">
            Transport Authority
          </span>
        </div>
      </div>

      {/* ── 2. ALLOCATION HISTORY TABLE ── */}
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
              <tr className="border-b border-[#6B8D8A]/25 text-[#B5C3C4] bg-[#16181d]">
                <th className="py-3 px-4 font-black uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Route name</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Dispatched Bus</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Source Depot</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Reason for Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8D8A]/15 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#B5C3C4]">Loading...</td>
                </tr>
              ) : (
                allocations.slice(0, 8).map((a, idx) => (
                  <tr key={idx} className="hover:bg-[#252a32]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#F3B763]">{a.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#EDDECB]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#AF4B47]/20 text-[#AF4B47] border border-[#AF4B47]/30 text-[11px] font-mono font-black">
                          Route {a.service_id.replace(/^S/i, "")}
                        </span>
                        <span>
                          {a.route_name.includes(":") ? a.route_name.split(":")[1].trim() : a.route_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-[#EDDECB]">
                      {a.bus_id}
                    </td>
                    <td className="py-3.5 px-4 text-[#B5C3C4]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#96BCBB]" />
                        {a.source_depot}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#B5C3C4] text-[11px] max-w-[260px] truncate" title={a.reason}>
                      {a.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. OVERTIME ALLOCATION (PREMIUM SMOOTH CURVE CHART) ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#EDDECB] tracking-wide flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#F3B763]" />
              Overtime Fleet Reallocation Trends
            </h2>
            <p className="text-xs text-[#B5C3C4] mt-0.5">
              Daily frequency of extra dispatched reserve buses across arterial corridors
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Custom Smooth Bézier Area Line Chart */}
          <div className="md:col-span-8 bg-[#16181d] p-6 rounded-2xl border border-[#6B8D8A]/25 relative overflow-hidden">
            {/* Hover Floating Card */}
            {hoveredPoint && (
              <div
                className="absolute top-4 right-4 z-30 px-3 py-2 rounded-xl bg-[#1f2329]/95 backdrop-blur-md border border-[#6B8D8A]/40 text-xs shadow-2xl space-y-0.5 animate-fadeIn pointer-events-none"
              >
                <div className="flex items-center gap-2 font-bold text-[#EDDECB]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: hoveredPoint.color }}
                  ></span>
                  <span>{hoveredPoint.routeName}</span>
                </div>
                <div className="text-[11px] text-[#B5C3C4]">
                  📅 {hoveredPoint.date} &nbsp;•&nbsp; <strong className="text-[#F3B763]">{hoveredPoint.val} Extra Buses Dispatched</strong>
                </div>
              </div>
            )}

            <div className="w-full relative">
              <svg viewBox="0 0 600 220" className="w-full h-auto overflow-visible select-none">
                <defs>
                  {ROUTE_CONFIG.map((route) => (
                    <linearGradient
                      key={`grad-${route.id}`}
                      id={`grad-${route.id}`}
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={route.color} stopOpacity="0.28" />
                      <stop offset="85%" stopColor={route.color} stopOpacity="0.03" />
                      <stop offset="100%" stopColor={route.color} stopOpacity="0.0" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Horizontal Grid lines & Y Axis labels */}
                {[5, 4, 3, 2, 1, 0].map((val) => {
                  const y = 20 + (1 - val / maxChartVal) * 160;
                  return (
                    <g key={val}>
                      <text
                        x="30"
                        y={y + 4}
                        textAnchor="end"
                        className="text-[11px] fill-[#B5C3C4]/60 font-mono font-bold"
                      >
                        {val}
                      </text>
                      <line
                        x1="45"
                        y1={y}
                        x2="575"
                        y2={y}
                        stroke="#6B8D8A"
                        strokeOpacity="0.12"
                        strokeDasharray={val === 0 ? "none" : "4,4"}
                        strokeWidth={val === 0 ? "1.5" : "1"}
                      />
                    </g>
                  );
                })}

                {/* X Axis dates */}
                {timelineDates.map((d, idx) => {
                  const x = 45 + (idx / (timelineDates.length - 1)) * 530;
                  return (
                    <text
                      key={d}
                      x={x}
                      y="208"
                      textAnchor="middle"
                      className="text-[11px] fill-[#B5C3C4] font-mono font-bold"
                    >
                      {d}
                    </text>
                  );
                })}

                {/* Smooth Bézier Curves with Soft Glowing Area Gradients */}
                {ROUTE_CONFIG.map((route) => {
                  if (!selectedRoutes[route.id]) return null;

                  const values = routeTrends[route.id] || [1, 2, 1, 2, 1, 2, 1];
                  const numericPoints = values.map((val, idx) => {
                    const x = 45 + (idx / (timelineDates.length - 1)) * 530;
                    const y = 20 + (1 - val / maxChartVal) * 160;
                    return { x, y, val, date: timelineDates[idx] };
                  });

                  const smoothPath = createSmoothPath(numericPoints);
                  const areaPath = createAreaPath(numericPoints, baseY);

                  return (
                    <g key={route.id} className="transition-all duration-300">
                      {/* 1. Gradient Area Under the Curve */}
                      <path d={areaPath} fill={`url(#grad-${route.id})`} />

                      {/* 2. Glowing Halo underlay along the curve */}
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke={route.color}
                        strokeWidth="8"
                        strokeOpacity="0.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* 3. High-Contrast Crisp Core Curve */}
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke={route.color}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* 4. Interactive Data Point Circles */}
                      {numericPoints.map((p, idx) => (
                        <g
                          key={idx}
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            setHoveredPoint({
                              routeId: route.id,
                              routeName: route.label,
                              color: route.color,
                              val: p.val,
                              date: p.date,
                              x: p.x,
                              y: p.y,
                            })
                          }
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="6"
                            fill={route.color}
                            stroke="#16181d"
                            strokeWidth="2.5"
                            className="transition-all duration-200 hover:scale-150"
                          />
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right: Route Selection Checkboxes */}
          <div className="md:col-span-4 bg-[#16181d] p-5 rounded-2xl border border-[#6B8D8A]/20 space-y-3">
            <div className="border-b border-[#6B8D8A]/20 pb-2">
              <h3 className="text-xs font-black text-[#EDDECB] uppercase tracking-wider">
                Corridor Filters:
              </h3>
            </div>

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
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
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
                        <CheckSquare className="w-4 h-4" style={{ color: route.color }} />
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
