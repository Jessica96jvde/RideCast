"use client";

/**
 * RideCast - Journey Search Form Component
 * =========================================
 * Form enabling passengers to select:
 * - Origin / Boarding bus stop.
 * - Destination / Alighting bus stop.
 * - Swap button to quickly reverse journey direction.
 * - Travel date (with shortcut chips for Today, Tomorrow, and Weekend).
 * - Departure time window (6 standardized shifts).
 * - Submission trigger running the LSTM inference forecast.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. Controlled Form Inputs:
 *    - React state variables (`fromStop`, `toStop`, `travelDate`, `timeSlot`) drive the inputs.
 *    - `onChange` events update the parent component's state.
 * 
 * 2. Asynchronous Loading State:
 *    - When `loading === true`, disables button and displays a rotating CSS spinner.
 */

import React, { useState } from "react";
import { ArrowUpDown, Calendar, Clock, MapPin, Search, Sparkles } from "lucide-react";
import { Stop, RouteMeta } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface JourneySearchProps {
  stops: Stop[];
  routes: RouteMeta[];
  fromStop: string;
  setFromStop: (s: string) => void;
  toStop: string;
  setToStop: (s: string) => void;
  travelDate: string;
  setTravelDate: (d: string) => void;
  timeSlot: string;
  setTimeSlot: (t: string) => void;
  onSearch: () => void;
  loading: boolean;
}

const TIME_SLOTS_OPTIONS = [
  { label: "06:00 AM – 08:00 AM (Early Morning)", value: "06:25" },
  { label: "08:00 AM – 10:00 AM (Morning Peak)", value: "08:25" },
  { label: "10:00 AM – 12:00 PM (Late Morning)", value: "10:25" },
  { label: "12:00 PM – 02:00 PM (Midday Transit)", value: "12:25" },
  { label: "02:00 PM – 04:00 PM (Afternoon Window)", value: "14:25" },
  { label: "04:00 PM – 08:00 PM (Evening Peak)", value: "17:00" },
  { label: "08:00 PM – 06:00 AM (Night Service)", value: "21:00" },
];

export default function JourneySearch({
  stops,
  fromStop,
  setFromStop,
  toStop,
  setToStop,
  travelDate,
  setTravelDate,
  timeSlot,
  setTimeSlot,
  onSearch,
  loading,
}: JourneySearchProps) {
  // Swaps boarding and alighting stops
  const handleSwap = () => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
  };

  // Date Quick Chips calculation
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeekend = new Date(today);
  nextWeekend.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));

  const setDateChip = (d: Date) => {
    setTravelDate(formatDate(d));
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient flare */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              Plan Your Journey with AI Forecast
            </h2>
            <p className="text-xs text-slate-400">
              Predict bus passenger density and find optimal departure times
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Origin Stop Selector */}
        <div className="md:col-span-5 relative">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Boarding Point (Origin)
          </label>
          <select
            value={fromStop}
            onChange={(e) => setFromStop(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all cursor-pointer"
          >
            {stops.map((s) => (
              <option key={s.stop_id} value={s.stop_id}>
                {s.stop_name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Origin / Destination Button */}
        <div className="md:col-span-2 flex items-end justify-center pb-1">
          <button
            type="button"
            onClick={handleSwap}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-400 border border-slate-700 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
            title="Swap Origin and Destination"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* Destination Stop Selector */}
        <div className="md:col-span-5 relative">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            Alighting Point (Destination)
          </label>
          <select
            value={toStop}
            onChange={(e) => setToStop(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all cursor-pointer"
          >
            {stops.map((s) => (
              <option key={s.stop_id} value={s.stop_id}>
                {s.stop_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date & Time Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 pt-4 border-t border-slate-800/80">
        {/* Date Selector */}
        <div className="md:col-span-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              Travel Date
            </label>
            {/* Quick Date Chips */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDateChip(today)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  travelDate === formatDate(today)
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateChip(tomorrow)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  travelDate === formatDate(tomorrow)
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDateChip(nextWeekend)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  travelDate === formatDate(nextWeekend)
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Weekend
              </button>
            </div>
          </div>
          <input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-sky-400 cursor-pointer"
          />
        </div>

        {/* Time Slot Selector */}
        <div className="md:col-span-6">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Departure Time Window
          </label>
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {TIME_SLOTS_OPTIONS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Submit Button */}
      <div className="mt-5 flex justify-end">
        <button
          onClick={onSearch}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-amber-400 hover:from-sky-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              Running LSTM Inference...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Forecast Crowd Density
            </>
          )}
        </button>
      </div>
    </div>
  );
}
