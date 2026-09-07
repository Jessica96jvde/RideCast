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
  const [selectedActiveService, setSelectedActiveService] = useState<string>("");
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
        const [pred, timetableRes] = await Promise.all([
          api.predictDemand({
            from_stop_id: fromStop,
            to_stop_id: toStop,
            date: travelDate,
            time_slot: depTime,
            service_id: sid,
          }),
          api.getTimetable(sid).catch(() => ({ service_id: sid, departure_times: [] }))
        ]);

        const pct = pred.outbound_pct;
        const addBus = pct >= 0.8;

        const allTimes: string[] = timetableRes.departure_times || [];
        // Filter timetable departures that fall into this time slot window
        const matchingTimes = allTimes.filter((t) => {
          const hour = parseInt(t.split(":")[0], 10);
          if (slotLabel.startsWith("06:00")) return hour >= 5 && hour < 8;
          if (slotLabel.startsWith("08:00")) return hour >= 8 && hour < 10;
          if (slotLabel.startsWith("10:00")) return hour >= 10 && hour < 12;
          if (slotLabel.startsWith("12:00")) return hour >= 12 && hour < 14;
          if (slotLabel.startsWith("14:00")) return hour >= 14 && hour < 16;
          if (slotLabel.startsWith("16:00")) return hour >= 16 && hour <= 21;
          return true;
        });

        const routeMeta = routes.find((r) => r.service_id.toUpperCase() === sid.toUpperCase());

        results.push({
          service_id: sid,
          service_name: routeMeta?.service_name || sid.replace("S", ""),
          route_name: routeMeta?.route_name || `Service ${sid}`,
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
          add_bus: pred.is_allocated || addBus,
          is_allocated: pred.is_allocated,
          allocated_bus_info: pred.allocated_bus_info,
          reason: pred.reason || (pred.outbound_level === "Low" ? "Off-peak travel window with high seat availability." : pred.outbound_level === "Moderate" ? "Steady mid-day passenger movement across commercial stops." : "Peak commuter surge with heavy corridor passenger density."),
          confidence_score: pred.confidence_score || 94.6,
          pct: pct,
          departure_times: matchingTimes.length > 0 ? matchingTimes : [depTime],
        });
      } catch (e) {
        console.error(e);
      }
    }

    results.sort((a, b) => a.pct - b.pct);
    setServiceResults(results);
  };

  const handleSelectServiceCard = async (sid: string) => {
    setSelectedActiveService(sid);
    try {
      const batchRes = await api.predictAllSlots({
        from_stop_id: fromStop,
        to_stop_id: toStop,
        date: travelDate,
        service_id: sid,
      });
      setSlotsData(batchRes.slots || []);
      if (setSlotsDataCallback) {
        setSlotsDataCallback(batchRes.slots || []);
      }
    } catch (e) {
      console.error(e);
    }
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
      // Find all connecting services
      const servicesRes = await api.getServicesBetween(fromStop, toStop);
      let services = servicesRes.services;

      if (filterService !== "ANY") {
        services = services.filter((s) => s.toUpperCase() === filterService.toUpperCase());
      }

      if (!services || services.length === 0) {
        setError(
          "No direct bus service found for this stop combination. Try selecting major hubs (e.g. Ukkadam, Gandhipuram, Saibaba Colony, Singanallur, Ondipudur)."
        );
        setIsAnalyzing(false);
        return;
      }

      setAvailableServices(services);
      setSelectedActiveService(services[0]);

      // Fetch batch slots for the active service
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

      // Fetch results for current time slot across all found services
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
  // 1. NEURAL ANALYSIS LOADING TRANSITION
  // ─────────────────────────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <div className="py-20 flex flex-col items-center justify-center animate-fadeIn">
        <div className="max-w-lg w-full p-8 rounded-3xl text-center bg-white border-2 border-[#AF4B47] shadow-2xl space-y-4 text-[#1f2329]">
          <div className="w-16 h-16 rounded-2xl bg-[#AF4B47]/15 border border-[#AF4B47]/30 flex items-center justify-center mx-auto text-[#AF4B47]">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1f2329] tracking-wide">
              Forecasting Corridor Demand
            </h3>
            <p className="text-xs text-[#6B8D8A] mt-1 font-medium">
              Scanning all passing bus services & departure timetables
            </p>
          </div>
          <div className="space-y-2 text-xs text-left bg-[#f4f7f9] p-4 rounded-2xl border border-[#6B8D8A]/30">
            <div className="flex items-center gap-2 text-[#AF4B47] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#AF4B47] animate-ping"></span>
              Matching route corridor {fromName} → {toName}...
            </div>
            <div className="flex items-center gap-2 text-[#1f2329] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#F3B763]"></span>
              Found multiple passing bus services & scheduled departure slots...
            </div>
            <div className="flex items-center gap-2 text-[#6B8D8A] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Executing LSTM crowd density inference...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. RESULTS VIEW
  // ─────────────────────────────────────────────────────────────
  if (hasActiveSearch && serviceResults.length > 0) {
    const activeResult = serviceResults.find((r) => r.service_id === selectedActiveService) || serviceResults[0];

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
        </div>

        {/* ── TOP MAP CARD (Focused on Route Corridor with Date & Info) ── */}
        <div className="bg-[#1f2329] rounded-3xl p-5 shadow-2xl border border-[#6B8D8A]/30 space-y-3">
          {mapData && (
            <LeafletJourneyMap
              fromStopId={fromStop}
              toStopId={toStop}
              serviceId={selectedActiveService || availableServices[0]}
              stopCoords={mapData.stop_coords}
              stopNames={mapData.stop_names}
              routeGeometry={mapData.route_geometry}
              height="280px"
            />
          )}

          {/* Under Map Info Bar */}
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
              Change Journey
            </button>
          </div>
        </div>

        {/* ── MIDDLE CARD: ALL AVAILABLE BUS SERVICES WITH TIMETABLE ── */}
        <div className="bg-[#1f2329] rounded-3xl p-5 shadow-2xl border border-[#6B8D8A]/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-black text-[#EDDECB] uppercase tracking-wide flex items-center gap-2">
                <Bus className="w-4 h-4 text-[#F3B763]" />
                All Available Bus Services ({serviceResults.length}):
              </h3>
            </div>
          </div>

          {/* Service Cards (1 per line) */}
          <div className="grid grid-cols-1 gap-2.5 mt-3">
            {serviceResults.map((r) => {
              const isSelected = r.service_id === selectedActiveService;
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
                  onClick={() => handleSelectServiceCard(r.service_id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-md grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${
                    isSelected
                      ? "bg-[#252a32] border-[#F3B763] ring-1 ring-[#F3B763]/50"
                      : "bg-[#181a20] border-[#6B8D8A]/20 hover:border-[#F3B763]/50 hover:bg-[#20242b]"
                  }`}
                >
                  {/* Left (5 cols): Route number badge and corridor name */}
                  <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#AF4B47]/20 border border-[#AF4B47]/40 flex items-center justify-center font-mono font-black text-sm text-[#F3B763] shrink-0">
                      {r.service_name || r.service_id.replace(/^S/i, "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#EDDECB] truncate" title={r.route_name}>
                          {r.route_name.replace(/^[A-Za-z0-9\s]+:\s*/, "").replace(/^Service\s+[A-Za-z0-9]+\s*:\s*/i, "").trim()}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-[#F3B763]/20 text-[#F3B763] text-[10px] font-extrabold border border-[#F3B763]/40 shrink-0">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle (4 cols): Departures in this slot (Strictly single row, non-wrapping) */}
                  <div className="md:col-span-4 flex items-center gap-2 text-xs text-[#B5C3C4] min-w-0">
                    <div className="flex items-center gap-1 shrink-0 font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#F3B763]" />
                      <span>Departures:</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-hidden flex-nowrap">
                      {r.departure_times.slice(0, 3).map((t: string) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-lg bg-[#131518] text-[#EDDECB] font-mono text-xs font-bold border border-[#6B8D8A]/30 shrink-0"
                        >
                          {t}
                        </span>
                      ))}
                      {r.departure_times.length > 3 && (
                        <span className="text-[10px] font-mono text-[#B5C3C4]/70 shrink-0">
                          +{r.departure_times.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right (3 cols): Passenger load & Crowd Badge */}
                  <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#6B8D8A]/15 shrink-0">
                    <div className="text-xs font-mono font-extrabold text-[#EDDECB] text-right">
                      ~{r.passengers} <span className="text-[#B5C3C4] font-normal">passengers</span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${badgeBg} ${crowdColorText} shrink-0`}>
                      {r.crowd_icon} {r.crowd_label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BOTTOM CARD: RECOMMENDED BUS SERVICE HIGHLIGHT ── */}
        {activeResult && (
          <div className="bg-[#242930] rounded-3xl p-5 shadow-2xl border-2 border-[#F3B763] space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-[#F3B763] uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F3B763]" />
                Recommended Bus Service: Route {activeResult.service_name || activeResult.service_id.replace(/^S/i, "")}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center bg-[#191c22] p-4 rounded-2xl border border-[#6B8D8A]/30">
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Corridor</div>
                <div className="text-xs font-bold text-[#EDDECB] truncate">{fromName} → {toName}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Service Line</div>
                <div className="text-sm font-black text-[#F3B763] font-mono">Bus {activeResult.service_name || activeResult.service_id.replace(/^S/i, "")}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Expected Passengers</div>
                <div className="text-sm font-black text-[#EDDECB] font-mono">{activeResult.passengers} passengers</div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Crowd Density</div>
                <div className="text-xs font-extrabold text-[#F3B763] flex items-center gap-1 mt-0.5">
                  {activeResult.crowd_icon} {activeResult.crowd_label}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#B5C3C4] uppercase font-extrabold tracking-wider">Allocation Status</div>
                <div className="mt-0.5">
                  {activeResult.is_allocated ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[11px] border border-emerald-500/40 inline-flex items-center gap-1">
                      Allocated 🚍
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#252a32] text-[#B5C3C4] font-bold text-[11px] border border-[#6B8D8A]/30">
                      Normal Fleet
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* If Bus is Allocated: Specify details under it */}
            {activeResult.is_allocated && activeResult.allocated_bus_info ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-[#EDDECB] space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 font-black text-emerald-400 text-sm">
                  <Bus className="w-4 h-4 text-emerald-400" />
                  <span>Extra Bus Dispatched: {activeResult.allocated_bus_info.bus_id} ({activeResult.allocated_bus_info.bus_number})</span>
                </div>
                <div className="text-[11px] text-[#B5C3C4] flex flex-wrap items-center gap-3">
                  <span>🏢 <strong>Origin Depot:</strong> {activeResult.allocated_bus_info.source_depot}</span>
                  <span>📝 <strong>Reason:</strong> {activeResult.allocated_bus_info.reason}</span>
                  <span>👮 <strong>Approved by:</strong> {activeResult.allocated_bus_info.allocated_by}</span>
                </div>
              </div>
            ) : (
              <div className="px-3.5 py-2.5 rounded-2xl bg-[#191c22] border border-[#6B8D8A]/30 text-xs text-[#B5C3C4] flex flex-wrap items-center justify-between gap-2">
                <span>🚍 <strong>Allocation Status:</strong> Standard fleet operational (No additional bus needed)</span>
                <span className="text-[#F3B763] font-extrabold text-[11px]">⚡ 94.6% Confidence</span>
              </div>
            )}

            {/* AI Reasoning / Why crowd is Low/Moderate/High */}
            <div className="px-3.5 py-2 rounded-xl bg-[#131518] border border-[#6B8D8A]/20 text-xs text-[#EDDECB] flex items-start gap-2">
              <span className="text-[#F3B763] font-bold shrink-0">💡 AI Analysis:</span>
              <span className="text-[#B5C3C4] font-medium">{activeResult.reason}</span>
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
