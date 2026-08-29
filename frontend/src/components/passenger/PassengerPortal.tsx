"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpDown,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Search,
  Sparkles,
  Bus,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Map as MapIcon,
  ShieldCheck,
  Send,
  Loader2,
  Users
} from "lucide-react";
import SystemCalendar from "./SystemCalendar";
import FeedbackWidget from "./FeedbackWidget";
import CrowdHeatmapGrid from "./CrowdHeatmapGrid";
import LeafletJourneyMap from "../map/LeafletJourneyMap";
import { Stop, RouteMeta, DemandPrediction, SlotPrediction, MapMetadata } from "@/lib/types";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface PassengerPortalProps {
  stops: Stop[];
  routes: RouteMeta[];
  mapData: MapMetadata | null;
  activeSidebarSlot: string;
  setActiveSidebarSlot: (slot: string) => void;
  hasActiveSearch: boolean;
  setHasActiveSearch: (hasSearch: boolean) => void;
  setSlotsDataCallback?: (slots: SlotPrediction[]) => void;
}

const TIME_SLOTS = [
  { label: "06:00 – 08:00", time: "06:25", short: "6 – 8", title: "Early Morning" },
  { label: "08:00 – 10:00", time: "08:25", short: "8 – 10", title: "Morning Peak" },
  { label: "10:00 – 12:00", time: "10:25", short: "10 – 12", title: "Late Morning" },
  { label: "12:00 – 14:00", time: "12:25", short: "12 – 2", title: "Midday" },
  { label: "14:00 – 16:00", time: "14:25", short: "2 – 4", title: "Afternoon" },
  { label: "16:00 – 20:00", time: "17:00", short: "4 – 8", title: "Evening Peak" },
];

