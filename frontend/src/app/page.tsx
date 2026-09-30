"use client";

/**
 * RideCast - Next.js Root Page & Application Shell
 * =================================================
 * This is the main orchestrator for the RideCast frontend web application.
 * It coordinates global state between the Left Navigation Sidebar and the
 * Main Canvas, switching between the Passenger Portal and Transport Authority Portal.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. `"use client"` Directive:
 *    - In Next.js App Router, components are Server Components by default.
 *    - `"use client"` tells Next.js this component runs in the browser and can use
 *      interactive React hooks (`useState`, `useEffect`, event listeners).
 * 
 * 2. React Hooks Used:
 *    - `useState`: Holds reactive state (e.g. current portal tab, active time slot, logged-in status).
 *    - `useEffect`: Runs side effects on component mount (e.g. checks saved session tokens in localStorage,
 *      runs backend health checks, and fetches initial stops/routes metadata).
 * 
 * 3. Conditional Rendering:
 *    - Renders `<PassengerPortal />` when `currentTab === "passenger"`.
 *    - Renders `<AuthorityPortal />` when `currentTab === "authority"`.
 */

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PassengerPortal from "@/components/passenger/PassengerPortal";
import AuthorityPortal from "@/components/authority/AuthorityPortal";
import LoginModal from "@/components/auth/LoginModal";
import { Stop, RouteMeta, MapMetadata, SlotPrediction, AuthorityOverview } from "@/lib/types";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { analyzeRouteTimeSlots, AUTHORITY_TIME_SLOTS } from "@/lib/authorityTimeSlotUtils";
import { ShieldAlert } from "lucide-react";

