"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PassengerPortal from "@/components/passenger/PassengerPortal";
import AuthorityPortal from "@/components/authority/AuthorityPortal";
import LoginModal from "@/components/auth/LoginModal";
import { Stop, RouteMeta, MapMetadata, SlotPrediction } from "@/lib/types";
import { api } from "@/lib/api";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<"passenger" | "authority">("passenger");
  const [authoritySubTab, setAuthoritySubTab] = useState<"profile" | "forecast" | "idle" | "report">("profile");
  const [selectedAuthorityRoute, setSelectedAuthorityRoute] = useState<string>("All Routes");
  const [hasAuthorityForecast, setHasAuthorityForecast] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [apiHealthy, setApiHealthy] = useState<boolean>(false);

  // Search & Slot synchronization
  const [hasActiveSearch, setHasActiveSearch] = useState<boolean>(false);
  const [activeSlot, setActiveSlot] = useState<string>("08:00 – 10:00");
  const [slotsData, setSlotsData] = useState<SlotPrediction[]>([]);

  // Metadata
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<RouteMeta[]>([]);
  const [mapData, setMapData] = useState<MapMetadata | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("ridecast_auth_token");
    if (savedToken) {
      setIsLoggedIn(true);
    }

    // Health check
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => {
        if (res.ok) setApiHealthy(true);
      })
      .catch(() => setApiHealthy(false));

    // Load initial metadata
    Promise.all([api.getStops(), api.getRoutes(), api.getMapData()])
      .then(([stopsRes, routesRes, mapRes]) => {
        setStops(stopsRes);
        setRoutes(routesRes);
        setMapData(mapRes);
        setApiHealthy(true);
      })
      .catch((err) => {
        console.warn("Metadata load warning:", err);
      });
  }, []);

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
    setAuthoritySubTab("profile");
  };

  const handleLogout = () => {
    localStorage.removeItem("ridecast_auth_token");
    setIsLoggedIn(false);
    setCurrentTab("passenger");
  };

  return (
    <div className="min-h-screen bg-fusion-gradient text-[#EDDECB] flex flex-col md:flex-row selection:bg-[#AF4B47] selection:text-[#EDDECB]">
      {/* ── LEFT SIDEBAR ── */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        authoritySubTab={authoritySubTab}
        setAuthoritySubTab={setAuthoritySubTab}
        selectedAuthorityRoute={selectedAuthorityRoute}
        setSelectedAuthorityRoute={setSelectedAuthorityRoute}
        hasAuthorityForecast={hasAuthorityForecast}
        hasActiveSearch={hasActiveSearch}
        activeSlot={activeSlot}
        onSelectSlot={(slot) => setActiveSlot(slot)}
        slotsData={slotsData}
        isLoggedIn={isLoggedIn}
        onOpenLoginModal={handleOpenLogin}
        onLogout={handleLogout}
        apiHealthy={apiHealthy}
      />

      {/* ── MAIN CONTENT CANVAS ── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-6xl mx-auto w-full flex flex-col justify-center">
        {currentTab === "passenger" ? (
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
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* ── CONFIRMATION MODAL ── */}
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

      {/* ── CREDENTIALS MODAL ── */}
      <LoginModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
