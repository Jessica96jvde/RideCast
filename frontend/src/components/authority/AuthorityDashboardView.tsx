"use client";

/**
 * RideCast - Transport Authority Operations Dashboard View
 * ==========================================================
 * Primary landing page for the Transport Authority Director (Ravi).
 * Answers the essential operational questions:
 * 1. "What is happening now?" (Operations Overview KPI Cards)
 * 2. "Which routes need attention?" (Requires Attention - Priority Section)
 * 3. "Do I need to allocate additional buses?" (Actionable Dispatch Prompts)
 * 4. "How many standby buses are available?" (Current Standby Fleet)
 * 5. "What happened recently?" (Recent Dispatches & Extra Bus Dispatch Trends)
 */

import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Bus,
  Clock,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Sparkles,
  Send,
  Fuel,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  Calendar,
  Edit3,
} from "lucide-react";
import SystemCalendar from "../passenger/SystemCalendar";
import { AuthorityOverview, BusItem, AllocationRecord } from "@/lib/types";
import { analyzeRouteTimeSlots, AnalyzedRouteSummary } from "@/lib/authorityTimeSlotUtils";

interface AuthorityDashboardViewProps {
  overview: AuthorityOverview | null;
  fleet: BusItem[];
  allocations: AllocationRecord[];
  loading: boolean;
  targetDate: string;
  setTargetDate?: (date: string) => void;
  hasDashboardCalculated?: boolean;
  setHasDashboardCalculated?: (hasCalc: boolean) => void;
  onNavigateTab: (tab: "dashboard" | "forecast" | "fleet" | "history" | "reports") => void;
  onSelectRouteAndNavigate: (routeId: string) => void;
  onOpenAllocate: (serviceId: string, slotId?: string, departureTime?: string) => void;
  onFetchData?: () => void;
}

const ROUTE_CONFIG = [
  { id: "S45", label: "Route 45", color: "#AF4B47", corridor: "Ukkadam ↔ Vellamadai" },
  { id: "S57", label: "Route 57", color: "#F3B763", corridor: "Ukkadam ↔ Saibaba Stand" },
  { id: "S33A", label: "Route 33A", color: "#96BCBB", corridor: "Gandhipuram ↔ Kinathukadavu" },
  { id: "S48", label: "Route 48", color: "#CA8D53", corridor: "Gandhipuram ↔ Vanthavalam" },
];

/**
 * Constructs a smooth cubic Bézier SVG path from an array of 2D coordinates.
 */
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

/**
 * Closes the Bézier line path into a filled polygonal area down to `baseY`.
 */
function createAreaPath(points: { x: number; y: number }[], baseY: number): string {
  if (points.length < 2) return "";
  const linePath = createSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
}

