"use client";

/**
 * RideCast - Navigation Bar Component
 * ====================================
 * Header bar displaying the RideCast brand, live backend health status,
 * tab switching between Passenger & Authority modes, and officer session controls.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. Props:
 *    - Inputs passed from the parent (`page.tsx`) to control state (e.g. `currentTab`, `isLoggedIn`).
 * 
 * 2. Icons from `lucide-react`:
 *    - Scalable vector icons (`Bus`, `ShieldAlert`, `Navigation`, `UserCheck`).
 * 
 * 3. Tailwind CSS Utility Classes:
 *    - `sticky top-0`: Keeps the navbar pinned to the top while scrolling.
 *    - `backdrop-blur-xl`: Creates an iOS-style translucent frosted glass effect.
 */

import React from "react";
import { Bus, ShieldAlert, ShieldCheck, UserCheck, Navigation } from "lucide-react";

interface NavbarProps {
  currentTab: "passenger" | "authority";
  setCurrentTab: (tab: "passenger" | "authority") => void;
  isLoggedIn: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  apiHealthy: boolean;
}

export default function Navbar({
  currentTab,
  setCurrentTab,
  isLoggedIn,
  onOpenLogin,
  onLogout,
  apiHealthy,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-amber-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Bus className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-lg bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-sky-200 to-amber-400">
                RIDECAST
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest bg-sky-500/10 text-sky-400 border border-sky-500/20">
                AI 2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight hidden sm:block">
              Skip the Crowd. Plan Your Ride.
            </p>
          </div>
        </div>

        {/* Primary View Tab Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          <button
            onClick={() => setCurrentTab("passenger")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === "passenger"
                ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Plan Your Trip
          </button>
          <button
            onClick={() => {
              if (isLoggedIn) {
                setCurrentTab("authority");
              } else {
                onOpenLogin();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === "authority"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            {isLoggedIn ? (
              <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
            Transport Authority
          </button>
        </div>

        {/* Right Status & Authentication Controls */}
        <div className="flex items-center gap-3">
          {/* Live API Health indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                apiHealthy
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-amber-400 animate-pulse"
              }`}
            ></span>
            {apiHealthy ? "FastAPI Live" : "Connecting..."}
          </div>

          {/* Officer Login / Logout Button */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold">Ravi (Transport Authority)</span>
              </div>
              <button
                onClick={onLogout}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs transition-colors"
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium transition-all shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Login as Transport Authority
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
