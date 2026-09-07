"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Bus,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import SystemCalendar from "../passenger/SystemCalendar";
import LeafletNetworkMap from "../map/LeafletNetworkMap";
import { AuthorityOverview, MapMetadata } from "@/lib/types";

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
  onOpenAllocate: (serviceId: string) => void;
  onFetchData: () => void;
}

const ROUTE_LIST = [
  { id: "All Routes", label: "All Routes (Network Overview — 16 Services)" },
  { id: "S45", label: "Route 45 — Ukkadam ↔ Vellamadai (Sathy Rd)" },
  { id: "S57", label: "Route 57 — Ukkadam ↔ Saibaba Stand (Sathy Rd)" },
  { id: "S52", label: "Route 52 — Gandhipuram ↔ Kovilpalayam" },
  { id: "S3B", label: "Route 3B — Ganapathy ↔ Madukkarai" },
  { id: "S25", label: "Route 25 — Ukkadam ↔ Saravanampatti" },
  { id: "S91", label: "Route 91 — Singanallur ↔ Kovilpalayam" },
  { id: "S4B", label: "Route 4B — Ukkadam ↔ Press Colony" },
  { id: "S13B", label: "Route 13B — Gandhipuram ↔ Kurumbapalayam" },
  { id: "S33A", label: "Route 33A — Gandhipuram ↔ Kinathukadavu (Pollachi Rd)" },
  { id: "S48", label: "Route 48 — Gandhipuram ↔ Vanthavalam (Palakkad Rd)" },
  { id: "S95", label: "Route 95 — Gandhipuram ↔ Malumichampatti" },
  { id: "S1A", label: "Route 1A — Ondipudur ↔ Vadavalli" },
  { id: "S109", label: "Route 109 — Ukkadam ↔ KG Chavadi" },
  { id: "S75", label: "Route 75 — Ukkadam ↔ Eachanari" },
  { id: "S64", label: "Route 64 — Gandhipuram ↔ Kuniyamuthur" },
  { id: "S1", label: "Route S1 — Maruthamalai ↔ Avarampalayam" },
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
  onOpenAllocate,
  onFetchData,
}: AuthorityForecastViewProps) {
  const [allocatedRoutes, setAllocatedRoutes] = useState<Record<string, boolean>>({});
  const [declinedRoutes, setDeclinedRoutes] = useState<Record<string, boolean>>({});
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

  const toggleRouteExpand = (sid: string) => {
    setExpandedRoutes((prev) => ({
      ...prev,
      [sid]: !prev[sid],
    }));
  };

  const handlePredictForecast = () => {
    onFetchData();
    setHasForecastCalculated(true);
  };

  const handleYesAllocate = (serviceId: string, slotLabel?: string) => {
    onOpenAllocate(serviceId);
  };

  const handleNoAllocate = (serviceId: string, slotId?: string) => {
    const key = slotId ? `${serviceId}_${slotId}` : serviceId;
    setDeclinedRoutes((prev) => ({ ...prev, [key]: true }));
  };

  // ─────────────────────────────────────────────────────────────
  // 1. STEP 1: INITIAL DATE SELECTION (Matching Sketch 2)
  // ─────────────────────────────────────────────────────────────
  if (!hasForecastCalculated) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-xl mx-auto w-full text-center py-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F3B763] tracking-widest uppercase font-mono mb-1">
            SELECT DATE
          </h1>
          <p className="text-xs text-[#B5C3C4] font-medium">
            Choose an operational forecasting date to predict metropolitan passenger loads
          </p>
        </div>

        {/* Rectangular Calendar */}
        <div className="bg-[#1f2329] p-2 rounded-3xl border border-[#6B8D8A]/30 shadow-2xl">
          <SystemCalendar
            selectedDate={targetDate}
            onSelectDate={(d) => setTargetDate(d)}
          />
        </div>

        {/* Large Forecast Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handlePredictForecast}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl shadow-[#AF4B47]/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#EDDECB]" />
                Forecasting Network Demand...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#F3B763]" />
                Forecast
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. STEP 2: FORECAST RESULTS & TRIP-BY-TRIP ALLOCATION
  // ─────────────────────────────────────────────────────────────
  const routesData = overview?.routes || {};
  const routeEntries = Object.entries(routesData).filter(([sid]) => {
    if (selectedRoute === "All Routes") return true;
    return sid.toUpperCase() === selectedRoute.toUpperCase();
  });

  return (
    <div className="space-y-5 animate-fadeIn max-w-5xl mx-auto w-full text-[#EDDECB] pb-10">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1f2329] p-4 rounded-2xl border border-[#6B8D8A]/30 shadow-xl">
        <button
          onClick={() => setHasForecastCalculated(false)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#16181d] hover:bg-[#AF4B47] text-[#EDDECB] border border-[#6B8D8A]/30 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#F3B763] group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
          <span>Select New Date</span>
        </button>

        {/* Route Dropdown Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#B5C3C4] font-bold">Route Filter:</span>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-[#16181d] border-2 border-[#6B8D8A]/40 text-xs text-[#EDDECB] font-black focus:outline-none focus:border-[#F3B763] cursor-pointer"
          >
            {ROUTE_LIST.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#1f2329] text-[#EDDECB]">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono font-bold text-[#F3B763] bg-[#F3B763]/15 px-3 py-1 rounded-full border border-[#F3B763]/30">
          📅 {targetDate} Forecast
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#EDDECB] uppercase tracking-wider flex items-center gap-2">
            <Bus className="w-4 h-4 text-[#F3B763]" />
            Corridor Network & Depot Proximity Map
          </h3>
        </div>

        {mapData ? (
          <LeafletNetworkMap
            selectedService={selectedRoute}
            routeForecasts={overview?.routes}
            stopCoords={mapData.stop_coords}
            stopNames={mapData.stop_names}
            routeGeometry={mapData.route_geometry}
            routeStartCoords={mapData.route_start_coords}
          />
        ) : (
          <div className="h-64 rounded-2xl bg-[#16181d] flex items-center justify-center text-[#B5C3C4] text-xs">
            Loading interactive transit network...
          </div>
        )}
      </div>

      {/* ── ROUTE INTELLIGENCE TABLE WITH TRIP-BY-TRIP BREAKDOWN ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div>
          <h3 className="text-base font-black text-[#EDDECB] uppercase tracking-wide">
            Route Demand & Trip-by-Trip Intelligence
          </h3>
        </div>

        <div className="space-y-4">
          {routeEntries.map(([sid, r]) => {
            const isExpanded = !!expandedRoutes[sid];
            const isAllocated = !!allocatedRoutes[sid];
            const isDeclined = !!declinedRoutes[sid];
            const tripSlots = r.trip_slots || [];
            const surgeTrips = tripSlots.filter((t) => t.needs_extra_bus);

            return (
              <div
                key={sid}
                className="bg-[#16181d] border border-[#6B8D8A]/30 rounded-2xl overflow-hidden transition-all shadow-lg"
              >
                {/* 1. Main Route Header Row (Strictly Uniform 12-Column Grid, Non-wrapping) */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 items-center gap-3 border-b border-[#6B8D8A]/20">
                  {/* Left (6 cols): Route Badge & Corridor Name */}
                  <div className="md:col-span-6 flex items-center gap-3 min-w-0">
                    <span className="px-2.5 py-1 rounded-xl bg-[#F3B763]/20 text-[#F3B763] font-mono font-black text-xs sm:text-sm border border-[#F3B763]/40 shadow-sm shrink-0">
                      Route {sid.replace(/^S/i, "")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#EDDECB] truncate" title={r.route_name}>
                        {r.route_name.replace(/^[A-Za-z0-9\s]+:\s*/, "").replace(/^Service\s+[A-Za-z0-9]+\s*:\s*/i, "").trim() || "Corridor Route"}
                      </h4>
                    </div>
                  </div>

                  {/* Right (6 cols): Daily Totals, Crowd Badge & Expand Button */}
                  <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0">
                    {/* Daily Totals */}
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-[#B5C3C4]">Expected Total:</div>
                      <div className="font-mono font-black text-xs sm:text-sm text-[#EDDECB]">
                        {r.expected_passengers.toLocaleString()} <span className="text-[10px] text-[#B5C3C4] font-normal">passengers</span>
                      </div>
                    </div>

                    {/* Crowd Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border shrink-0 ${
                        r.crowd_level === "High"
                          ? "bg-[#AF4B47]/25 text-[#AF4B47] border-[#AF4B47]/50"
                          : r.crowd_level === "Moderate"
                          ? "bg-[#F3B763]/20 text-[#F3B763] border-[#F3B763]/40"
                          : "bg-[#96BCBB]/20 text-[#96BCBB] border-[#96BCBB]/40"
                      }`}
                    >
                      {r.crowd_icon} {r.crowd_level}
                    </span>

                    {/* Expand/Collapse Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleRouteExpand(sid)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#252a32] hover:bg-[#343b44] text-[#EDDECB] text-xs font-bold border border-[#6B8D8A]/30 transition-all cursor-pointer shrink-0"
                    >
                      <span>{isExpanded ? "Hide Trips" : `View Scheduled Trips (${surgeTrips.length} Surge)`}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#F3B763] transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Attached Separate Box: Surge Notification & Allocation Action */}
                {(r.buses_required > 0 || surgeTrips.length > 0) && (
                  <div className="px-4 py-2.5 bg-[#AF4B47]/15 border-t border-[#AF4B47]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[#AF4B47] font-extrabold">
                      <AlertTriangle className="w-4 h-4 text-[#AF4B47] shrink-0" />
                      <span>Passenger Surge Detected — Need Extra Bus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#EDDECB]/80 font-medium">Allocate Bus?</span>
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1 rounded-lg bg-[#AF4B47] text-[#EDDECB] text-xs font-black cursor-not-allowed opacity-80 shadow-md"
                      >
                        Allocate
                      </button>
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1 rounded-lg bg-[#252a32] text-[#B5C3C4] border border-[#6B8D8A]/30 text-xs font-bold cursor-not-allowed opacity-80"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Expanded Trip-by-Trip Departure Slot Breakdown */}
                {isExpanded && tripSlots.length > 0 && (
                  <div className="p-4 sm:p-5 bg-[#121418]/60 space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#B5C3C4] font-bold pb-1">
                      <span className="flex items-center gap-2">
                        <Bus className="w-3.5 h-3.5 text-[#F3B763]" />
                        Individual Bus Service Trip Forecasts ({tripSlots.length} Departures):
                      </span>
                      <span>Capacity: <strong>50 seats / bus</strong></span>
                    </div>

                    <div className="space-y-2.5">
                      {tripSlots.map((trip) => {
                        return (
                          <div
                            key={trip.slot_id}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all grid grid-cols-1 md:grid-cols-12 gap-4 items-center ${
                              trip.needs_extra_bus
                                ? "bg-[#AF4B47]/10 border-[#AF4B47]/40 shadow-md"
                                : "bg-[#1f2329] border-[#6B8D8A]/25 hover:bg-[#252a32]"
                            }`}
                          >
                            {/* 1. Left (4 cols): Time Badge & Trip Description */}
                            <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                              <span className="px-3 py-1.5 rounded-xl bg-[#131518] text-[#F3B763] font-mono font-black text-xs border border-[#6B8D8A]/30 shadow-sm shrink-0">
                                🕐 {trip.time || trip.label}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#EDDECB] truncate" title={trip.title}>
                                  {trip.title}
                                </div>
                                <div className="text-[11px] text-[#B5C3C4]">
                                  Capacity: 50 seats
                                </div>
                              </div>
                            </div>

                            {/* 2. Middle (6 cols): Uniform Passenger Load Bar */}
                            <div className="md:col-span-6">
                              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                                <span className="text-[#B5C3C4] font-semibold">Load:</span>
                                <span className="font-black text-[#EDDECB]">
                                  {trip.passengers} / {trip.capacity} passengers{" "}
                                  <span className={`text-[10px] ${trip.occupancy_pct > 90 ? "text-[#AF4B47]" : "text-[#B5C3C4]"}`}>
                                    ({trip.occupancy_pct}%)
                                  </span>
                                </span>
                              </div>
                              <div className="w-full h-2 bg-[#131518] rounded-full overflow-hidden border border-[#6B8D8A]/15">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    trip.crowd_level === "High"
                                      ? "bg-[#AF4B47]"
                                      : trip.crowd_level === "Moderate"
                                      ? "bg-[#F3B763]"
                                      : "bg-[#96BCBB]"
                                  }`}
                                  style={{ width: `${Math.min(100, trip.occupancy_pct)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* 3. Right (2 cols): Crowd Badge */}
                            <div className="md:col-span-2 flex items-center justify-end shrink-0">
                              <span
                                className={`text-xs font-black px-3 py-1 rounded-full border shrink-0 ${
                                  trip.crowd_level === "High"
                                    ? "bg-[#AF4B47]/30 text-[#AF4B47] border-[#AF4B47]/50"
                                    : trip.crowd_level === "Moderate"
                                    ? "bg-[#F3B763]/20 text-[#F3B763] border-[#F3B763]/40"
                                    : "bg-[#96BCBB]/20 text-[#96BCBB] border-[#96BCBB]/40"
                                }`}
                              >
                                {trip.crowd_icon} {trip.crowd_level}
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
      </div>
    </div>
  );
}
