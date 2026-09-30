"use client";

/**
 * RideCast - Left Navigation Sidebar Component
 * ==============================================
 * This component provides dual-mode navigation:
 * 1. Passenger Mode:
 *    - Brand header.
 *    - Switch between Passenger Portal and Authority operations.
 *    - Dynamic 6-time-slot ochre color pills showing live passenger counts per shift.
 *    - Quick Authority Login button pinned to bottom.
 * 2. Authority Mode:
 *    - Officer profile card (Avatar + "Ravi, Authority Director").
 *    - Navigation items: Profile (Overview), Forecast (Route Intelligence),
 *      Idle Buses (Fleet Tracking), Generate Report (PDF Download), and Logout.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * - Dynamic Color Scaling (`getOchreColorForSlot`):
 *   Calculates min and max passenger loads across time slots and maps each slot
 *   to a continuous warm amber/ochre gradient.
 */

import React, { useState } from "react";
import {
  Bus,
  ShieldCheck,
  User,
  TrendingUp,
  FileText,
  LogOut,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SlotPrediction } from "@/lib/types";

interface AuthoritySlotInfo {
  id: string;
  short: string;
  title: string;
  passengers: number;
}

interface SidebarProps {
  currentTab: "passenger" | "authority";
  setCurrentTab: (tab: "passenger" | "authority") => void;
  authoritySubTab?: "dashboard" | "forecast" | "fleet" | "history" | "reports";
  setAuthoritySubTab?: (tab: "dashboard" | "forecast" | "fleet" | "history" | "reports") => void;
  selectedAuthorityRoute?: string;
  setSelectedAuthorityRoute?: (route: string) => void;
  hasAuthorityForecast?: boolean;
  activeAuthoritySlotId?: string;
  onSelectAuthoritySlot?: (slotId: string) => void;
  authoritySlots?: AuthoritySlotInfo[];
  hasActiveSearch: boolean;
  setHasActiveSearch?: (has: boolean) => void;
  activeSlot: string;
  onSelectSlot: (slot: string) => void;
  slotsData?: SlotPrediction[];
  isLoggedIn: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  apiHealthy: boolean;
}

// Standardized 7 daily shift window definitions (including AM/PM and overnight shift)
const TIME_SLOT_DEFINITIONS = [
  { id: "slot_1", shortLabel: "6 – 8 AM", fullLabel: "06:00 AM – 08:00 AM", time: "06:25", shift: "Early Morning" },
  { id: "slot_2", shortLabel: "8 – 10 AM", fullLabel: "08:00 AM – 10:00 AM", time: "08:25", shift: "Morning Peak" },
  { id: "slot_3", shortLabel: "10 AM – 12 PM", fullLabel: "10:00 AM – 12:00 PM", time: "10:25", shift: "Late Morning" },
  { id: "slot_4", shortLabel: "12 – 2 PM", fullLabel: "12:00 PM – 02:00 PM", time: "12:25", shift: "Midday Transit" },
  { id: "slot_5", shortLabel: "2 – 4 PM", fullLabel: "02:00 PM – 04:00 PM", time: "14:25", shift: "Afternoon" },
  { id: "slot_6", shortLabel: "4 – 8 PM", fullLabel: "04:00 PM – 08:00 PM", time: "17:00", shift: "Evening Peak" },
  { id: "slot_7", shortLabel: "8 PM – 6 AM", fullLabel: "08:00 PM – 06:00 AM", time: "21:00", shift: "Night Service" },
];

const DEFAULT_AUTHORITY_SLOTS: AuthoritySlotInfo[] = [
  { id: "slot_1", short: "6 – 8 AM", title: "Early Morning", passengers: 42 },
  { id: "slot_2", short: "8 – 10 AM", title: "Morning Peak", passengers: 102 },
  { id: "slot_3", short: "10 AM – 12 PM", title: "Late Morning", passengers: 34 },
  { id: "slot_4", short: "12 – 2 PM", title: "Midday Transit", passengers: 60 },
  { id: "slot_5", short: "2 – 5 PM", title: "Afternoon", passengers: 70 },
  { id: "slot_6", short: "5 – 8 PM", title: "Evening Peak", passengers: 105 },
];