export default function PassengerPortal({
  stops,
  routes,
  mapData,
  activeSidebarSlot,
  setActiveSidebarSlot,
  hasActiveSearch,
  setHasActiveSearch,
  setSlotsDataCallback,
}: PassengerPortalProps) {
  // Search parameters: Empty initially till selected
  const [fromStop, setFromStop] = useState("");
  const [toStop, setToStop] = useState("");
  const [travelDate, setTravelDate] = useState(formatDate(new Date()));
  const [timeSlot, setTimeSlot] = useState("08:00 – 10:00");
  const [filterService, setFilterService] = useState("ANY");

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search Results
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [serviceResults, setServiceResults] = useState<any[]>([]);
  const [slotsData, setSlotsData] = useState<SlotPrediction[]>([]);

  // Auto-fill FROM and TO when user selects a specific Service Number
  const handleServiceChange = (newService: string) => {
    setFilterService(newService);
    setError(null);
    if (newService !== "ANY") {
      const selectedRoute = routes.find(
        (r) => r.service_id.toUpperCase() === newService.toUpperCase()
      );
      if (selectedRoute) {
        setFromStop(selectedRoute.start_stop_id);
        setToStop(selectedRoute.end_stop_id);
      }
    }
  };

  // Sync sidebar slot changes to active slot
  useEffect(() => {
    if (activeSidebarSlot && activeSidebarSlot !== timeSlot) {
      setTimeSlot(activeSidebarSlot);
      if (hasActiveSearch && availableServices.length > 0) {
        fetchForecastForSlot(activeSidebarSlot, availableServices);
      }
    }
  }, [activeSidebarSlot]);

  const handleSwap = () => {
    if (!fromStop && !toStop) return;
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
    setError(null);
  };

  const getTimeValueForSlot = (slotLabel: string) => {
    const found = TIME_SLOTS.find(
      (s) => s.label === slotLabel || slotLabel.startsWith(s.short)
    );
    return found ? found.time : "08:25";
  };

  const fetchForecastForSlot = async (slotLabel: string, services: string[]) => {
    const depTime = getTimeValueForSlot(slotLabel);
    const results: any[] = [];

    for (const sid of services) {
      try {
        const pred = await api.predictDemand({
          from_stop_id: fromStop,
          to_stop_id: toStop,
          date: travelDate,
          time_slot: depTime,
          service_id: sid,
        });

        const pct = pred.outbound_pct;
        const addBus = pct >= 0.8;

        results.push({
          service_id: sid,
          from_stop_id: fromStop,
          to_stop_id: toStop,
          passengers: pred.outbound,
          inbound_passengers: pred.inbound,
          crowd_label: pred.outbound_level,
          crowd_icon: pred.outbound_crowd.split(" ")[1] || "🟢",
          badge_cls:
            pred.outbound_level === "Low"
              ? "badge-low"
              : pred.outbound_level === "Moderate"
              ? "badge-mod"
              : "badge-high",
          add_bus: addBus,
          pct: pct,
        });
      } catch (e) {
        console.error(e);
      }
    }

    results.sort((a, b) => a.pct - b.pct);
    setServiceResults(results);
  };

  const handlePredict = async () => {
    if (!fromStop || !toStop) {
      setError("Please select both a departure (FROM) and destination (TO) stop, or choose a specific service number.");
      return;
    }

    if (fromStop === toStop) {
      setError("Boarding (FROM) and Alighting (TO) locations cannot be the same.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      // Find connecting services
      const servicesRes = await api.getServicesBetween(fromStop, toStop);
      let services = servicesRes.services;

      if (filterService !== "ANY") {
        services = services.filter((s) => s.toUpperCase() === filterService.toUpperCase());
      }

      if (!services || services.length === 0) {
        setError(
          "No direct bus service found for this stop combination. Try selecting major Coimbatore hubs (e.g. Ukkadam, Gandhipuram, Saibaba Colony, Singanallur, Ondipudur)."
        );
        setIsAnalyzing(false);
        return;
      }

      setAvailableServices(services);

      // Fetch batch slots for heatmap & sidebar
      const batchRes = await api.predictAllSlots({
        from_stop_id: fromStop,
        to_stop_id: toStop,
        date: travelDate,
        service_id: services[0],
      });
      setSlotsData(batchRes.slots || []);
      if (setSlotsDataCallback) {
        setSlotsDataCallback(batchRes.slots || []);
      }

      // Fetch results for current time slot
      await fetchForecastForSlot(timeSlot, services);

      // Brief animation transition
      setTimeout(() => {
        setIsAnalyzing(false);
        setHasActiveSearch(true);
        setActiveSidebarSlot(timeSlot);
      }, 700);
    } catch (err: any) {
      setIsAnalyzing(false);
      setError(err.message || "Failed to calculate crowd predictions.");
    }
  };

  const fromName = stops.find((s) => s.stop_id === fromStop)?.stop_name || (fromStop ? fromStop : "Origin");
  const toName = stops.find((s) => s.stop_id === toStop)?.stop_name || (toStop ? toStop : "Destination");

  // Format date display (e.g. "25 Sep")
  const dateFormatted = new Date(travelDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  // Format time display (e.g. "8 AM - 10 AM")
  const timeFormatted = timeSlot
    .replace("06:00 – 08:00", "6 AM – 8 AM")
    .replace("08:00 – 10:00", "8 AM – 10 AM")
    .replace("10:00 – 12:00", "10 AM – 12 PM")
    .replace("12:00 – 14:00", "12 PM – 2 PM")
    .replace("14:00 – 16:00", "2 PM – 4 PM")
    .replace("16:00 – 20:00", "4 PM – 8 PM");

  // ─────────────────────────────────────────────────────────────
  // 1. NEURAL ANALYSIS LOADING TRANSITION (Ponyo Theme)
  // ─────────────────────────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <div className="py-20 flex flex-col items-center justify-center animate-fadeIn">
        <div className="max-w-lg w-full p-8 rounded-3xl text-center bg-white border-2 border-[#e95c6c] shadow-2xl space-y-4 text-[#27456c]">
          <div className="w-16 h-16 rounded-2xl bg-[#e95c6c]/15 border border-[#e95c6c]/30 flex items-center justify-center mx-auto text-[#e95c6c]">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#27456c] tracking-wide">
              Forecasting Journey Demand
            </h3>
            <p className="text-xs text-[#47748b] mt-1 font-medium">
              Coimbatore Metropolitan Neural Transit Intelligence
            </p>
          </div>
          <div className="space-y-2 text-xs text-left bg-[#eef6fa] p-4 rounded-2xl border border-[#99bfd5]/50">
            <div className="flex items-center gap-2 text-[#e95c6c] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#e95c6c] animate-ping"></span>
              Analyzing corridor {fromName} → {toName}...
            </div>
            <div className="flex items-center gap-2 text-[#27456c] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#99bfd5]"></span>
              Querying neural network LSTM sequence model...
            </div>
            <div className="flex items-center gap-2 text-[#47748b] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Synchronizing transit commuter surge data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. RESULTS VIEW (Matching Hand-Drawn Sketch 2)
  // ─────────────────────────────────────────────────────────────
  if (hasActiveSearch && serviceResults.length > 0) {
    const bestService = serviceResults[0];

    return (
      <div className="space-y-4 animate-fadeIn pb-8 max-w-5xl mx-auto w-full">
        {/* ── TOP NAVIGATION / BACK BUTTON ── */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setHasActiveSearch(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1f2329] hover:bg-[#AF4B47] text-[#EDDECB] hover:text-white border border-[#6B8D8A]/30 shadow-lg text-xs font-black uppercase tracking-wider transition-all transform active:scale-95 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5] text-[#F3B763] group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
            <span>Back to Search</span>
          </button>

          <span className="text-xs font-bold text-[#B5C3C4] bg-[#252a32] border border-[#6B8D8A]/30 px-3 py-1 rounded-full">
            Crowd Forecast Analysis
          </span>
        </div>

        {/* ── TOP MAP CARD (Focused on Route Corridor with Date & Info) ── */}
        <div className="bg-[#1f2329] rounded-3xl p-5 shadow-2xl border border-[#6B8D8A]/30 space-y-3">
          {mapData && (
            <LeafletJourneyMap
              fromStopId={fromStop}
              toStopId={toStop}
              serviceId={availableServices[0]}
              stopCoords={mapData.stop_coords}
              stopNames={mapData.stop_names}
              routeGeometry={mapData.route_geometry}
              height="280px"
            />
          )}

          {/* Under Map Info Bar (from A -> B | 25 Sep 8 AM-10 AM) */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="text-base font-extrabold text-[#EDDECB] flex items-center gap-2">
                <span>from</span>
                <span className="text-[#F3B763] underline decoration-[#F3B763]/50 underline-offset-4 font-bold">
                  {fromName}
                </span>
                <span>→</span>
                <span className="text-[#F3B763] underline decoration-[#F3B763]/50 underline-offset-4 font-bold">
                  {toName}
                </span>
              </div>
              <div className="text-xs text-[#B5C3C4] font-mono mt-0.5 font-bold">
                📅 {dateFormatted} &nbsp;•&nbsp; 🕐 {timeFormatted}
              </div>
            </div>

            <button
              onClick={() => setHasActiveSearch(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#252a32] hover:bg-[#AF4B47] text-[#EDDECB] border border-[#6B8D8A]/30 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F3B763]" />
              Edit Journey
            </button>
          </div>
        </div>

        {/* ── MIDDLE CARD: AVAILABLE BUS SERVICES ── */}
        <div className="bg-[#1f2329] rounded-3xl p-5 shadow-2xl border border-[#6B8D8A]/30">
          <div className="mb-3">
            <h3 className="text-base font-black text-[#EDDECB] uppercase tracking-wide">
              Available bus services:
            </h3>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-xs font-extrabold text-[#B5C3C4] uppercase tracking-wider border-b border-[#6B8D8A]/20 bg-[#16181d] rounded-t-xl">
            <div className="col-span-4 sm:col-span-3">Route</div>
            <div className="col-span-2 text-center sm:text-left">Service</div>
            <div className="col-span-3 text-center sm:text-left">Expected passengers</div>
            <div className="col-span-3 sm:col-span-2 text-center">Crowd level</div>
            <div className="col-span-0 sm:col-span-2 text-right hidden sm:block">Additional bus</div>
          </div>

          {/* Service Rows */}
          <div className="divide-y divide-[#6B8D8A]/15 mt-1">
            {serviceResults.map((r) => {
              let crowdColorText = "text-[#96BCBB]";
              let badgeBg = "bg-[#96BCBB]/15 border-[#96BCBB]/30";
              if (r.crowd_label === "Moderate") {
                crowdColorText = "text-[#F3B763]";
                badgeBg = "bg-[#F3B763]/20 border-[#F3B763]/40";
              } else if (r.crowd_label === "High") {
                crowdColorText = "text-[#AF4B47]";
                badgeBg = "bg-[#AF4B47]/25 border-[#AF4B47]/50";
              }

              return (
                <div
                  key={r.service_id}
                  className="grid grid-cols-12 items-center p-3 hover:bg-[#252a32]/60 transition-colors"
                >
                  <div className="col-span-4 sm:col-span-3 font-bold text-xs text-[#EDDECB] truncate">
                    {fromName} → {toName}
                  </div>
                  <div className="col-span-2 font-black text-sm text-[#F3B763] font-mono">
                    {r.service_id}
                  </div>
                  <div className="col-span-3 text-center sm:text-left text-sm font-extrabold text-[#EDDECB] font-mono">
                    {r.passengers}{" "}
                    <span className="text-[11px] font-normal text-[#B5C3C4]">pax</span>
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeBg} ${crowdColorText}`}>
                      {r.crowd_icon} {r.crowd_label}
                    </span>
                  </div>
                  <div className="col-span-0 sm:col-span-2 text-right hidden sm:block font-bold text-xs text-[#B5C3C4] font-mono">
                    {r.add_bus ? (
                      <span className="text-[#F3B763] font-extrabold">Allocated</span>
                    ) : (
                      <span>No</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BOTTOM CARD: RECOMMENDED SERVICE ── */}
        {bestService && (
          <div className="bg-[#242930] rounded-3xl p-5 shadow-2xl border-2 border-[#F3B763]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-[#F3B763] uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F3B763]" />
                Recommended service
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#AF4B47] text-[#EDDECB]">
                Optimal Seating Availability
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-[#191c22] p-4 rounded-2xl border border-[#6B8D8A]/30">
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Route</div>
                <div className="text-sm font-bold text-[#EDDECB]">{fromName} → {toName}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Service Line</div>
                <div className="text-base font-black text-[#F3B763] font-mono">Route {bestService.service_id}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Expected Passengers</div>
                <div className="text-lg font-black text-[#EDDECB] font-mono">{bestService.passengers} pax</div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Crowd Level</div>
                <div className="text-sm font-extrabold text-[#F3B763] flex items-center gap-1 mt-0.5">
                  {bestService.crowd_icon} {bestService.crowd_label}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[#B5C3C4] font-medium">
              <span>Additional Bus: <strong>{bestService.add_bus ? "Allocated" : "No (Normal Fleet)"}</strong></span>
              <span className="italic text-[#B5C3C4]/70">⚡ Verified by RideCast LSTM inference</span>
            </div>
          </div>
        )}

        {/* 6-Slot Timeline Grid */}
        <CrowdHeatmapGrid
          slots={slotsData}
          selectedSlotTime={getTimeValueForSlot(timeSlot)}
          onSelectSlot={(time) => {
            const found = TIME_SLOTS.find(
              (s) => s.time === time || time.startsWith(s.time.substring(0, 2))
            );
            if (found) {
              setTimeSlot(found.label);
              setActiveSidebarSlot(found.label);
              fetchForecastForSlot(found.label, availableServices);
            }
          }}
          loading={false}
        />

        {/* Feedback Widget */}
        <FeedbackWidget
          fromStop={fromName}
          toStop={toName}
          timeSlot={timeSlot}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. STARTING SEARCH BUSES PAGE (Zero-Scroll 2-Column Minimalist)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto w-full">
      {/* Centered Page Title Header (Pure Minimalist, No Subtitle) */}
      <div className="text-center pb-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#F3B763] tracking-widest uppercase font-mono">
          SEARCH BUSES
        </h1>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-[#AF4B47]/20 border border-[#AF4B47]/40 text-[#EDDECB] text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#AF4B47] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#F3B763]">Route Notice</p>
            <p className="text-xs text-[#EDDECB] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Side-by-Side 2-Column Layout to Ensure Zero Vertical Scroll on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left: Landscape Rectangular Calendar with SELECT DATE label above */}
        <div className="md:col-span-6 space-y-1">
          <label className="block text-[11px] font-black text-[#EDDECB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#F3B763]" />
            SELECT DATE:
          </label>
          <SystemCalendar
            selectedDate={travelDate}
            onSelectDate={(dateStr) => setTravelDate(dateStr)}
          />
        </div>

        {/* Right: Minimalist Form Controls */}
        <div className="md:col-span-6 space-y-3 pt-0.5">
          {/* FROM */}
          <div>
            <label className="block text-[11px] font-black text-[#EDDECB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#AF4B47]" />
              FROM:
            </label>
            <select
              value={fromStop}
              onChange={(e) => {
                setFromStop(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#191c22] border-2 border-[#6B8D8A]/40 hover:border-[#F3B763] text-sm text-[#EDDECB] font-bold focus:outline-none focus:border-[#AF4B47] focus:ring-2 focus:ring-[#AF4B47]/30 cursor-pointer shadow-sm transition-all"
            >
              <option value="" disabled className="text-[#B5C3C4]/50">
                -- Select Origin / Departure Stop --
              </option>
              {stops.map((s) => (
                <option key={s.stop_id} value={s.stop_id} className="bg-[#191c22] text-[#EDDECB]">
                  {s.stop_name} ({s.stop_id})
                </option>
              ))}
            </select>
          </div>

          {/* SWAP BUTTON */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="w-7 h-7 rounded-full bg-[#191c22] hover:bg-[#252a32] text-[#EDDECB] hover:text-[#F3B763] border border-[#6B8D8A]/40 shadow-sm flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              title="Swap FROM and TO"
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          {/* TO */}
          <div>
            <label className="block text-[11px] font-black text-[#EDDECB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#AF4B47]" />
              TO:
            </label>
            <select
              value={toStop}
              onChange={(e) => {
                setToStop(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#191c22] border-2 border-[#6B8D8A]/40 hover:border-[#F3B763] text-sm text-[#EDDECB] font-bold focus:outline-none focus:border-[#AF4B47] focus:ring-2 focus:ring-[#AF4B47]/30 cursor-pointer shadow-sm transition-all"
            >
              <option value="" disabled className="text-[#B5C3C4]/50">
                -- Select Destination Stop --
              </option>
              {stops.map((s) => (
                <option key={s.stop_id} value={s.stop_id} className="bg-[#191c22] text-[#EDDECB]">
                  {s.stop_name} ({s.stop_id})
                </option>
              ))}
            </select>
          </div>

          {/* PREFERRED TIME SLOT */}
          <div>
            <label className="block text-[11px] font-black text-[#EDDECB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F3B763]" />
              PREFERED TIME SLOT:
            </label>
            <select
              value={timeSlot}
              onChange={(e) => {
                setTimeSlot(e.target.value);
                setActiveSidebarSlot(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#191c22] border-2 border-[#6B8D8A]/40 hover:border-[#F3B763] text-sm text-[#EDDECB] font-bold focus:outline-none focus:border-[#AF4B47] focus:ring-2 focus:ring-[#AF4B47]/30 cursor-pointer shadow-sm transition-all"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot.label} value={slot.label} className="bg-[#191c22] text-[#EDDECB]">
                  {slot.label} ({slot.title})
                </option>
              ))}
            </select>
          </div>

          {/* SPECIFY SERVICE NUMBER */}
          <div>
            <label className="block text-[11px] font-black text-[#EDDECB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-[#F3B763]" />
              SPECIFY SERVICE NUMBER:
            </label>
            <select
              value={filterService}
              onChange={(e) => handleServiceChange(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#191c22] border-2 border-[#6B8D8A]/40 hover:border-[#F3B763] text-sm text-[#EDDECB] font-bold focus:outline-none focus:border-[#AF4B47] focus:ring-2 focus:ring-[#AF4B47]/30 cursor-pointer shadow-sm uppercase font-mono transition-all"
            >
              <option value="ANY" className="bg-[#191c22] text-[#EDDECB]">ANY (All Direct Services)</option>
              {routes.map((r) => (
                <option key={r.service_id} value={r.service_id.toUpperCase()} className="bg-[#191c22] text-[#EDDECB]">
                  {r.service_id.toUpperCase()} — {r.route_name}
                </option>
              ))}
            </select>
          </div>

          {/* PREDICT CROWD BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePredict}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[#AF4B47]/30 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              🎯 PREDICT CROWD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
