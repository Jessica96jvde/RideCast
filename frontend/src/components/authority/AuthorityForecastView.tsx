"use client";

/**
 * RideCast - Transport Authority Route Forecast & Demand Intelligence View
 * =========================================================================
 * Provides comprehensive transit demand intelligence for the Transport Authority:
 * 1. Initial State:
 *    - Full calendar date selector with "Forecast Route Demand" trigger.
 * 2. Results State (matches Passenger Portal layout with Authority power features):
 *    - Top interactive Leaflet corridor network map with operational legend.
 *    - Header bar with route / network corridor title, date, active time window, and Change Date action.
 *    - 2-Column interactive layout:
 *      - Left column: Time Slots Timeline (6 daily shifts with live passenger metrics & ochre selection).
 *      - Right column: Available Bus Services with Dashboard-style "Search by Route" pill filters,
 *        departure schedule badges, expected crowd metrics, "DEPLOY A BUS" dispatch actions,
 *        and expandable departure-by-departure breakdowns.
 */

import React, { useState, useMemo } from "react";
import {
  Bus,
  Clock,
  ChevronDown,
  Sparkles,
  MapPin,
  Calendar,
  Send,
  ArrowLeft,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import SystemCalendar from "../passenger/SystemCalendar";
import LeafletNetworkMap from "../map/LeafletNetworkMap";
import { AuthorityOverview, MapMetadata } from "@/lib/types";
import {
  analyzeRouteTimeSlots,
  AnalyzedRouteSummary,
  AnalyzedTimeSlot,
  AUTHORITY_TIME_SLOTS,
} from "@/lib/authorityTimeSlotUtils";

interface AuthorityForecastViewProps {
  mapData: MapMetadata | null;
  overview: AuthorityOverview | null;
  loading: boolean;
  targetDate: string;
  setTargetDate: (date: string) => void;
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  hasForecastCalculated: boolean;
  setHasForecastCalculated: (hasCalc: boolean) => void;
  activeSlotId?: string;
  setActiveSlotId?: (slotId: string) => void;
  onOpenAllocate: (serviceId: string, slotId?: string, departureTime?: string) => void;
  onFetchData: () => void;
}

// 6 commuter shifts across the daily operating cycle
const TIME_SLOT_OPTIONS = [
  { id: "slot_1", short: "6 – 8 AM", title: "Early Morning", window: "06:00–08:00" },
  { id: "slot_2", short: "8 – 10 AM", title: "Morning Peak", window: "08:00–10:00" },
  { id: "slot_3", short: "10 AM – 12 PM", title: "Late Morning", window: "10:00–12:00" },
  { id: "slot_4", short: "12 – 2 PM", title: "Midday Transit", window: "12:00–14:00" },
  { id: "slot_5", short: "2 – 5 PM", title: "Afternoon", window: "14:00–17:00" },
  { id: "slot_6", short: "5 – 8 PM", title: "Evening Peak", window: "17:00–20:00" },
];

export default function AuthorityForecastView({
  mapData,
  overview,
  loading,
  targetDate,
  setTargetDate,
  selectedRoute,
  setSelectedRoute,
  hasForecastCalculated,
  setHasForecastCalculated,
  activeSlotId = "slot_2",
  setActiveSlotId,
  onOpenAllocate,
  onFetchData,
}: AuthorityForecastViewProps) {
  // Normalize selected route filter (if "All Routes" or "ALL", treat as "ALL")
  const activeRouteFilter = useMemo(() => {
    if (!selectedRoute || selectedRoute === "All Routes" || selectedRoute === "ALL") {
      return "ALL";
    }
    return selectedRoute.toUpperCase();
  }, [selectedRoute]);

  // Map of expanded departure drawers per route card in active slot
  const [expandedCardDepartures, setExpandedCardDepartures] = useState<Record<string, boolean>>({});

  const toggleCardDepartures = (cardKey: string) => {
    setExpandedCardDepartures((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const handlePredictForecast = () => {
    onFetchData();
    setHasForecastCalculated(true);
  };

  // ---------------------------------------------------------------------------
  // 1. Compute Route Summaries & Time Slot Statistics
  // ---------------------------------------------------------------------------
  const routesData = overview?.routes || {};
  const routeEntries = Object.entries(routesData);

  const analyzedRoutes: AnalyzedRouteSummary[] = useMemo(() => {
    return routeEntries.map(([sid, r]) => analyzeRouteTimeSlots(sid, r));
  }, [routeEntries]);

  // Available routes list with attention counters for the quick filter pills
  const availableRoutes = useMemo(() => {
    return analyzedRoutes.map((r) => {
      const cleanName = r.routeName.replace(/\s*\([^)]*\)/g, "").trim() || r.routeName;
      return {
        serviceId: r.serviceId,
        displayId: r.serviceId.replace(/^S/i, ""),
        routeName: cleanName,
        overcrowdedCount: r.attentionSlots.length,
      };
    });
  }, [analyzedRoutes]);

  // Active time slot definition
  const activeSlotConfig = useMemo(() => {
    return TIME_SLOT_OPTIONS.find((s) => s.id === activeSlotId) || TIME_SLOT_OPTIONS[1];
  }, [activeSlotId]);

  // Routes filtered for the currently active time slot and route filter
  const filteredSlotRoutes = useMemo(() => {
    let routes = analyzedRoutes;
    if (activeRouteFilter !== "ALL") {
      routes = routes.filter(
        (r) => r.serviceId.toUpperCase() === activeRouteFilter
      );
    }

    return routes
      .map((r) => {
        const slot = r.timeSlots.find((s) => s.slotId === activeSlotId) || r.timeSlots[0];
        return {
          serviceId: r.serviceId,
          routeName: r.routeName,
          originName: r.originName,
          destName: r.destName,
          slot,
        };
      })
      .filter((item) => !!item.slot);
  }, [analyzedRoutes, activeSlotId, activeRouteFilter]);

  // Format date display (e.g. "27 Sept")
  const formattedDate = useMemo(() => {
    try {
      return new Date(targetDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return targetDate;
    }
  }, [targetDate]);

  // ---------------------------------------------------------------------------
  // 1. STEP 1: INITIAL DATE & CORRIDOR SELECTION (CALENDAR VIEW)
  // ---------------------------------------------------------------------------
  if (!hasForecastCalculated) {
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
            onSelectDate={(d) => setTargetDate(d)}
          />
        </div>

        {/* Forecast Trigger Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handlePredictForecast}
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

  // ---------------------------------------------------------------------------
  // 2. STEP 2: RESULTS VIEW (PASSENGER-STYLE WITH SIDEBAR TIME SLOTS & DASHBOARD FILTER)
  // ---------------------------------------------------------------------------
  return (
    <div className="animate-fadeIn pb-12 w-full text-[#EDDECB]">
      {/* ── 1. FULL-BLEED NETWORK MAP HEADER ── */}
      <div className="relative w-full rounded-none overflow-hidden border-b border-[#6B8D8A]/30 shadow-xl bg-[#191c22]">
        {/* Floating Back Arrow Button */}
        <button
          onClick={() => setHasForecastCalculated(false)}
          className="absolute top-3 left-14 z-[1000] inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#191c22]/95 hover:bg-[#AF4B47] text-[#F3B763] hover:text-white border border-[#6B8D8A]/50 shadow-xl backdrop-blur-md transition-all transform active:scale-90 cursor-pointer group"
          title="Back to Calendar"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5] group-hover:-translate-x-0.5 transition-all" />
        </button>

        {/* Operational Map Legend Overlay (Top-Right) */}
        <div className="absolute top-3 right-4 z-[1000] hidden sm:flex items-center gap-2.5 text-[10px] font-bold bg-[#16181d]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#6B8D8A]/30 shadow-lg">
          <span className="flex items-center gap-1 text-[#AF4B47]">
            <span className="w-2 h-2 rounded-full bg-[#AF4B47]"></span>
            High Demand
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Overcrowded
          </span>
          <span className="flex items-center gap-1 text-[#F3B763]">
            <span className="w-2 h-2 rounded-full bg-[#F3B763]"></span>
            Standby Bus
          </span>
          <span className="flex items-center gap-1 text-[#38bdf8]">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
            Depot
          </span>
        </div>

        {mapData ? (
          <LeafletNetworkMap
            selectedService={activeRouteFilter !== "ALL" ? activeRouteFilter : "All Routes"}
            routeForecasts={overview?.routes}
            stopCoords={mapData.stop_coords}
            stopNames={mapData.stop_names}
            routeGeometry={mapData.route_geometry}
            routeStartCoords={mapData.route_start_coords}
            height="210px"
            className="rounded-none border-0"
          />
        ) : (
          <div className="h-52 rounded-none bg-[#16181d] flex items-center justify-center text-[#B5C3C4] text-xs">
            Loading transit network geometry...
          </div>
        )}
      </div>

      {/* ── 2. INNER CONTENT CONTAINER ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 w-full">
        {/* Route Info Bar (Directly below Map Header) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
          <div>
            <div className="text-base sm:text-lg font-black text-[#EDDECB] flex items-center gap-2">
              <span className="text-[#F3B763] underline decoration-[#F3B763]/50 underline-offset-4">
                {activeRouteFilter !== "ALL"
                  ? analyzedRoutes.find(
                      (r) => r.serviceId.toUpperCase() === activeRouteFilter
                    )?.routeName || `Route ${activeRouteFilter.replace(/^S/i, "")}`
                  : "Coimbatore Metropolitan Transit Network"}
              </span>
            </div>
            <div className="text-xs text-[#B5C3C4] font-mono mt-0.5 font-bold">
              📅 {formattedDate} &nbsp;•&nbsp; 🕐 {activeSlotConfig.short} ({activeSlotConfig.title})
            </div>
          </div>

          <button
            onClick={() => setHasForecastCalculated(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1f2329] hover:bg-[#AF4B47] text-[#EDDECB] border border-[#6B8D8A]/30 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#F3B763]" />
            <span>Change Date</span>
          </button>
        </div>

        {/* ── 3. SEARCH BY ROUTE FILTER PILLS (FROM DASHBOARD) ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scroll-smooth no-scrollbar">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#B5C3C4] shrink-0">
            Search by route:
          </span>
          <button
            type="button"
            onClick={() => setSelectedRoute("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeRouteFilter === "ALL"
                ? "bg-[#F3B763] text-[#14161a] shadow-md font-black"
                : "bg-[#16181d] text-[#B5C3C4] hover:text-[#EDDECB] border border-[#6B8D8A]/30 hover:border-[#6B8D8A]/60"
            }`}
          >
            All Routes
          </button>
          {availableRoutes.map((r) => {
            const isSelected = activeRouteFilter === r.serviceId.toUpperCase();
            return (
              <button
                key={r.serviceId}
                type="button"
                onClick={() => setSelectedRoute(r.serviceId)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-[#F3B763] text-[#14161a] shadow-md font-black"
                    : "bg-[#16181d] text-[#B5C3C4] hover:text-[#EDDECB] border border-[#6B8D8A]/30 hover:border-[#6B8D8A]/60"
                }`}
              >
                <span>Route {r.displayId}</span>
                {r.overcrowdedCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                      isSelected
                        ? "bg-[#14161a]/20 text-[#14161a]"
                        : "bg-[#AF4B47]/25 text-[#F3B763]"
                    }`}
                  >
                    {r.overcrowdedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 4. AVAILABLE BUSES & DISPATCH ACTIONS (FULL WIDTH) ── */}
        <div className="w-full bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#6B8D8A]/20 pb-3">
            <div>
              <h3 className="text-base font-black text-[#EDDECB] uppercase tracking-wide flex items-center gap-2">
                <Bus className="w-4 h-4 text-[#F3B763]" />
                <span>Available Buses</span>
              </h3>
              <p className="text-xs text-[#B5C3C4]">
                {activeSlotConfig.short} ({activeSlotConfig.title}) • {filteredSlotRoutes.length} services monitored
              </p>
            </div>
          </div>

          {loading ? (
              <div className="py-12 text-center text-xs text-[#B5C3C4]">
                Calculating transit demand intelligence for this time window...
              </div>
            ) : filteredSlotRoutes.length === 0 ? (
              <div className="py-10 px-4 rounded-2xl bg-[#16181d] border border-[#6B8D8A]/20 text-center space-y-2">
                <div className="text-sm font-bold text-[#EDDECB]">
                  No bus services matching selected route filter
                </div>
                <p className="text-xs text-[#B5C3C4]">
                  Try selecting "All Routes" to inspect all services running during this shift.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedRoute("ALL")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#252a32] hover:bg-[#343b44] text-[#EDDECB] text-xs font-bold transition-all cursor-pointer border border-[#6B8D8A]/30 mt-2"
                >
                  Show All Routes
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full">
                {filteredSlotRoutes.map((item) => {
                  const slot = item.slot;
                  const cardKey = `${item.serviceId}-${slot.slotId}`;
                  const cleanRouteName =
                    item.routeName.replace(/\s*\([^)]*\)/g, "").trim() || item.routeName;

                  const isOvercrowded = slot.requiresAttention;
                  const isHigh = !isOvercrowded && slot.peakDeparture.passengers >= 60;
                  const isMod = !isOvercrowded && !isHigh && slot.peakDeparture.passengers >= 36;
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
                      key={cardKey}
                      className="w-full p-5 sm:p-6 rounded-3xl border transition-all shadow-xl space-y-4 bg-[#181a20] border-[#6B8D8A]/25 hover:border-[#6B8D8A]/50"
                    >
                      {/* Top Row: Service Number Badge & Route Name + Crowd Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#AF4B47]/20 border border-[#AF4B47]/40 flex items-center justify-center font-mono font-black text-sm text-[#F3B763] shrink-0">
                            {item.serviceId.replace(/^S/i, "")}
                          </div>
                          <div className="min-w-0 truncate">
                            <h4
                              className="text-sm sm:text-base font-extrabold text-[#EDDECB] truncate"
                              title={item.routeName}
                            >
                              {cleanRouteName}
                            </h4>
                            <div className="text-[11px] text-[#B5C3C4] font-medium truncate">
                              {item.originName} ↔ {item.destName}
                            </div>
                          </div>
                        </div>

                        {/* Crowd Status Badge */}
                        <div className="shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
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

                      {/* Middle Row: Departure Times Pill Badges */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] text-[#B5C3C4] font-bold">
                          Buses Departing From{" "}
                          <span className="text-[#F3B763]">{item.originName}</span>:
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {slot.departures.map((d) => (
                            <span
                              key={d.time}
                              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                                d.passengers >= 80 || (d.isPeak && slot.requiresAttention)
                                  ? "bg-red-500/15 text-red-300 border-red-500/40"
                                  : "bg-[#111317] text-[#EDDECB] border-[#6B8D8A]/30"
                              }`}
                            >
                              {d.time}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Expected Crowd Line */}
                      <div className="flex items-center justify-between text-xs text-[#B5C3C4] pt-1">
                        <div>
                          EXPECTED CROWD:{" "}
                          <strong className="text-[#EDDECB] font-mono text-sm">
                            ~{slot.peakDeparture.passengers} passengers
                          </strong>{" "}
                          (peak at {slot.peakDeparture.time})
                        </div>
                        {slot.requiresAttention && slot.peakExcess > 0 && (
                          <div className="text-red-400 font-bold font-mono text-xs">
                            +{slot.peakExcess} over combined capacity
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Row: Deploy A Bus & Departures Toggle on the same line */}
                      <div className="pt-3 border-t border-[#6B8D8A]/20 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenAllocate(item.serviceId, slot.slotId, slot.peakDeparture.time)}
                          className="w-full sm:w-auto py-2.5 px-5 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>DEPLOY A BUS</span>
                        </button>

                        {/* Text/link style dropdown on the right of the deploy button line */}
                        <button
                          type="button"
                          onClick={() => toggleCardDepartures(cardKey)}
                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#B5C3C4] hover:text-[#EDDECB] transition-colors cursor-pointer bg-transparent border-0 p-0 focus:outline-none select-none"
                        >
                          <span>{slot.totalDepartures} Departures</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedCardDepartures[cardKey] ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Expanded Scheduled Departures Breakdown */}
                      {expandedCardDepartures[cardKey] && (
                        <div className="mt-3 pt-3 border-t border-[#6B8D8A]/25 space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-[11px] font-bold px-1 text-[#B5C3C4]">
                            <span className="flex items-center gap-1.5 text-[#F3B763] uppercase tracking-wider font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              DEPARTURES &amp; CROWD LEVELS IN THIS WINDOW
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {slot.departures.map((d, idx) => {
                              const depOvercrowded = d.passengers > d.capacity || d.passengers >= 80;
                              const depHigh = !depOvercrowded && d.passengers >= 60;
                              const depMod = !depOvercrowded && !depHigh && d.passengers >= 36;
                              const depBadgeLabel = depOvercrowded
                                ? "Overcrowded"
                                : depHigh
                                ? "High"
                                : depMod
                                ? "Moderate"
                                : "Normal";
                              const depBadgeIcon = depOvercrowded
                                ? "🚨"
                                : depHigh
                                ? "🟠"
                                : depMod
                                ? "🟡"
                                : "🟢";

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
                                        <span className="text-[#B5C3C4] font-normal text-[11px]">
                                          passengers
                                        </span>
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
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            (d.passengers / 70) * 100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <div className="text-left sm:text-right min-w-[140px]">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                        depOvercrowded
                                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                                          : depHigh
                                          ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                          : depMod
                                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                      }`}
                                    >
                                      {depBadgeIcon} {depBadgeLabel}
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
        </div>
      </div>
  );
}