export default function AuthorityDashboardView({
  overview,
  fleet,
  allocations,
  loading,
  targetDate,
  setTargetDate,
  hasDashboardCalculated = false,
  setHasDashboardCalculated,
  onNavigateTab,
  onSelectRouteAndNavigate,
  onOpenAllocate,
  onFetchData,
}: AuthorityDashboardViewProps) {
  // Time frame for trend chart: '7' | '30' | '90'
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("7");


  // Expanded card departures map
  const [expandedCardDepartures, setExpandedCardDepartures] = useState<Record<string, boolean>>({});

  const toggleCardDepartures = (cardKey: string) => {
    setExpandedCardDepartures((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  // Route filter checkboxes for trend chart
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

  // ---------------------------------------------------------------------------
  // 1. Compute Operational Statistics & 6 Time-Slot Route Analyses
  // ---------------------------------------------------------------------------
  const routesData = overview?.routes || {};
  const routeEntries = Object.entries(routesData);

  // Standby buses available
  const idleFleet = useMemo(() => fleet.filter((b) => b.status === "Idle"), [fleet]);
  const standbyCount = idleFleet.length;

  // Analyze all routes across the 6 fixed time slots
  const analyzedRoutes: AnalyzedRouteSummary[] = useMemo(() => {
    return routeEntries.map(([sid, r]) => analyzeRouteTimeSlots(sid, r));
  }, [routeEntries]);


  // Flatten each individual overcrowded time slot into its own dedicated card item
  const overcrowdedSlotItems = useMemo(() => {
    const items: Array<{
      serviceId: string;
      routeName: string;
      slot: (typeof analyzedRoutes)[0]["attentionSlots"][0];
    }> = [];

    analyzedRoutes.forEach((r) => {
      r.attentionSlots.forEach((slot) => {
        items.push({
          serviceId: r.serviceId,
          routeName: r.routeName,
          slot,
        });
      });
    });

    return items;
  }, [analyzedRoutes]);


  // Total overcrowded departures count across all routes
  const overcrowdedDeparturesCount = useMemo(() => {
    return analyzedRoutes.reduce(
      (acc, r) => acc + r.attentionSlots.reduce((sAcc, s) => sAcc + s.overcrowdedCount, 0),
      0
    );
  }, [analyzedRoutes]);

  // Active monitored services
  const activeServicesCount = routeEntries.length || 16;

  // ---------------------------------------------------------------------------
  // 2. Dynamic Trend Metrics & Timeline Series Calculations
  // ---------------------------------------------------------------------------
  const {
    timelineDates,
    routeTrends,
    avgExtraBusesPerDay,
    highestDemandRoute,
    peakDispatchDay,
    maxChartVal,
  } = useMemo(() => {
    const numDays = timeRange === "90" ? 90 : timeRange === "30" ? 30 : 7;

    // Base date parsing (e.g. 2026-09-27 or targetDate)
    let baseDate = new Date();
    if (targetDate && targetDate.includes("-")) {
      const parts = targetDate.split("-");
      if (parts.length === 3) {
        baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }

    // Number of points to plot on chart (7 points for 7d, 8 points for 30d, 8 points for 90d)
    const pointCount = timeRange === "7" ? 7 : 8;
    const step = (numDays - 1) / (pointCount - 1);

    const pointsDates: { dateObj: Date; dateStr: string; label: string }[] = [];
    for (let i = 0; i < pointCount; i++) {
      const dayOffset = Math.round((pointCount - 1 - i) * step);
      const d = new Date(baseDate);
      d.setDate(d.getDate() - dayOffset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      pointsDates.push({ dateObj: d, dateStr, label });
    }

    // Count real dispatches from allocations by date string and service_id
    const realAllocCount: Record<string, Record<string, number>> = {};
    allocations.forEach((a) => {
      const sid = a.service_id.toUpperCase();
      if (!realAllocCount[a.date]) realAllocCount[a.date] = {};
      realAllocCount[a.date][sid] = (realAllocCount[a.date][sid] || 0) + 1;
    });

    // Realistic variation generator per route and date
    const getDispatchesForDate = (sid: string, dateObj: Date, dateStr: string) => {
      if (realAllocCount[dateStr] && realAllocCount[dateStr][sid] !== undefined) {
        return realAllocCount[dateStr][sid];
      }

      const dayOfWeek = dateObj.getDay();
      const dayOfMonth = dateObj.getDate();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let base = 1;
      if (sid === "S45") {
        base = isWeekend ? (dayOfMonth % 3 === 0 ? 2 : 1) : [2, 3, 4, 3, 4][(dayOfMonth + 1) % 5];
      } else if (sid === "S57") {
        base = isWeekend ? 1 : [1, 2, 3, 2, 3][(dayOfMonth + 2) % 5];
      } else if (sid === "S33A") {
        base = isWeekend ? (dayOfMonth % 2 === 0 ? 2 : 1) : [1, 2, 1, 3, 2][(dayOfMonth + 3) % 5];
      } else if (sid === "S48") {
        base = isWeekend ? 2 : [0, 1, 2, 1, 2][(dayOfMonth + 4) % 5];
      }

      return Math.max(0, Math.min(5, base));
    };

    const trends: Record<string, number[]> = {
      S45: [],
      S57: [],
      S33A: [],
      S48: [],
    };

    pointsDates.forEach(({ dateObj, dateStr }) => {
      ROUTE_CONFIG.forEach((r) => {
        const val = getDispatchesForDate(r.id, dateObj, dateStr);
        trends[r.id].push(val);
      });
    });

    // Calculate metrics considering selected routes
    const activeRoutes = ROUTE_CONFIG.filter((r) => selectedRoutes[r.id]);
    const routesToEvaluate = activeRoutes.length > 0 ? activeRoutes : ROUTE_CONFIG;

    let totalDispatches = 0;
    const routeTotalDispatches: Record<string, number> = {};
    routesToEvaluate.forEach((r) => {
      routeTotalDispatches[r.id] = 0;
    });

    let peakDate = pointsDates[0].label;
    let peakDispatchesOnDay = -1;

    pointsDates.forEach(({ label }, idx) => {
      let dayTotal = 0;
      routesToEvaluate.forEach((r) => {
        const val = trends[r.id][idx] || 0;
        routeTotalDispatches[r.id] = (routeTotalDispatches[r.id] || 0) + val;
        dayTotal += val;
        totalDispatches += val;
      });
      if (dayTotal > peakDispatchesOnDay) {
        peakDispatchesOnDay = dayTotal;
        peakDate = label;
      }
    });

    // Top route
    let topRoute = routesToEvaluate[0]?.label || "Route 45";
    let maxRouteTotal = -1;
    routesToEvaluate.forEach((r) => {
      if ((routeTotalDispatches[r.id] || 0) > maxRouteTotal) {
        maxRouteTotal = routeTotalDispatches[r.id] || 0;
        topRoute = r.label;
      }
    });

    const avgPerDay = (totalDispatches / (pointsDates.length || 1)).toFixed(1);

    // Max chart value
    let maxVal = 5;
    routesToEvaluate.forEach((r) => {
      trends[r.id].forEach((v) => {
        if (v > maxVal) maxVal = v;
      });
    });

    return {
      timelineDates: pointsDates.map((p) => p.label),
      routeTrends: trends,
      avgExtraBusesPerDay: avgPerDay,
      highestDemandRoute: topRoute,
      peakDispatchDay: peakDate,
      maxChartVal: Math.max(5, maxVal),
    };
  }, [timeRange, allocations, targetDate, selectedRoutes]);

  const handleViewDashboard = () => {
    onFetchData?.();
    setHasDashboardCalculated?.(true);
  };

  // Formatted date string for display header
  const formattedDate = useMemo(() => {
    try {
      return new Date(targetDate).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return targetDate;
    }
  }, [targetDate]);

  // ---------------------------------------------------------------------------
  // STEP 1: INITIAL DATE SELECTION (CALENDAR VIEW)
  // ---------------------------------------------------------------------------
  if (!hasDashboardCalculated) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-xl mx-auto w-full text-center py-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F3B763] tracking-widest uppercase font-mono">
            SELECT FORECAST DATE
          </h1>
        </div>

        {/* Rectangular Calendar Widget */}
        <div className="bg-[#1f2329] p-2 rounded-3xl border border-[#6B8D8A]/30 shadow-2xl">
          <SystemCalendar
            selectedDate={targetDate}
            onSelectDate={(d) => setTargetDate?.(d)}
          />
        </div>

        {/* Forecast Trigger Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleViewDashboard}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-[#AF4B47]/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#F3B763]" />
            <span>{loading ? "Forecasting..." : "Forecast"}</span>
          </button>
        </div>
      </div>
    );
  }

  const baseY = 180;

  return (
    <div className="space-y-6 animate-fadeIn text-[#EDDECB] max-w-6xl mx-auto w-full pb-10">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. OPERATIONS HEADING SUMMARY & ROUTE FILTER                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 px-1 pt-1">
        {/* Date Badge & Change Date Header Action */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-[#6B8D8A]/20">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-xl bg-[#1f2329] border border-[#6B8D8A]/30 text-xs font-mono font-bold text-[#F3B763] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <button
              type="button"
              onClick={() => setHasDashboardCalculated?.(false)}
              className="px-2.5 py-1 rounded-xl bg-[#16181d] hover:bg-[#AF4B47] text-[#B5C3C4] hover:text-[#EDDECB] border border-[#6B8D8A]/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Change Dashboard Date"
            >
              <Edit3 className="w-3 h-3" />
              <span>Change Date</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#EDDECB] leading-tight">
            <span className="font-mono font-black text-[#AF4B47]">
              {loading ? "..." : overcrowdedDeparturesCount}
            </span>{" "}
            departures need attention across{" "}
            <span className="font-mono font-bold text-[#EDDECB]">
              {loading ? "..." : activeServicesCount}
            </span>{" "}
            routes
          </h1>
          <div className="text-sm sm:text-base font-semibold text-[#B5C3C4] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span>
              <strong className="text-emerald-400 font-mono font-bold">
                {loading ? "..." : standbyCount}
              </strong>{" "}
              standby buses available
            </span>
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. REQUIRES ATTENTION (MOST IMPORTANT SECTION)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="border-b border-[#6B8D8A]/20 pb-3">
          <h2 className="text-base sm:text-lg font-black text-[#EDDECB] uppercase tracking-wide">
            OVERCROWDED DEPARTURES
          </h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#B5C3C4]">
            Analyzing transit corridors for overcrowding across 6 commuter time slots...
          </div>
        ) : overcrowdedSlotItems.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-[#16181d] border border-[#6B8D8A]/20 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Monitored Departures Within Capacity</span>
            </div>
            <p className="text-xs text-[#B5C3C4]">
              All scheduled departures across the 6 daily time slots are operating within normal capacity (70 pax max). No standby bus dispatches required.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {overcrowdedSlotItems.map((item) => {
              const slot = item.slot;
              const cleanRouteName =
                item.routeName.replace(/\s*\([^)]*\)/g, "").trim() || item.routeName;

              const overcrowdedDeps = (slot.departures || [])
                .filter((d) => d.passengers > d.capacity || d.passengers >= 80)
                .sort((a, b) => b.passengers - a.passengers);

              const displayDepTimes =
                overcrowdedDeps.length > 0
                  ? overcrowdedDeps.map((d) => d.time).join("  ")
                  : slot.peakDeparture.time;

              return (
                <div
                  key={`${item.serviceId}-${slot.slotId}`}
                  className="w-full p-6 sm:p-7 rounded-3xl border transition-all shadow-xl space-y-5 bg-[#181a20] border-[#6B8D8A]/25 hover:border-[#6B8D8A]/50"
                >
                  {/* 1. Header: ROUTE + Corridor on Left, Slot Status + Window on Right */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0 truncate text-base sm:text-lg font-extrabold text-[#EDDECB]">
                      <span className="shrink-0">
                        ROUTE {item.serviceId.replace(/^S/i, "")}
                      </span>
                      <span className="truncate" title={item.routeName}>
                        {cleanRouteName}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs sm:text-sm font-black text-[#F3B763] uppercase tracking-wide flex items-center justify-end">
                        <span>{slot.title.toUpperCase()}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-[#B5C3C4]">
                        {slot.window}
                      </div>
                    </div>
                  </div>

                  {/* 2. Peak Departure & Excess on Same Line */}
                  <div className="space-y-1.5 text-xs sm:text-sm font-medium text-[#B5C3C4]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span>{overcrowdedDeps.length > 1 ? "Peak departures:" : "Peak departure:"}</span>
                        <span>{displayDepTimes}</span>
                      </div>

                      <div>
                        +{slot.peakExcess} passengers over capacity
                      </div>
                    </div>

                    {/* Overcrowded Count */}
                    <div>
                      {slot.overcrowdedCount} of {slot.totalDepartures} departures overcrowded
                    </div>
                  </div>

                  {/* Action Row: Deploy A Bus & Departures Toggle on the same line */}
                  <div className="pt-2 border-t border-[#6B8D8A]/20 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenAllocate(item.serviceId, item.slot.slotId, item.slot.peakDeparture.time)}
                      className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>DEPLOY A BUS</span>
                    </button>

                    {/* Text/link style dropdown on the right of the deploy button line */}
                    <button
                      type="button"
                      onClick={() => toggleCardDepartures(`${item.serviceId}-${slot.slotId}`)}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#B5C3C4] hover:text-[#EDDECB] transition-colors cursor-pointer bg-transparent border-0 p-0 focus:outline-none select-none"
                    >
                      <span>{slot.totalDepartures} Departures</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedCardDepartures[`${item.serviceId}-${slot.slotId}`] ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Scheduled Departures Breakdown Matching Screenshot */}
                  {expandedCardDepartures[`${item.serviceId}-${slot.slotId}`] && (
                    <div className="mt-4 pt-4 border-t border-[#6B8D8A]/25 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] font-bold px-1 text-[#B5C3C4]">
                        <span className="flex items-center gap-1.5 text-[#F3B763] uppercase tracking-wider font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          DEPARTURES FROM {cleanRouteName.toUpperCase()} &amp; CROWD LEVELS
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {slot.departures.map((d, idx) => {
                          const isOvercrowded = d.passengers > d.capacity || d.passengers >= 80;
                          const isHigh = !isOvercrowded && d.passengers >= 60;
                          const isMod = !isOvercrowded && !isHigh && d.passengers >= 36;
                          const crowdLabel = isOvercrowded
                            ? "Overcrowded"
                            : isHigh
                            ? "High"
                            : isMod
                            ? "Moderate"
                            : "Normal";
                          const crowdIcon = isOvercrowded ? "🚨" : isHigh ? "🟠" : isMod ? "🟡" : "🟢";

                          return (
                            <div
                              key={d.time}
                              className={`p-3 rounded-xl transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                                d.isPeak && slot.requiresAttention
                                  ? "border-l-4 border-l-[#F3B763] border-t border-r border-b border-[#6B8D8A]/30 bg-[#191d24] shadow-sm"
                                  : "border border-[#6B8D8A]/15 bg-[#111317] hover:border-[#6B8D8A]/35 hover:bg-[#15181e]"
                              }`}
                            >
                              {/* Bus Index & Departure Time */}
                              <div className="flex items-center gap-2.5 min-w-[140px]">
                                <div
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-black ${
                                    d.isPeak && slot.requiresAttention
                                      ? "bg-[#F3B763]/25 border border-[#F3B763] text-[#F3B763]"
                                      : "bg-[#AF4B47]/20 border border-[#AF4B47]/40 text-[#EDDECB]"
                                  }`}
                                >
                                  #{idx + 1}
                                </div>
                                <div>
                                  <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">
                                    Departure Time
                                  </div>
                                  <div className="text-xs font-black text-[#EDDECB] font-mono flex items-center gap-1.5 mt-0.5">
                                    <Clock className="w-3 h-3 text-[#F3B763]" />
                                    <span>{d.time}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Passenger Count & Capacity Bar */}
                              <div className="flex-1 min-w-[160px]">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="font-mono font-extrabold text-[#EDDECB]">
                                    ~{d.passengers}{" "}
                                    <span className="text-[#B5C3C4] font-normal text-[11px]">passengers</span>
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#191c22] overflow-hidden border border-[#6B8D8A]/20">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      d.passengers >= 80
                                        ? "bg-red-500"
                                        : d.passengers >= 60
                                        ? "bg-orange-500"
                                        : d.passengers >= 36
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                    }`}
                                    style={{ width: `${Math.min(100, (d.passengers / 70) * 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="text-left sm:text-right min-w-[140px]">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    isOvercrowded
                                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                                      : isHigh
                                      ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                      : isMod
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                  }`}
                                >
                                  {crowdIcon} {crowdLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. RECENT DISPATCHES SUMMARY                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="border-b border-[#6B8D8A]/20 pb-3">
          <div>
            <h3 className="text-base font-black text-[#EDDECB] uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F3B763]" />
              RECENT DISPATCHES
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-[#B5C3C4]">
            Loading dispatch history...
          </div>
        ) : allocations.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#B5C3C4]">
            No dispatches have been recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allocations.slice(0, 4).map((a, idx) => {
              const displayDate = (() => {
                try {
                  const d = new Date(a.date);
                  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                } catch {
                  return a.date;
                }
              })();

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#16181d] border border-[#6B8D8A]/20 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-[#F3B763] text-[11px]">
                        {displayDate}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#EDDECB] flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#AF4B47]/20 text-[#F3B763] text-[10px] font-mono font-black">
                          Route {a.service_id.replace(/^S/i, "")}
                        </span>
                        <span className="font-mono text-[#EDDECB] font-bold">
                          {a.bus_number || a.bus_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-[#96BCBB] font-mono shrink-0">
                    {a.source_depot.replace("Depot", "").trim()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigateTab("history")}
            className="w-full py-2.5 px-4 rounded-xl bg-[#252a32] hover:bg-[#343b44] text-[#EDDECB] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-[#6B8D8A]/30 transition-all cursor-pointer shadow-md"
          >
            <span>View Dispatch History</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#F3B763]" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. EXTRA BUS DISPATCH TRENDS CHART & METRICS                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6B8D8A]/20 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#EDDECB] uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#F3B763]" />
              Extra Bus Dispatch Trends
            </h2>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center bg-[#16181d] p-1 rounded-xl border border-[#6B8D8A]/30">
            <button
              type="button"
              onClick={() => setTimeRange("7")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRange === "7"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-md"
                  : "text-[#B5C3C4] hover:text-[#EDDECB]"
              }`}
            >
              7 DAYS
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRange === "30"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-md"
                  : "text-[#B5C3C4] hover:text-[#EDDECB]"
              }`}
            >
              30 DAYS
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("90")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRange === "90"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-md"
                  : "text-[#B5C3C4] hover:text-[#EDDECB]"
              }`}
            >
              90 DAYS
            </button>
          </div>
        </div>

        {/* 3 Summary Metrics Beside/Above Chart */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#6B8D8A]/20">
            <div className="text-[10px] font-black text-[#B5C3C4] uppercase tracking-wider">
              AVERAGE EXTRA BUSES / DAY
            </div>
            <div className="text-xl font-mono font-black text-[#F3B763] mt-0.5">
              {avgExtraBusesPerDay} <span className="text-xs text-[#B5C3C4] font-normal">buses/day</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#6B8D8A]/20">
            <div className="text-[10px] font-black text-[#B5C3C4] uppercase tracking-wider">
              HIGHEST-DEMAND ROUTE
            </div>
            <div className="text-xl font-mono font-black text-[#AF4B47] mt-0.5">
              {highestDemandRoute}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#16181d] border border-[#6B8D8A]/20">
            <div className="text-[10px] font-black text-[#B5C3C4] uppercase tracking-wider">
              PEAK DISPATCH DAY
            </div>
            <div className="text-xl font-mono font-black text-[#96BCBB] mt-0.5">
              {peakDispatchDay}
            </div>
          </div>
        </div>

        {/* SVG Bézier Trend Chart */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Chart Canvas (8 cols) */}
          <div className="md:col-span-8 bg-[#16181d] p-5 sm:p-6 rounded-2xl border border-[#6B8D8A]/25 relative overflow-hidden">
            {/* Floating Point Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-4 right-4 z-30 px-3 py-2 rounded-xl bg-[#1f2329]/95 backdrop-blur-md border border-[#6B8D8A]/40 text-xs shadow-2xl space-y-0.5 animate-fadeIn pointer-events-none">
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
                      id={`grad-dash-${route.id}`}
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

                {/* Y Axis Label */}
                <text
                  x="15"
                  y="12"
                  className="text-[9px] fill-[#B5C3C4]/70 font-mono uppercase font-bold"
                >
                  Additional buses dispatched
                </text>

                {/* Horizontal Grid lines & Y Axis labels */}
                {[5, 4, 3, 2, 1, 0].map((val) => {
                  const y = 25 + (1 - val / maxChartVal) * 155;
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

                {/* Smooth Bézier Curves */}
                {ROUTE_CONFIG.map((route) => {
                  if (!selectedRoutes[route.id]) return null;

                  const values = routeTrends[route.id] || [1, 2, 1, 2, 1, 2, 1];
                  const numericPoints = values.map((val, idx) => {
                    const x = 45 + (idx / (timelineDates.length - 1)) * 530;
                    const y = 25 + (1 - val / maxChartVal) * 155;
                    return { x, y, val, date: timelineDates[idx] };
                  });

                  const smoothPath = createSmoothPath(numericPoints);
                  const areaPath = createAreaPath(numericPoints, baseY);

                  return (
                    <g key={route.id} className="transition-all duration-300">
                      <path d={areaPath} fill={`url(#grad-dash-${route.id})`} />
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke={route.color}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
                            r="5"
                            fill={route.color}
                            stroke="#16181d"
                            strokeWidth="2"
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

          {/* Route Checkbox Filters (4 cols) */}
          <div className="md:col-span-4 bg-[#16181d] p-4 rounded-2xl border border-[#6B8D8A]/20 space-y-2.5">
            <div className="border-b border-[#6B8D8A]/20 pb-2">
              <h3 className="text-xs font-black text-[#EDDECB] uppercase tracking-wider">
                Filter Routes:
              </h3>
            </div>

            <div className="space-y-2">
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
                        <div className="text-[10px] text-[#B5C3C4] truncate max-w-[130px]">
                          {route.corridor}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#F3B763]" />
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
