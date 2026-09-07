"use client";

import React from "react";
import {
  Bus,
  ShieldCheck,
  User,
  TrendingUp,
  FileText,
  LogOut,
  Navigation,
  CheckCircle,
  Download,
} from "lucide-react";
import { SlotPrediction } from "@/lib/types";

interface SidebarProps {
  currentTab: "passenger" | "authority";
  setCurrentTab: (tab: "passenger" | "authority") => void;
  authoritySubTab?: "profile" | "forecast" | "idle" | "report";
  setAuthoritySubTab?: (tab: "profile" | "forecast" | "idle" | "report") => void;
  selectedAuthorityRoute?: string;
  setSelectedAuthorityRoute?: (route: string) => void;
  hasAuthorityForecast?: boolean;
  hasActiveSearch: boolean;
  activeSlot: string;
  onSelectSlot: (slot: string) => void;
  slotsData?: SlotPrediction[];
  isLoggedIn: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  apiHealthy: boolean;
}

const TIME_SLOT_DEFINITIONS = [
  { shortLabel: "6 – 8", fullLabel: "06:00 – 08:00", time: "06:25" },
  { shortLabel: "8 – 10", fullLabel: "08:00 – 10:00", time: "08:25" },
  { shortLabel: "10 – 12", fullLabel: "10:00 – 12:00", time: "10:25" },
  { shortLabel: "12 – 2", fullLabel: "12:00 – 14:00", time: "12:25" },
  { shortLabel: "2 – 4", fullLabel: "14:00 – 16:00", time: "14:25" },
  { shortLabel: "4 – 8", fullLabel: "16:00 – 20:00", time: "17:00" },
];

const OCHRE_SCALE = [
  { bg: "#A65A1E", text: "#ffffff", label: "Peak" },
  { bg: "#CA8D53", text: "#121417", label: "High" },
  { bg: "#D99F6B", text: "#121417", label: "Mod-High" },
  { bg: "#E5B487", text: "#121417", label: "Moderate" },
  { bg: "#EFC8A6", text: "#121417", label: "Steady" },
  { bg: "#F8DFC8", text: "#121417", label: "Minimum" },
];

const AUTHORITY_ROUTES = [
  { id: "S45", label: "Route 1", code: "S45" },
  { id: "S57", label: "Route 2", code: "S57" },
  { id: "S33A", label: "Route 3", code: "S33A" },
  { id: "S48", label: "Route 4", code: "S48" },
];