export default function Home() {
  // ---------------------------------------------------------------------------
  // Top-Level State Management
  // ---------------------------------------------------------------------------
  // Active primary view tab: 'passenger' or 'authority'
  const [currentTab, setCurrentTab] = useState<"passenger" | "authority">("passenger");

  // Authority sub-tab navigation: 'dashboard', 'forecast', 'fleet', 'history', 'reports'
  const [authoritySubTab, setAuthoritySubTab] = useState<"dashboard" | "forecast" | "fleet" | "history" | "reports">("dashboard");
  const [selectedAuthorityRoute, setSelectedAuthorityRoute] = useState<string>("All Routes");
  const [hasAuthorityForecast, setHasAuthorityForecast] = useState<boolean>(false);
  const [activeAuthoritySlotId, setActiveAuthoritySlotId] = useState<string>("slot_2");

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [apiHealthy, setApiHealthy] = useState<boolean>(false);

  // Passenger search & time-slot synchronization with Sidebar
  const [hasActiveSearch, setHasActiveSearch] = useState<boolean>(false);
  const [activeSlot, setActiveSlot] = useState<string>("08:00 – 10:00");
  const [slotsData, setSlotsData] = useState<SlotPrediction[]>([]);

  // Network dimension metadata & Authority Overview
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<RouteMeta[]>([]);
  const [mapData, setMapData] = useState<MapMetadata | null>(null);
  const [authorityOverview, setAuthorityOverview] = useState<AuthorityOverview | null>(null);

  // ---------------------------------------------------------------------------
  // Initial Lifecycle: Check Auth, Health & Pre-fetch Transit Metadata
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Ensure authorities start logged out by default
    try {
      localStorage.removeItem("ridecast_auth_token");
      sessionStorage.removeItem("ridecast_auth_token");
    } catch {
      // ignore
    }
    setIsLoggedIn(false);
    setCurrentTab("passenger");

    // 2. Health check to confirm FastAPI backend connectivity
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => {
        if (res.ok) setApiHealthy(true);
      })
      .catch(() => setApiHealthy(false));

    // 3. Load transit metadata & authority overview in parallel
    const todayStr = formatDate(new Date());
    Promise.all([
      api.getStops(),
      api.getRoutes(),
      api.getMapData(),
      api.getAuthorityOverview(todayStr).catch(() => null),
    ])
      .then(([stopsRes, routesRes, mapRes, overviewRes]) => {
        setStops(stopsRes);
        setRoutes(routesRes);
        setMapData(mapRes);
        if (overviewRes) setAuthorityOverview(overviewRes);
        setApiHealthy(true);
      })
      .catch((err) => {
        console.warn("Metadata load warning:", err);
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Dynamic Authority Time Slot Passenger Demand based on Selected Route Filter
  // ---------------------------------------------------------------------------
  const authoritySlots = useMemo(() => {
    if (!authorityOverview?.routes) return undefined;
    const routeEntries = Object.entries(authorityOverview.routes);
    if (routeEntries.length === 0) return undefined;

    const analyzed = routeEntries.map(([sid, r]) => analyzeRouteTimeSlots(sid, r));

    const isFiltered =
      selectedAuthorityRoute &&
      selectedAuthorityRoute !== "ALL" &&
      selectedAuthorityRoute !== "All Routes";

    return AUTHORITY_TIME_SLOTS.map((config) => {
      if (isFiltered) {
        const matchingRoute = analyzed.find(
          (r) => r.serviceId.toUpperCase() === selectedAuthorityRoute.toUpperCase()
        );
        if (matchingRoute) {
          const matchingSlot = matchingRoute.timeSlots.find((s) => s.slotId === config.id);
          const pax = matchingSlot ? matchingSlot.peakDeparture.passengers : 40;
          return {
            id: config.id,
            short: config.window
              .replace("06:00–08:00", "6 – 8 AM")
              .replace("08:00–10:00", "8 – 10 AM")
              .replace("10:00–12:00", "10 AM – 12 PM")
              .replace("12:00–14:00", "12 – 2 PM")
              .replace("14:00–17:00", "2 – 5 PM")
              .replace("17:00–20:00", "5 – 8 PM"),
            title: config.title,
            passengers: pax,
          };
        }
      }

      // If "All Routes" / "ALL" is selected, compute the average peak passengers across all monitored routes for this time slot
      const totalPax = analyzed.reduce((sum, r) => {
        const slot = r.timeSlots.find((s) => s.slotId === config.id);
        return sum + (slot ? slot.peakDeparture.passengers : 0);
      }, 0);
      const avgPax = Math.round(totalPax / Math.max(1, analyzed.length));

      return {
        id: config.id,
        short: config.window
          .replace("06:00–08:00", "6 – 8 AM")
          .replace("08:00–10:00", "8 – 10 AM")
          .replace("10:00–12:00", "10 AM – 12 PM")
          .replace("12:00–14:00", "12 – 2 PM")
          .replace("14:00–17:00", "2 – 5 PM")
          .replace("17:00–20:00", "5 – 8 PM"),
        title: config.title,
        passengers: avgPax,
      };
    });
  }, [authorityOverview, selectedAuthorityRoute]);

  // ---------------------------------------------------------------------------
  // Authentication Handlers
  // ---------------------------------------------------------------------------
  const handleOpenLogin = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmLoginYes = () => {
    setShowConfirmModal(false);
    setShowCredentialsModal(true);
  };

  const handleLoginSuccess = (token: string, username: string) => {
    localStorage.setItem("ridecast_auth_token", token);
    setIsLoggedIn(true);
    setCurrentTab("authority");
    setAuthoritySubTab("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("ridecast_auth_token");
    setIsLoggedIn(false);
    setCurrentTab("passenger");
  };

  return (
    <div className="min-h-screen bg-fusion-gradient text-[#EDDECB] flex flex-col md:flex-row selection:bg-[#AF4B47] selection:text-[#EDDECB]">
      {/* ── LEFT NAVIGATION SIDEBAR ── */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        authoritySubTab={authoritySubTab}
        setAuthoritySubTab={setAuthoritySubTab}
        selectedAuthorityRoute={selectedAuthorityRoute}
        setSelectedAuthorityRoute={setSelectedAuthorityRoute}
        hasAuthorityForecast={hasAuthorityForecast}
        activeAuthoritySlotId={activeAuthoritySlotId}
        onSelectAuthoritySlot={(slotId) => setActiveAuthoritySlotId(slotId)}
        authoritySlots={authoritySlots}
        hasActiveSearch={hasActiveSearch}
        setHasActiveSearch={setHasActiveSearch}
        activeSlot={activeSlot}
        onSelectSlot={(slot) => setActiveSlot(slot)}
        slotsData={slotsData}
        isLoggedIn={isLoggedIn}
        onOpenLoginModal={handleOpenLogin}
        onLogout={handleLogout}
        apiHealthy={apiHealthy}
      />

      {/* ── MAIN CONTENT CANVAS ── */}
      <main
        className={`flex-1 min-w-0 overflow-y-auto w-full flex flex-col ${
          (currentTab === "passenger" && hasActiveSearch) ||
          (currentTab === "authority" && authoritySubTab === "forecast" && hasAuthorityForecast)
            ? "p-0"
            : "p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto justify-center"
        }`}
      >
        {currentTab === "passenger" || !isLoggedIn ? (
          <PassengerPortal
            stops={stops}
            routes={routes}
            mapData={mapData}
            activeSidebarSlot={activeSlot}
            setActiveSidebarSlot={(slot) => setActiveSlot(slot)}
            hasActiveSearch={hasActiveSearch}
            setHasActiveSearch={setHasActiveSearch}
            setSlotsDataCallback={(slots) => setSlotsData(slots)}
          />
        ) : (
          <AuthorityPortal
            mapData={mapData}
            authoritySubTab={authoritySubTab}
            setAuthoritySubTab={setAuthoritySubTab}
            selectedRoute={selectedAuthorityRoute}
            setSelectedRoute={setSelectedAuthorityRoute}
            hasForecastCalculated={hasAuthorityForecast}
            setHasForecastCalculated={setHasAuthorityForecast}
            activeAuthoritySlotId={activeAuthoritySlotId}
            setActiveAuthoritySlotId={setActiveAuthoritySlotId}
            setOverviewCallback={(ov) => setAuthorityOverview(ov)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* ── OFFICER CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full bg-[#1f2329] border-2 border-[#AF4B47] rounded-3xl p-8 text-center shadow-2xl space-y-4 text-[#EDDECB]">
            <div className="w-14 h-14 rounded-2xl bg-[#AF4B47]/20 text-[#AF4B47] border border-[#AF4B47]/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#EDDECB]">
                Transport Authority Portal
              </h2>
              <p className="text-xs text-[#B5C3C4] mt-2 leading-relaxed font-medium">
                This login is intended for authorized transport authorities only. Continue to authentication?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleConfirmLoginYes}
                className="py-2.5 rounded-xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Yes, Continue
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 rounded-xl bg-[#2a3038] hover:bg-[#343b44] text-[#B5C3C4] hover:text-[#EDDECB] font-black text-xs uppercase tracking-wider transition-all cursor-pointer border border-[#6B8D8A]/30"
              >
                No, Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OFFICER CREDENTIALS LOGIN MODAL ── */}
      <LoginModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
