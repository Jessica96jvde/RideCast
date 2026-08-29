"use client";

import React, { useState, useEffect } from "react";
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
  Users
} from "lucide-react";
import { BusRecommendation } from "@/lib/types";
import { api } from "@/lib/api";

interface SmartAllocationModalProps {
  isOpen: boolean;
  serviceId: string;
  targetDate: string;
  onClose: () => void;
  onAllocationSuccess: () => void;
}

export default function SmartAllocationModal({
  isOpen,
  serviceId,
  targetDate,
  onClose,
  onAllocationSuccess,
}: SmartAllocationModalProps) {
  const [recommendations, setRecommendations] = useState<BusRecommendation[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [reason, setReason] = useState("Peak commuter surge mitigation");
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serviceId) {
      setLoading(true);
      setError(null);
      api
        .getRecommendations(serviceId, targetDate)
        .then((res) => {
          setRecommendations(res.recommendations);
          if (res.recommendations.length > 0) {
            setSelectedBusId(res.recommendations[0].bus_id);
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to load bus recommendations.");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, serviceId, targetDate]);

  if (!isOpen) return null;

  const handleAllocate = async () => {
    if (!selectedBusId) return;

    setAllocating(true);
    setError(null);

    try {
      await api.allocateBus({
        date: targetDate,
        service_id: serviceId,
        bus_id: selectedBusId,
        reason: reason,
        allocated_by: "Officer Rajesh Kumar",
      });
      onAllocationSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit allocation to database.");
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Proximity Dispatch Engine
              </span>
              <span className="text-xs text-slate-400">Target Date: {targetDate}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">
              Dispatch Extra Bus to Route {serviceId}
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by Haversine proximity from Coimbatore depot hubs to route origin
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body: Recommendation List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              Calculating great-circle depot distances...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No idle buses available for allocation on this date.
            </div>
          ) : (
            recommendations.map((bus) => {
              const isSelected = selectedBusId === bus.bus_id;

              return (
                <div
                  key={bus.bus_id}
                  onClick={() => setSelectedBusId(bus.bus_id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-wrap items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10"
                      : "bg-slate-950/60 hover:bg-slate-800/40 border-slate-800"
                  }`}
                >
                  {bus.is_recommended && (
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Best Match · Nearest Hub
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-100">
                        {bus.bus_id}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ({bus.bus_number})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                        {bus.depot_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <strong>{bus.distance_km} km</strong> to {bus.route_start_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        {bus.capacity} seats
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-emerald-400" />
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
                      className="w-4 h-4 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Allocation Reason Input */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Allocation Rationale & Operational Notes
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Surge mitigation during morning office rush"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAllocate}
            disabled={allocating || !selectedBusId || recommendations.length === 0}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 active:scale-95"
          >
            {allocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Authorizing Dispatch...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Authorize & Commit Dispatch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
