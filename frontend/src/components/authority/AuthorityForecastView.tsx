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
  { id: "All Routes", label: "All Routes (Network Overview)" },
  { id: "S45", label: "Route 1 (S45) — Ukkadam ↔ Saibaba Colony" },
  { id: "S57", label: "Route 2 (S57) — Ukkadam ↔ Saibaba Colony" },
  { id: "S33A", label: "Route 3 (S33A) — Gandhipuram ↔ Cheran Nagar" },
  { id: "S48", label: "Route 4 (S48) — Gandhipuram ↔ Ondipudur" },
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

  const handlePredictForecast = () => {
    onFetchData();
    setHasForecastCalculated(true);
  };

  const handleYesAllocate = (serviceId: string) => {
    onOpenAllocate(serviceId);
  };

  const handleNoAllocate = (serviceId: string) => {
    setDeclinedRoutes((prev) => ({ ...prev, [serviceId]: true }));
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

        {/* Rectangular Calendar (Matching Sketch 2 Box) */}
        <div className="bg-[#1f2329] p-2 rounded-3xl border border-[#6B8D8A]/30 shadow-2xl">
          <SystemCalendar
            selectedDate={targetDate}
            onSelectDate={(d) => setTargetDate(d)}
          />
        </div>

        {/* Large Forecast Button (Matching Sketch 2 [Forecast] Button) */}
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
  // 2. STEP 2: FORECAST RESULTS & ALLOCATION (Matching Sketch 3)
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

        {/* Route Dropdown Selector (Matching Sketch 3 [Route 1 v]) */}
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

      {/* Map Section (Matching Sketch 3 Top) */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#EDDECB] uppercase tracking-wider flex items-center gap-2">
            <Bus className="w-4 h-4 text-[#F3B763]" />
            Corridor Network & Depot Proximity Map
          </h3>
          <span className="text-xs text-[#B5C3C4]">
            Viewing: <strong>{selectedRoute}</strong>
          </span>
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

      {/* ── ROUTE INTELLIGENCE TABLE (Matching Sketch 3 Bottom Exactly) ── */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-[#EDDECB] uppercase tracking-wide">
            Route Demand & Allocation Intelligence
          </h3>
          <span className="text-xs text-[#B5C3C4]">
            {routeEntries.length} routes monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#6B8D8A]/25 text-[#B5C3C4] bg-[#16181d]">
                <th className="py-3 px-4 font-black uppercase tracking-wider">A → B</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Normal passenger count</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Expected passenger count</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-center">Crowd level</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-center">Need extra bus?</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-center">Allocate bus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8D8A]/15">
              {routeEntries.map(([sid, r]) => {
                const isNeedExtra = r.buses_required > 0 || r.crowd_level === "High";
                const isAllocated = !!allocatedRoutes[sid];
                const isDeclined = !!declinedRoutes[sid];

                return (
                  <tr key={sid} className="hover:bg-[#252a32]/60 transition-colors">
                    {/* A -> B */}
                    <td className="py-4 px-4 font-bold text-[#EDDECB]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#F3B763]/15 text-[#F3B763] font-mono font-black text-[11px] border border-[#F3B763]/30">
                          {sid}
                        </span>
                        <span>{r.route_name.replace(`Service ${sid}`, "").replace(`${sid}:`, "").trim() || "Corridor Route"}</span>
                      </div>
                    </td>

                    {/* Normal passenger count */}
                    <td className="py-4 px-4 font-mono font-bold text-[#B5C3C4]">
                      {r.normal_passengers.toLocaleString()}{" "}
                      <span className="text-[10px] text-[#B5C3C4]/60 font-normal">pax</span>
                    </td>

                    {/* Expected passenger count */}
                    <td className="py-4 px-4 font-mono font-black text-sm text-[#EDDECB]">
                      {r.expected_passengers.toLocaleString()}{" "}
                      <span className="text-[10px] text-[#B5C3C4] font-normal">pax</span>
                    </td>

                    {/* Crowd level */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${
                          r.crowd_level === "High"
                            ? "bg-[#AF4B47]/25 text-[#AF4B47] border-[#AF4B47]/50"
                            : r.crowd_level === "Moderate"
                            ? "bg-[#F3B763]/20 text-[#F3B763] border-[#F3B763]/40"
                            : "bg-[#96BCBB]/20 text-[#96BCBB] border-[#96BCBB]/40"
                        }`}
                      >
                        {r.crowd_icon} {r.crowd_level}
                      </span>
                    </td>

                    {/* Need extra bus? */}
                    <td className="py-4 px-4 text-center font-bold">
                      {isNeedExtra ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#AF4B47]/20 text-[#AF4B47] border border-[#AF4B47]/40">
                          <AlertTriangle className="w-3 h-3" />
                          Yes (+{r.buses_required || 1} bus)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#96BCBB]/15 text-[#96BCBB] border border-[#96BCBB]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          No (Normal)
                        </span>
                      )}
                    </td>

                    {/* Allocate bus [yes] [no] (Matching Sketch 3 Buttons) */}
                    <td className="py-4 px-4 text-center">
                      {isAllocated ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                          ✓ Allocated
                        </span>
                      ) : isDeclined ? (
                        <span className="px-3 py-1 rounded-xl bg-[#252a32] text-[#B5C3C4] text-xs font-bold">
                          Declined
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleYesAllocate(sid)}
                            className="px-3 py-1 rounded-xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase shadow-md transition-all active:scale-95 cursor-pointer"
                            title="Dispatch extra reserve bus"
                          >
                            yes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNoAllocate(sid)}
                            className="px-3 py-1 rounded-xl bg-[#252a32] hover:bg-[#343b44] text-[#B5C3C4] hover:text-[#EDDECB] font-bold text-xs uppercase border border-[#6B8D8A]/30 transition-all active:scale-95 cursor-pointer"
                            title="Acknowledge standard operation"
                          >
                            no
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