export default function Sidebar({
  currentTab,
  setCurrentTab,
  authoritySubTab = "dashboard",
  setAuthoritySubTab,
  hasAuthorityForecast,
  activeAuthoritySlotId = "slot_2",
  onSelectAuthoritySlot,
  authoritySlots,
  hasActiveSearch,
  setHasActiveSearch,
  activeSlot,
  onSelectSlot,
  slotsData,
  isLoggedIn,
  onOpenLoginModal,
  onLogout,
}: SidebarProps) {
  // Minimizable states for time slot sidebars
  const [isAuthoritySlotsMinimized, setIsAuthoritySlotsMinimized] = useState<boolean>(false);
  const [isPassengerSlotsMinimized, setIsPassengerSlotsMinimized] = useState<boolean>(false);

  // Deterministic helper that guarantees exactly one active time slot index
  const getActiveSlotIndex = () => {
    const a = (activeSlot || "").trim();
    if (!a) return 1; // Default to morning peak

    const exactIdx = TIME_SLOT_DEFINITIONS.findIndex(
      (s) => s.fullLabel === a || s.shortLabel === a || s.time === a || s.id === a
    );
    if (exactIdx !== -1) return exactIdx;

    if ((a.includes("08:00 AM") || a.includes("8 – 10 AM") || a.includes("8 - 10 AM") || a.includes("Morning Peak") || a === "08:25") && !a.includes("PM") && !a.includes("Night")) return 1;
    if (a.includes("08:00 PM") || a.includes("8 PM") || a.includes("Night Service") || a === "21:00" || a === "20:15") return 6;
    if (a.includes("06:00 AM") || a.includes("6 – 8 AM") || a.includes("6 - 8 AM") || a.includes("Early Morning") || a === "06:25") return 0;
    if (a.includes("10:00 AM") || a.includes("10 AM – 12 PM") || a.includes("10 AM - 12 PM") || a.includes("Late Morning") || a === "10:25") return 2;
    if (a.includes("12:00 PM") || a.includes("12 – 2 PM") || a.includes("12 - 2 PM") || a.includes("Midday Transit") || a === "12:25") return 3;
    if (a.includes("02:00 PM") || a.includes("14:00") || a.includes("2 – 4 PM") || a.includes("2 - 4 PM") || a.includes("Afternoon") || a === "14:25") return 4;
    if (a.includes("04:00 PM") || a.includes("17:00") || a.includes("4 – 8 PM") || a.includes("4 - 8 PM") || a.includes("Evening Peak")) return 5;

    return 1;
  };

  return (
    <aside className="w-64 md:w-72 bg-[#171a1f]/95 backdrop-blur-md border-r border-[#6B8D8A]/25 shadow-2xl flex flex-col justify-between p-5 min-h-screen shrink-0 sticky top-0 h-screen overflow-y-auto z-40 text-[#EDDECB]">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. AUTHORITY MODE SIDEBAR                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentTab === "authority" && isLoggedIn ? (
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="text-center pb-2">
            <div className="text-2xl font-black tracking-widest text-[#F3B763] uppercase font-mono">
              RIDECAST
            </div>
            <div className="text-[11px] text-[#B5C3C4] font-medium tracking-tight mt-1">
              Skip the Crowd. Plan Your Ride.
            </div>
          </div>

          {/* User Profile Card */}
          <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#1f2329] border border-[#6B8D8A]/30 space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#F3B763]/20 border-2 border-[#F3B763] flex items-center justify-center text-[#F3B763] shadow-md shadow-[#F3B763]/10">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="text-base font-black text-[#EDDECB] font-mono tracking-wide">
                Ravi
              </div>
              <div className="text-[11px] text-[#B5C3C4] font-medium">
                Transport Operations Manager
              </div>
            </div>
          </div>

          {/* Authority Menu Navigation */}
          <div className="space-y-1.5">
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                authoritySubTab === "dashboard"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#F3B763]" />
              <span>Dashboard</span>
            </button>

            {/* 2. Route Forecast */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("forecast")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                authoritySubTab === "forecast"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-[#F3B763]" />
              <span>Forecast</span>
            </button>

            {/* Time Slots Timeline directly under Forecast when on Forecast tab */}
            {authoritySubTab === "forecast" && hasAuthorityForecast && (
              <div className="pt-2 pb-1 space-y-2 animate-fadeIn pl-0.5 pr-0.5">
                {/* Minimizable Header Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAuthoritySlotsMinimized((prev) => !prev)}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#B5C3C4] hover:text-[#EDDECB] cursor-pointer transition-colors group select-none rounded-lg hover:bg-[#252a32]/60"
                  title={isAuthoritySlotsMinimized ? "Expand time slots timeline" : "Minimize time slots timeline"}
                >
                  <div className="flex items-center gap-1.5">
                    <span>TIME</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>EXPECTED CROWD</span>
                    {isAuthoritySlotsMinimized ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#F3B763] group-hover:scale-125 transition-transform" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-[#B5C3C4] group-hover:text-[#F3B763] group-hover:scale-125 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Expanded Time Slots List */}
                {!isAuthoritySlotsMinimized && (
                  <div className="space-y-1.5 animate-fadeIn">
                    {(authoritySlots || DEFAULT_AUTHORITY_SLOTS).map((slot) => {
                      const isActive = (activeAuthoritySlotId || "slot_2") === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => onSelectAuthoritySlot?.(slot.id)}
                          className={`w-full py-2 px-3 rounded-2xl text-xs transition-all flex items-center justify-between group cursor-pointer active:scale-95 ${
                            isActive
                              ? "bg-[#F3B763] text-[#121417] ring-2 ring-[#EDDECB] scale-[1.02] shadow-lg shadow-[#F3B763]/25 font-black"
                              : "bg-[#1f2329] text-[#EDDECB] border border-[#6B8D8A]/30 hover:bg-[#272d36] hover:border-[#6B8D8A]/60 font-bold"
                          }`}
                          title={`Switch to ${slot.short} (${slot.title})`}
                        >
                          <div className="flex flex-col items-start text-left min-w-0">
                            <span
                              className={`text-xs tracking-wide truncate ${
                                isActive
                                  ? "font-black text-[#121417]"
                                  : "font-extrabold text-[#EDDECB] group-hover:text-[#F3B763] transition-colors"
                              }`}
                            >
                              {slot.short}
                            </span>
                            <span
                              className={`text-[9px] truncate ${
                                isActive ? "text-[#121417]/80 font-bold" : "text-[#B5C3C4] font-medium"
                              }`}
                            >
                              {slot.title}
                            </span>
                          </div>

                          <div className="text-right pl-1 shrink-0 flex items-center gap-1">
                            <span
                              className={`text-xs font-mono whitespace-nowrap ${
                                isActive ? "font-black text-[#121417]" : "font-black text-[#F3B763]"
                              }`}
                            >
                              {slot.passengers}
                            </span>
                            <span
                              className={`text-[9px] font-sans whitespace-nowrap ${
                                isActive ? "text-[#121417]/80 font-bold" : "text-[#B5C3C4]/75 font-medium"
                              }`}
                            >
                              passengers
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Minimized Active Slot Summary Pill */}
                {isAuthoritySlotsMinimized && (
                  <div className="pt-0.5 animate-fadeIn">
                    {(() => {
                      const slots = authoritySlots || DEFAULT_AUTHORITY_SLOTS;
                      const activeSlot =
                        slots.find((s) => s.id === (activeAuthoritySlotId || "slot_2")) || slots[1];
                      return (
                        <button
                          type="button"
                          onClick={() => setIsAuthoritySlotsMinimized(false)}
                          className="w-full py-2 px-3 rounded-xl bg-[#F3B763]/15 border border-[#F3B763]/40 text-left flex items-center justify-between text-xs hover:bg-[#F3B763]/25 transition-all cursor-pointer group"
                          title="Click to expand full 6-shift timeline"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-[#F3B763] animate-pulse shrink-0"></span>
                            <span className="font-extrabold text-[#F3B763] text-xs truncate">
                              {activeSlot.short}
                            </span>
                            <span className="text-[10px] text-[#B5C3C4] truncate">
                              ({activeSlot.title})
                            </span>
                          </div>
                          <span className="font-mono font-black text-[#F3B763] text-xs shrink-0 pl-1">
                            {activeSlot.passengers} pax
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* 3. Standby Fleet */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("fleet")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                authoritySubTab === "fleet"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <Bus className="w-4 h-4 text-[#F3B763]" />
              <span>Standby Fleet</span>
            </button>

            {/* 4. Dispatch History */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                authoritySubTab === "history"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <Navigation className="w-4 h-4 text-[#96BCBB]" />
              <span>Dispatch History</span>
            </button>

            {/* 5. Reports */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("reports")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer group ${
                authoritySubTab === "reports"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <FileText className="w-4 h-4 text-[#96BCBB] group-hover:text-[#F3B763] transition-colors" />
              <span>Reports</span>
            </button>

            {/* Divider */}
            <div className="pt-2 border-t border-[#6B8D8A]/20" />

            {/* 6. Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-[#AF4B47] hover:bg-[#AF4B47]/20 hover:text-[#EDDECB] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#AF4B47]" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* 2. PASSENGER MODE SIDEBAR                                    */
        /* ───────────────────────────────────────────────────────────── */
        <div>
          <div
            onClick={() => {
              setCurrentTab("passenger");
              if (setHasActiveSearch) setHasActiveSearch(false);
            }}
            className="text-center pb-4 border-b border-[#6B8D8A]/20 cursor-pointer group"
          >
            <div className="text-2xl font-black tracking-widest text-[#F3B763] group-hover:text-[#AF4B47] transition-colors uppercase font-mono">
              RIDECAST
            </div>
            <div className="text-[11px] text-[#B5C3C4] font-medium tracking-tight mt-1">
              Skip the Crowd. Plan Your Ride.
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <button
              onClick={() => {
                setCurrentTab("passenger");
                if (setHasActiveSearch) setHasActiveSearch(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === "passenger"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <Navigation className="w-4 h-4 text-[#F3B763]" />
              Plan Your Trip
            </button>
          </div>

          {/* 6 Time Slot Pills */}
          {hasActiveSearch && (
            <div className="mt-6 pt-4 border-t border-[#6B8D8A]/20 animate-fadeIn">
              <button
                type="button"
                onClick={() => setIsPassengerSlotsMinimized((prev) => !prev)}
                className="w-full mb-2.5 flex items-center justify-between text-[11px] font-black text-[#EDDECB] uppercase tracking-wider hover:text-white cursor-pointer transition-colors group select-none rounded-lg hover:bg-[#252a32]/60 px-1 py-1"
                title={isPassengerSlotsMinimized ? "Expand time slots timeline" : "Minimize time slots timeline"}
              >
                <div className="flex items-center gap-1.5">
                  <span>TIME</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">EXPECTED CROWD</span>
                  {isPassengerSlotsMinimized ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#F3B763] group-hover:scale-125 transition-transform" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-[#B5C3C4] group-hover:text-[#F3B763] group-hover:scale-125 transition-transform" />
                  )}
                </div>
              </button>

              {/* Expanded Passenger Slots List */}
              {!isPassengerSlotsMinimized && (
                <div className="space-y-2 animate-fadeIn">
                  {(() => {
                    const activeIdx = getActiveSlotIndex();
                    return TIME_SLOT_DEFINITIONS.map((slotDef, idx) => {
                      const isActive = idx === activeIdx;
                      const slotForecast = slotsData?.[idx];

                      return (
                        <button
                          key={slotDef.shortLabel}
                          onClick={() => onSelectSlot(slotDef.fullLabel)}
                          className={`w-full py-2 px-3 rounded-2xl text-xs transition-all flex items-center justify-between group cursor-pointer active:scale-95 ${
                            isActive
                              ? "bg-[#F3B763] text-[#121417] ring-2 ring-[#EDDECB] scale-[1.02] shadow-lg shadow-[#F3B763]/25 font-black"
                              : "bg-[#1f2329] text-[#EDDECB] border border-[#6B8D8A]/30 hover:bg-[#272d36] hover:border-[#6B8D8A]/60 font-bold"
                          }`}
                          title={`Switch to ${slotDef.fullLabel} (${slotForecast?.crowd_level || slotDef.shift})`}
                        >
                          <div className="flex flex-col items-start text-left min-w-0">
                            <span
                              className={`text-xs tracking-wide truncate ${
                                isActive
                                  ? "font-black text-[#121417]"
                                  : "font-extrabold text-[#EDDECB] group-hover:text-[#F3B763] transition-colors"
                              }`}
                            >
                              {slotDef.shortLabel}
                            </span>
                            <span
                              className={`text-[9px] truncate ${
                                isActive ? "text-[#121417]/80 font-bold" : "text-[#B5C3C4] font-medium"
                              }`}
                            >
                              {slotDef.shift}
                            </span>
                          </div>
                          <div className="text-right pl-1 shrink-0 flex items-center gap-1">
                            <span
                              className={`text-xs font-mono whitespace-nowrap ${
                                isActive ? "font-black text-[#121417]" : "font-black text-[#F3B763]"
                              }`}
                            >
                              {slotForecast ? slotForecast.outbound : "—"}
                            </span>
                            {slotForecast && (
                              <span
                                className={`text-[9px] font-sans whitespace-nowrap ${
                                  isActive ? "text-[#121417]/80 font-bold" : "text-[#B5C3C4]/75 font-medium"
                                }`}
                              >
                                passengers
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Minimized Passenger Active Slot Preview */}
              {isPassengerSlotsMinimized && (
                <div className="pt-0.5 animate-fadeIn">
                  {(() => {
                    const activeIdx = getActiveSlotIndex();
                    const activeDef = TIME_SLOT_DEFINITIONS[activeIdx] || TIME_SLOT_DEFINITIONS[1];
                    const slotForecast = slotsData?.[activeIdx];
                    return (
                      <button
                        type="button"
                        onClick={() => setIsPassengerSlotsMinimized(false)}
                        className="w-full py-2 px-3 rounded-xl bg-[#F3B763]/15 border border-[#F3B763]/40 text-left flex items-center justify-between text-xs hover:bg-[#F3B763]/25 transition-all cursor-pointer group"
                        title="Click to expand full timeline"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#F3B763] animate-pulse shrink-0"></span>
                          <span className="font-extrabold text-[#F3B763] text-xs truncate">
                            {activeDef.shortLabel}
                          </span>
                          <span className="text-[10px] text-[#B5C3C4] truncate">
                            ({activeDef.shift})
                          </span>
                        </div>
                        <span className="font-mono font-black text-[#F3B763] text-xs shrink-0 pl-1">
                          {slotForecast ? `${slotForecast.outbound} pax` : "Active"}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Pinned Login Button in Passenger Mode */}
      {currentTab === "passenger" && (
        <div className="pt-4 border-t border-[#6B8D8A]/20">
          {!isLoggedIn ? (
            <button
              onClick={onOpenLoginModal}
              className="w-full py-2.5 rounded-2xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#AF4B47]/20 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#EDDECB]" />
              Authority Login
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab("authority")}
              className="w-full py-2.5 rounded-2xl bg-[#F3B763] hover:bg-[#e4a854] text-[#121417] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#F3B763]/20 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#121417]" />
              Authority Login
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