export default function Sidebar({
  currentTab,
  setCurrentTab,
  authoritySubTab = "profile",
  setAuthoritySubTab,
  selectedAuthorityRoute = "All Routes",
  setSelectedAuthorityRoute,
  hasAuthorityForecast = false,
  hasActiveSearch,
  activeSlot,
  onSelectSlot,
  slotsData,
  isLoggedIn,
  onOpenLoginModal,
  onLogout,
  apiHealthy,
}: SidebarProps) {
  // Ochre color calculation for Passenger view
  const getOchreColorForSlot = (idx: number) => {
    if (!slotsData || slotsData.length === 0) {
      return OCHRE_SCALE[idx % OCHRE_SCALE.length];
    }
    const counts = slotsData.map((s) => s.outbound || 0);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const currentCount = slotsData[idx]?.outbound || 0;

    if (maxCount === minCount) return OCHRE_SCALE[1];
    const ratio = (currentCount - minCount) / (maxCount - minCount);
    const rankIndex = Math.round((1 - ratio) * (OCHRE_SCALE.length - 1));
    return OCHRE_SCALE[Math.max(0, Math.min(OCHRE_SCALE.length - 1, rankIndex))];
  };

  const handleDownloadReport = () => {
    const today = new Date().toISOString().split("T")[0];
    window.open(`http://127.0.0.1:8000/api/authority/export-pdf?date=${today}&service_id=All Routes`, "_blank");
  };

  return (
    <aside className="w-64 md:w-72 bg-[#171a1f]/95 backdrop-blur-md border-r border-[#6B8D8A]/25 shadow-2xl flex flex-col justify-between p-5 min-h-screen shrink-0 sticky top-0 h-screen overflow-y-auto z-40 text-[#EDDECB]">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. AUTHORITY MODE SIDEBAR (Matching Sketches 1, 2, 3)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentTab === "authority" ? (
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="text-center pb-2">
            <div className="text-2xl font-black tracking-widest text-[#F3B763] uppercase font-mono">
              RIDECAST
            </div>
          </div>

          {/* User Profile Card (Matching Sketch Top: Avatar + Ravi) */}
          <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#1f2329] border border-[#6B8D8A]/30 space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#F3B763]/20 border-2 border-[#F3B763] flex items-center justify-center text-[#F3B763] shadow-md shadow-[#F3B763]/10">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="text-base font-black text-[#EDDECB] font-mono tracking-wide">
                Ravi
              </div>
              <div className="text-[11px] text-[#B5C3C4] font-medium">
                Authority Director
              </div>
            </div>
          </div>

          {/* Menu Items (Matching Sketches: Profile, Forecast, Idle buses, Generate report, Logout) */}
          <div className="space-y-2">
            {/* 1. Profile */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                authoritySubTab === "profile"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <User className="w-4 h-4 text-[#F3B763]" />
              <span>Profile</span>
            </button>

            {/* 2. Forecast */}
            <div className="space-y-1.5">
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
            </div>

            {/* 3. Idle Buses */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("idle")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                authoritySubTab === "idle"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <Bus className="w-4 h-4 text-[#F3B763]" />
              <span>Idle buses</span>
            </button>

            {/* 4. Generate Report */}
            <button
              type="button"
              onClick={() => setAuthoritySubTab?.("report")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer group ${
                authoritySubTab === "report"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25 ring-2 ring-[#EDDECB]/30"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <FileText className="w-4 h-4 text-[#96BCBB] group-hover:text-[#F3B763] transition-colors" />
              <span>Generate report</span>
            </button>

            {/* 5. Logout */}
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
            onClick={() => setCurrentTab("passenger")}
            className="text-center pb-4 border-b border-[#6B8D8A]/20 cursor-pointer group"
          >
            <div className="text-2xl font-black tracking-widest text-[#F3B763] group-hover:text-[#AF4B47] transition-colors uppercase font-mono">
              RIDECAST
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <button
              onClick={() => setCurrentTab("passenger")}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === "passenger"
                  ? "bg-[#AF4B47] text-[#EDDECB] shadow-lg shadow-[#AF4B47]/25"
                  : "text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32]"
              }`}
            >
              <Navigation className="w-4 h-4 text-[#F3B763]" />
              Passenger Portal
            </button>

            {isLoggedIn && (
              <button
                onClick={() => setCurrentTab("authority")}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-[#B5C3C4] hover:text-[#EDDECB] hover:bg-[#252a32] transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#AF4B47]" />
                Authority Operations
              </button>
            )}
          </div>

          {/* 6 TIME SLOT COLOR PILLS (#CA8D53 Monochromatic Scale) */}
          {hasActiveSearch && (
            <div className="mt-6 pt-4 border-t border-[#6B8D8A]/20 animate-fadeIn">
              <div className="mb-2.5">
                <span className="text-[11px] font-black text-[#EDDECB] uppercase tracking-wider">
                  TIME SLOTS
                </span>
              </div>

              <div className="space-y-2">
                {TIME_SLOT_DEFINITIONS.map((slotDef, idx) => {
                  const isActive =
                    activeSlot === slotDef.fullLabel ||
                    activeSlot.startsWith(slotDef.shortLabel.split(" – ")[0]);

                  const slotForecast = slotsData?.[idx];
                  const colorConfig = getOchreColorForSlot(idx);

                  return (
                    <button
                      key={slotDef.shortLabel}
                      onClick={() => onSelectSlot(slotDef.fullLabel)}
                      style={{
                        backgroundColor: colorConfig.bg,
                        color: colorConfig.text,
                      }}
                      className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all shadow-sm flex items-center justify-between group cursor-pointer active:scale-95 ${
                        isActive
                          ? "ring-4 ring-[#EDDECB] scale-102 shadow-xl font-black"
                          : "opacity-90 hover:opacity-100 hover:scale-101 border border-black/10"
                      }`}
                      title={`Switch to ${slotDef.fullLabel} (${slotForecast?.crowd_level || "Forecast"})`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black tracking-wide">
                          {slotDef.shortLabel}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-95">
                        {slotForecast ? `${slotForecast.outbound} passengers` : slotDef.fullLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM PINNED LOGIN/STATUS BUTTON (Only in Passenger mode) */}
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
              Enter Operations
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
