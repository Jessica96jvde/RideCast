"use client";

/**
 * RideCast - Multi-Step Dispatch Standby Bus Modal Component
 * ==========================================================
 * Provides a guided 3-step wizard workflow for Transport Authority officers (Ravi)
 * to reinforce congested transit corridors with standby fleet buses:
 *
 * 1. Step 1: Select Shift / Time Slot Window (e.g. Morning Peak, Evening Peak).
 *    - Defaults to the overcrowded / attention shift.
 *    - Bottom buttons: [Cancel] and [Next →].
 *
 * 2. Step 2: Select Specific Target Departure Time (e.g. 17:10, 17:15, 08:25...).
 *    - Defaults to the recommended peak departure time with highest priority/crowd.
 *    - Bottom buttons: [← Back] and [Next →].
 *
 * 3. Step 3: Select Standby Bus & Authorize Dispatch.
 *    - Shows reserve buses ranked by proximity (lowest distance on top, default selected).
 *    - Allows operational note selection and officer signature (Ravi).
 *    - Bottom buttons: [← Back] and [Dispatch Bus 🚀].
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Bus,
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Sparkles,
  Fuel,
  Users,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Clock,
  Flame,
  Calendar,
  Layers,
} from "lucide-react";
import { BusRecommendation, AuthorityOverview } from "@/lib/types";
import { api } from "@/lib/api";
import {
  AUTHORITY_TIME_SLOTS,
  analyzeRouteTimeSlots,
  AnalyzedTimeSlot,
  SlotDeparture,
} from "@/lib/authorityTimeSlotUtils";

interface SmartAllocationModalProps {
  isOpen: boolean;
  serviceId: string;
  targetDate: string;
  initialSlotId?: string;
  initialDepartureTime?: string;
  overview?: AuthorityOverview | null;
  onClose: () => void;
  onAllocationSuccess: () => void;
}

const STANDARDIZED_REASONS = [
  "Predicted overcrowding surge",
  "Peak-hour commuter demand",
  "Special event crowd surge",
  "Service disruption mitigation",
  "Insufficient scheduled capacity",
  "Emergency reserve deployment",
];

// Helper to format clean user-facing route name
function formatRouteName(serviceId: string): string {
  if (!serviceId) return "Selected Route";
  if (serviceId.startsWith("S") && /^\d+/.test(serviceId.substring(1))) {
    return `Route ${serviceId.substring(1)}`;
  }
  if (!serviceId.toLowerCase().includes("route")) {
    return `Route ${serviceId}`;
  }
  return serviceId;
}

export default function SmartAllocationModal({
  isOpen,
  serviceId,
  targetDate,
  initialSlotId,
  initialDepartureTime,
  overview,
  onClose,
  onAllocationSuccess,
}: SmartAllocationModalProps) {
  // Wizard step state: 1 (Shift) -> 2 (Departure Time) -> 3 (Standby Bus)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Success state after deployment
  const [isSuccess, setIsSuccess] = useState(false);
  const [dispatchedDetails, setDispatchedDetails] = useState<{
    busId: string;
    busNumber: string;
    depotName: string;
    fuelType: string;
    distanceKm: number;
    serviceId: string;
    routeTitle: string;
    slotTitle: string;
    departureTime: string;
    reason: string;
    date: string;
    allocatedBy: string;
  } | null>(null);

  // Recommendations & Selections
  const [recommendations, setRecommendations] = useState<BusRecommendation[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("slot_2");
  const [selectedDepartureTime, setSelectedDepartureTime] = useState<string>("");
  const [reason, setReason] = useState(STANDARDIZED_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [useCustomReason, setUseCustomReason] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanRouteTitle = formatRouteName(serviceId);

  // ---------------------------------------------------------------------------
  // 1. Analyze Route Time Slots & Departures
  // ---------------------------------------------------------------------------
  const analyzedRoute = useMemo(() => {
    const routeForecast = overview?.routes?.[serviceId] || {
      service_id: serviceId,
      route_name: `Service ${serviceId}`,
      origin: "ST001",
      dest: "ST049",
      origin_name: "Ukkadam",
      dest_name: "Vellamadai",
      expected_passengers: 520,
      normal_passengers: 420,
      buses_required: 1,
      crowd_level: "High",
      crowd_color: "#AF4B47",
      crowd_icon: "🔴",
      slot_predictions: [],
    };
    return analyzeRouteTimeSlots(serviceId, routeForecast as any);
  }, [serviceId, overview]);

  const timeSlots = analyzedRoute.timeSlots;

  // Active slot object based on selectedSlotId
  const currentSlot: AnalyzedTimeSlot = useMemo(() => {
    return timeSlots.find((s) => s.slotId === selectedSlotId) || timeSlots[1] || timeSlots[0];
  }, [timeSlots, selectedSlotId]);

  // Departures for the currently selected slot
  const currentSlotDepartures: SlotDeparture[] = useMemo(() => {
    return currentSlot.departures || [];
  }, [currentSlot]);

  // ---------------------------------------------------------------------------
  // 2. Lifecycle: Initialize Defaults when Modal Opens or serviceId changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen && serviceId) {
      setCurrentStep(1);
      setIsSuccess(false);
      setDispatchedDetails(null);
      setError(null);

      // 1. Determine Default Time Slot
      let defaultSlot = "slot_2"; // Morning Peak default
      if (initialSlotId && timeSlots.some((s) => s.slotId === initialSlotId)) {
        defaultSlot = initialSlotId;
      } else {
        // If there is an overcrowded slot that requires attention, pick the first one
        const attentionSlot = timeSlots.find((s) => s.requiresAttention || s.overcrowdedCount > 0);
        if (attentionSlot) {
          defaultSlot = attentionSlot.slotId;
        }
      }
      setSelectedSlotId(defaultSlot);

      // 2. Fetch Standby Bus Recommendations
      setLoading(true);
      api
        .getRecommendations(serviceId, targetDate)
        .then((res) => {
          // Sort recommendations ascending by distance
          const sorted = (res.recommendations || []).sort((a, b) => a.distance_km - b.distance_km);
          setRecommendations(sorted);
          if (sorted.length > 0) {
            setSelectedBusId(sorted[0].bus_id);
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to load bus recommendations.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, serviceId, targetDate, initialSlotId, timeSlots]);

  // Update selectedDepartureTime when slot changes
  useEffect(() => {
    if (currentSlotDepartures.length > 0) {
      if (initialDepartureTime && currentSlotDepartures.some((d) => d.time === initialDepartureTime)) {
        setSelectedDepartureTime(initialDepartureTime);
      } else {
        // Select the peak departure or the departure with maximum passengers
        const peak = currentSlotDepartures.find((d) => d.isPeak) || currentSlotDepartures[0];
        setSelectedDepartureTime(peak.time);
      }
    }
  }, [selectedSlotId, currentSlotDepartures, initialDepartureTime]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // 3. Dispatch Execution
  // ---------------------------------------------------------------------------
  const handleAllocate = async () => {
    if (!selectedBusId) return;

    setAllocating(true);
    setError(null);

    const slotSuffix = ` · ${currentSlot.title} (${selectedDepartureTime || currentSlot.peakDeparture.time})`;
    const baseReason = useCustomReason && customReason.trim() ? customReason.trim() : reason;
    const finalReason = `${baseReason}${slotSuffix}`;

    const selectedBus = recommendations.find((b) => b.bus_id === selectedBusId);

    try {
      await api.allocateBus({
        date: targetDate,
        service_id: serviceId,
        bus_id: selectedBusId,
        reason: finalReason,
        allocated_by: "Ravi",
      });

      setDispatchedDetails({
        busId: selectedBusId,
        busNumber: selectedBus?.bus_number || selectedBusId,
        depotName: selectedBus?.depot_name || "Coimbatore Depot",
        fuelType: selectedBus?.fuel_type || "Diesel / BS-VI",
        distanceKm: selectedBus?.distance_km ?? 0,
        serviceId,
        routeTitle: cleanRouteTitle,
        slotTitle: currentSlot.title,
        departureTime: selectedDepartureTime || currentSlot.peakDeparture.time,
        reason: finalReason,
        date: targetDate,
        allocatedBy: "Ravi (Transport Authority)",
      });

      setIsSuccess(true);
      // Trigger background update of standby fleet & dispatch history immediately
      onAllocationSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to commit allocation to database.");
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn text-[#EDDECB]">
      <div className="relative w-full max-w-2xl bg-[#1f2329] border border-[#6B8D8A]/40 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* ── Top Header Bar ── */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[#6B8D8A]/20">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                  isSuccess
                    ? "bg-emerald-500 text-white"
                    : "bg-[#AF4B47] text-[#EDDECB]"
                }`}
              >
                {isSuccess ? "DEPLOYED SUCCESSFULLY" : "Deploy A Bus"}
              </span>
              <span className="text-xs text-[#B5C3C4] font-medium font-mono">
                Date: {targetDate}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#16181d] text-[#F3B763] border border-[#6B8D8A]/30 text-xs font-mono font-bold">
                {cleanRouteTitle}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#EDDECB] mt-1.5 font-mono">
              {isSuccess
                ? "Bus Deployed Successfully!"
                : currentStep === 1
                ? "Step 1 of 3: Select Shift / Time Slot"
                : currentStep === 2
                ? "Step 2 of 3: Select Target Departure Time"
                : "Step 3 of 3: Select Standby Bus & Dispatch"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#B5C3C4] hover:text-[#EDDECB] p-2 rounded-xl bg-[#252a32] hover:bg-[#2e343e] border border-[#6B8D8A]/20 transition-colors cursor-pointer shrink-0"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Condition: Success Confirmation vs Wizard Content ── */}
        {isSuccess && dispatchedDetails ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-4 animate-fadeIn">
            {/* Success Hero Header */}
            <div className="text-center py-2 space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-[#EDDECB]">
                  Deployment Confirmed
                </h4>
                <p className="text-xs text-[#B5C3C4] max-w-md mx-auto mt-0.5">
                  The standby reserve bus has been authorized and dispatched to reinforce the corridor.
                </p>
              </div>
            </div>

            {/* Dispatch Summary Specification Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#181a20] border border-[#6B8D8A]/30 space-y-3.5 shadow-inner">
              <div className="text-[11px] font-black text-[#F3B763] uppercase tracking-wider border-b border-[#6B8D8A]/20 pb-2 flex items-center justify-between">
                <span>Dispatch Summary Specification</span>
                <span className="text-emerald-400 font-mono font-bold text-[10px]">● Live Synced</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Dispatched Vehicle */}
                <div className="p-3 rounded-xl bg-[#1f2329] border border-[#6B8D8A]/20 space-y-1">
                  <div className="text-[10px] text-[#B5C3C4] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Bus className="w-3 h-3 text-[#F3B763]" />
                    <span>Dispatched Vehicle</span>
                  </div>
                  <div className="font-mono font-black text-sm text-[#F3B763]">
                    {dispatchedDetails.busNumber}
                  </div>
                  <div className="text-[11px] text-[#B5C3C4] font-mono flex items-center gap-2">
                    <span>ID: {dispatchedDetails.busId}</span>
                    <span>•</span>
                    <span className="text-[#96BCBB]">{dispatchedDetails.fuelType}</span>
                  </div>
                </div>

                {/* 2. Assigned Route */}
                <div className="p-3 rounded-xl bg-[#1f2329] border border-[#6B8D8A]/20 space-y-1">
                  <div className="text-[10px] text-[#B5C3C4] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#AF4B47]" />
                    <span>Assigned Route</span>
                  </div>
                  <div className="font-extrabold text-sm text-[#EDDECB]">
                    {dispatchedDetails.routeTitle}
                  </div>
                  <div className="text-[11px] text-[#F3B763] font-mono font-bold">
                    Service {dispatchedDetails.serviceId}
                  </div>
                </div>

                {/* 3. Injected Departure & Shift */}
                <div className="p-3 rounded-xl bg-[#1f2329] border border-[#6B8D8A]/20 space-y-1">
                  <div className="text-[10px] text-[#B5C3C4] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[#F3B763]" />
                    <span>Injected Departure</span>
                  </div>
                  <div className="font-mono font-black text-sm text-[#EDDECB]">
                    {dispatchedDetails.departureTime}
                  </div>
                  <div className="text-[11px] text-[#B5C3C4]">
                    {dispatchedDetails.slotTitle}
                  </div>
                </div>

                {/* 4. Stationed Depot & Proximity */}
                <div className="p-3 rounded-xl bg-[#1f2329] border border-[#6B8D8A]/20 space-y-1">
                  <div className="text-[10px] text-[#B5C3C4] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#96BCBB]" />
                    <span>Stationed Depot</span>
                  </div>
                  <div className="font-bold text-sm text-[#EDDECB]">
                    {dispatchedDetails.depotName}
                  </div>
                  <div className="text-[11px] text-[#96BCBB] font-mono">
                    {dispatchedDetails.distanceKm} km deadhead distance
                  </div>
                </div>
              </div>

              {/* Operational Reason & Authorizing Officer */}
              <div className="p-3 rounded-xl bg-[#1f2329] border border-[#6B8D8A]/20 space-y-1 text-xs">
                <div className="flex items-center justify-between text-[10px] text-[#B5C3C4] font-bold uppercase tracking-wider">
                  <span>Operational Note</span>
                  <span className="flex items-center gap-1 text-[#96BCBB]">
                    <ShieldCheck className="w-3 h-3" />
                    Auth: {dispatchedDetails.allocatedBy}
                  </span>
                </div>
                <div className="text-xs text-[#EDDECB] font-medium italic">
                  "{dispatchedDetails.reason}"
                </div>
              </div>
            </div>

            {/* Real-time Update Confirmation Badge */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Standby fleet and dispatch history have been updated in real-time across the system.
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ── 3-Step Wizard Breadcrumb Bar ── */}
            <div className="grid grid-cols-3 gap-2 pt-3 pb-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 1
                    ? "bg-[#AF4B47] text-[#EDDECB] border-[#EDDECB]/40 shadow-md font-black"
                    : "bg-[#181a20] hover:bg-[#252a32] text-emerald-400 border-emerald-500/30 font-bold"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-black shrink-0 ${
                    currentStep > 1
                      ? "bg-emerald-500 text-[#121417]"
                      : currentStep === 1
                      ? "bg-[#EDDECB] text-[#121417]"
                      : "bg-[#252a32] text-[#B5C3C4]"
                  }`}
                >
                  {currentStep > 1 ? "✓" : "1"}
                </span>
                <span className="truncate">1. Shift</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 2
                    ? "bg-[#AF4B47] text-[#EDDECB] border-[#EDDECB]/40 shadow-md font-black"
                    : currentStep > 2
                    ? "bg-[#181a20] hover:bg-[#252a32] text-emerald-400 border-emerald-500/30 font-bold"
                    : "bg-[#181a20] text-[#B5C3C4]/60 border-[#6B8D8A]/20"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-black shrink-0 ${
                    currentStep > 2
                      ? "bg-emerald-500 text-[#121417]"
                      : currentStep === 2
                      ? "bg-[#EDDECB] text-[#121417]"
                      : "bg-[#252a32] text-[#B5C3C4]"
                  }`}
                >
                  {currentStep > 2 ? "✓" : "2"}
                </span>
                <span className="truncate">2. Departure</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                  currentStep === 3
                    ? "bg-[#AF4B47] text-[#EDDECB] border-[#EDDECB]/40 shadow-md font-black"
                    : "bg-[#181a20] text-[#B5C3C4]/60 border-[#6B8D8A]/20"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-black shrink-0 ${
                    currentStep === 3 ? "bg-[#EDDECB] text-[#121417]" : "bg-[#252a32] text-[#B5C3C4]"
                  }`}
                >
                  3
                </span>
                <span className="truncate">3. Standby Bus</span>
              </button>
            </div>

            {error && (
              <div className="my-2 p-3 rounded-2xl bg-[#AF4B47]/20 border border-[#AF4B47]/40 text-xs text-[#EDDECB] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#AF4B47] shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Wizard Content Area ── */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {/* ============================================================= */}
              {/* STEP 1: SELECT SHIFT / TIME SLOT WINDOW                       */}
              {/* ============================================================= */}
              {currentStep === 1 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="text-xs text-[#B5C3C4] flex items-center justify-between">
                    <span>Select the operational shift requiring additional bus deployment:</span>
                    <span className="text-[11px] font-bold text-[#F3B763]">
                      {timeSlots.filter((s) => s.requiresAttention).length} Overcrowded Shift(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlotId === slot.slotId;
                      const isOvercrowded = slot.requiresAttention || slot.overcrowdedCount > 0;

                      return (
                        <div
                          key={slot.slotId}
                          onClick={() => setSelectedSlotId(slot.slotId)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#252a32] border-[#F3B763] ring-2 ring-[#F3B763]/40 shadow-lg shadow-[#F3B763]/10"
                              : "bg-[#181a20] hover:bg-[#252a32]/60 border-[#6B8D8A]/25"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-[#EDDECB]">
                                  {slot.title}
                                </span>
                                {isOvercrowded && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#AF4B47]/25 text-[#F3B763] border border-[#AF4B47]/40 text-[10px] font-black uppercase">
                                    High Surge
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono font-bold text-[#F3B763] mt-0.5">
                                {slot.window}
                              </div>
                            </div>

                            <input
                              type="radio"
                              name="shiftSlot"
                              checked={isSelected}
                              onChange={() => setSelectedSlotId(slot.slotId)}
                              className="w-4 h-4 text-[#F3B763] accent-[#F3B763] cursor-pointer mt-1"
                            />
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#6B8D8A]/20 flex items-center justify-between text-xs text-[#B5C3C4]">
                            <span>{slot.totalDepartures} scheduled trips</span>
                            <span className="font-mono font-black text-[#EDDECB]">
                              ~{slot.totalPassengers} pax
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* STEP 2: SELECT SPECIFIC TARGET DEPARTURE TIME                 */}
              {/* ============================================================= */}
              {currentStep === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3 rounded-2xl bg-[#181a20] border border-[#6B8D8A]/25 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[#B5C3C4]">Selected Shift: </span>
                      <strong className="text-[#F3B763]">{currentSlot.title}</strong>
                      <span className="text-[#B5C3C4]"> ({currentSlot.window})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[11px] text-[#F3B763] hover:underline font-bold"
                    >
                      Change Shift →
                    </button>
                  </div>

                  <div className="text-xs text-[#B5C3C4]">
                    Choose the departure trip where the extra bus will be injected (recommended peak time selected):
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentSlotDepartures.map((dep, idx) => {
                      const isSelected = selectedDepartureTime === dep.time;
                      const isOvercrowded = dep.passengers > 70;

                      return (
                        <div
                          key={`${dep.time}-${idx}`}
                          onClick={() => setSelectedDepartureTime(dep.time)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#252a32] border-[#F3B763] ring-2 ring-[#F3B763]/40 shadow-lg shadow-[#F3B763]/10"
                              : "bg-[#181a20] hover:bg-[#252a32]/60 border-[#6B8D8A]/25"
                          }`}
                        >
                          {dep.isPeak && (
                            <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-[#F3B763] text-[#121417] text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Recommended Peak Priority
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-base text-[#F3B763]">
                                  {dep.time}
                                </span>
                                {isOvercrowded && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#AF4B47]/20 text-[#AF4B47] border border-[#AF4B47]/30 text-[10px] font-bold">
                                    +{dep.excessPax} Overcrowded
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#B5C3C4] mt-0.5">
                                Expected crowd:{" "}
                                <strong className="text-[#EDDECB] font-mono">
                                  {dep.passengers} passengers
                                </strong>
                              </div>
                            </div>

                            <input
                              type="radio"
                              name="departureTrip"
                              checked={isSelected}
                              onChange={() => setSelectedDepartureTime(dep.time)}
                              className="w-4 h-4 text-[#F3B763] accent-[#F3B763] cursor-pointer mt-1"
                            />
                          </div>

                          {/* Capacity Status Pill */}
                          <div className="mt-3 pt-2 border-t border-[#6B8D8A]/20 flex items-center justify-between text-[11px]">
                            <span className="text-[#B5C3C4]">Occupancy:</span>
                            <span
                              className={`font-bold font-mono ${
                                isOvercrowded
                                  ? "text-red-400"
                                  : dep.passengers >= 50
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {dep.occupancyPct}% of bus capacity
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* STEP 3: SELECT STANDBY BUS & DISPATCH                         */}
              {/* ============================================================= */}
              {currentStep === 3 && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* Selected Target Summary Pill */}
                  <div className="p-3 rounded-2xl bg-[#181a20] border border-[#6B8D8A]/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#F3B763]" />
                      <span>
                        Injecting extra bus at:{" "}
                        <strong className="text-[#F3B763] font-mono">{selectedDepartureTime}</strong>{" "}
                        ({currentSlot.title})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[11px] text-[#F3B763] hover:underline font-bold"
                    >
                      Change Departure →
                    </button>
                  </div>

                  {/* Standby Buses List (Ranked by proximity with lowest distance first) */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-[#B5C3C4] uppercase tracking-wider flex items-center justify-between">
                      <span>Available Standby Buses ({recommendations.length})</span>
                      <span className="text-[10px] text-[#96BCBB] font-mono lowercase">
                        sorted by closest depot distance
                      </span>
                    </div>

                    {loading ? (
                      <div className="py-10 text-center text-[#B5C3C4] text-xs flex flex-col items-center gap-2 bg-[#181a20] rounded-2xl border border-[#6B8D8A]/20">
                        <Loader2 className="w-6 h-6 animate-spin text-[#F3B763]" />
                        Calculating optimal depot proximity distances...
                      </div>
                    ) : recommendations.length === 0 ? (
                      <div className="py-8 text-center text-[#B5C3C4] text-xs bg-[#181a20] rounded-2xl border border-[#6B8D8A]/20 p-6">
                        No standby buses are currently available for allocation on this date.
                      </div>
                    ) : (
                      recommendations.map((bus, idx) => {
                        const isSelected = selectedBusId === bus.bus_id;

                        return (
                          <div
                            key={bus.bus_id}
                            onClick={() => setSelectedBusId(bus.bus_id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-wrap items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-[#252a32] border-[#F3B763] ring-2 ring-[#F3B763]/40 shadow-lg shadow-[#F3B763]/10"
                                : "bg-[#181a20] hover:bg-[#252a32]/60 border-[#6B8D8A]/25"
                            }`}
                          >
                            {idx === 0 && (
                              <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-[#96BCBB] text-[#121417] text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Nearest Depot Match · Lowest Deadhead Distance
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-[#F3B763] font-mono">
                                  {bus.bus_number}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-[#1f2329] text-[10px] font-semibold text-[#96BCBB] border border-[#6B8D8A]/30">
                                  {bus.depot_name}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-[#96BCBB]/15 text-[#96BCBB] text-[10px] font-bold">
                                  Standby (Ready)
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-[#B5C3C4] mt-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-[#F3B763]" />
                                  <strong className="text-[#EDDECB] font-mono font-bold">
                                    {bus.distance_km} km
                                  </strong>{" "}
                                  from {bus.route_start_name || "Route Start"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Fuel className="w-3.5 h-3.5 text-[#96BCBB]" />
                                  {bus.fuel_type}
                                </span>
                              </div>
                            </div>

                            <div>
                              <input
                                type="radio"
                                name="selectedBus"
                                checked={isSelected}
                                onChange={() => setSelectedBusId(bus.bus_id)}
                                className="w-4 h-4 text-[#F3B763] accent-[#F3B763] cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Standardized Operational Reason Selector */}
                  <div className="pt-2 space-y-2">
                    <label className="block text-xs font-black text-[#EDDECB] uppercase tracking-wider">
                      Operational Reason for Dispatch
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {STANDARDIZED_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setReason(r);
                            setUseCustomReason(false);
                          }}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            !useCustomReason && reason === r
                              ? "bg-[#AF4B47] text-[#EDDECB] border-[#EDDECB]/40 shadow-sm"
                              : "bg-[#181a20] text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32] border-[#6B8D8A]/25"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {/* Custom Reason Toggle */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setUseCustomReason(!useCustomReason)}
                        className="text-[11px] text-[#F3B763] hover:underline font-bold"
                      >
                        {useCustomReason ? "← Use standardized reason" : "+ Enter custom operational note"}
                      </button>
                      {useCustomReason && (
                        <input
                          type="text"
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Specify operational context (e.g. Special festival crowd surge)"
                          className="mt-2 w-full px-3.5 py-2.5 rounded-xl bg-[#181a20] border border-[#6B8D8A]/40 text-xs text-[#EDDECB] focus:outline-none focus:border-[#F3B763]"
                        />
                      )}
                    </div>

                    {/* Officer Signature */}
                    <div className="flex items-center gap-2 text-[11px] text-[#B5C3C4] pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#96BCBB]" />
                      <span>
                        Authorizing Officer: <strong className="text-[#EDDECB]">Ravi</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Footer Navigation Actions ── */}
        <div className="pt-3.5 border-t border-[#6B8D8A]/20 flex items-center justify-between gap-3">
          {isSuccess ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-98 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done</span>
            </button>
          ) : (
            <>
              {currentStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-2xl bg-[#252a32] hover:bg-[#2e343e] text-[#B5C3C4] hover:text-[#EDDECB] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-[#6B8D8A]/25"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2.5 rounded-2xl bg-[#F3B763] hover:bg-[#e4a854] text-[#121417] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#F3B763]/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Next: Select Departure Time</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 rounded-2xl bg-[#252a32] hover:bg-[#2e343e] text-[#B5C3C4] hover:text-[#EDDECB] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-[#6B8D8A]/25 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2.5 rounded-2xl bg-[#F3B763] hover:bg-[#e4a854] text-[#121417] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#F3B763]/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Next: Select Standby Bus</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2.5 rounded-2xl bg-[#252a32] hover:bg-[#2e343e] text-[#B5C3C4] hover:text-[#EDDECB] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-[#6B8D8A]/25 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAllocate}
                    disabled={allocating || !selectedBusId || recommendations.length === 0}
                    className="px-6 py-2.5 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#AF4B47]/25 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {allocating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authorizing Dispatch...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Dispatch Bus
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

