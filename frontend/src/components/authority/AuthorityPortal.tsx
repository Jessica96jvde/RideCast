"use client";

/**
 * RideCast - Transport Authority Portal Orchestrator Component
 * ==============================================================
 * Central container managing the Transport Authority operations sub-views:
 * 1. `dashboard` -> Operations Overview, Requires Attention, Standby Fleet summary, Trends.
 * 2. `forecast`  -> Route-level crowd forecasts, departure schedules, and dispatch triggers.
 * 3. `fleet`     -> Real-time Standby Fleet inventory and depot reserve bus table.
 * 4. `history`   -> Immutable Dispatch History audit log with date, time, route, vehicle, and depot.
 * 5. `reports`   -> Dedicated container for generating and exporting intelligence PDFs and CSVs.
 */

import React, { useState, useEffect } from "react";
import AuthorityDashboardView from "./AuthorityDashboardView";
import AuthorityForecastView from "./AuthorityForecastView";
import AuthorityStandbyFleetView from "./AuthorityStandbyFleetView";
import AuthorityDispatchHistoryView from "./AuthorityDispatchHistoryView";
import AuthorityReportsView from "./AuthorityReportsView";
import SmartAllocationModal from "./SmartAllocationModal";
import {
  AuthorityOverview,
  BusItem,
  AllocationRecord,
  MapMetadata,
} from "@/lib/types";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface AuthorityPortalProps {
  mapData: MapMetadata | null;
  authoritySubTab: "dashboard" | "forecast" | "fleet" | "history" | "reports";
  setAuthoritySubTab: (tab: "dashboard" | "forecast" | "fleet" | "history" | "reports") => void;
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  hasForecastCalculated: boolean;
  setHasForecastCalculated: (hasCalc: boolean) => void;
  activeAuthoritySlotId: string;
  setActiveAuthoritySlotId: (slotId: string) => void;
  setOverviewCallback?: (overview: AuthorityOverview) => void;
  onLogout: () => void;
}

export default function AuthorityPortal({
  mapData,
  authoritySubTab,
  setAuthoritySubTab,
  selectedRoute,
  setSelectedRoute,
  hasForecastCalculated,
  setHasForecastCalculated,
  activeAuthoritySlotId,
  setActiveAuthoritySlotId,
  setOverviewCallback,
  onLogout,
}: AuthorityPortalProps) {
  const [targetDate, setTargetDate] = useState(formatDate(new Date()));
  const [hasDashboardCalculated, setHasDashboardCalculated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Authority data states
  const [overview, setOverview] = useState<AuthorityOverview | null>(null);
  const [fleet, setFleet] = useState<BusItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);

  // Allocation Modal State (holds target service ID, shift slot ID, and target departure time when open)
  const [allocateServiceId, setAllocateServiceId] = useState<string | null>(null);
  const [allocateSlotId, setAllocateSlotId] = useState<string | null>(null);
  const [allocateDepartureTime, setAllocateDepartureTime] = useState<string | null>(null);

  /**
   * Fetches latest network overview, fleet status, and allocation audit log from backend.
   */
  const fetchData = async (isBackground: boolean = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const [overviewRes, fleetRes, allocRes] = await Promise.all([
        api.getAuthorityOverview(targetDate),
        api.getFleet(targetDate),
        api.getAllocations(),
      ]);
      setOverview(overviewRes);
      if (setOverviewCallback) {
        setOverviewCallback(overviewRes);
      }
      setFleet(fleetRes);
      setAllocations(allocRes);
    } catch (e) {
      console.error("Failed to load authority data:", e);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetDate]);

  const handleOpenAllocate = (serviceId: string, slotId?: string, departureTime?: string) => {
    setAllocateServiceId(serviceId);
    setAllocateSlotId(slotId || null);
    setAllocateDepartureTime(departureTime || null);
  };

  const handleAllocationSuccess = () => {
    // Refresh fleet and allocation metrics in-place smoothly without full-screen loading flash
    fetchData(true);
  };

  return (
    <div className="w-full text-[#EDDECB]">
      {/* 1. Authority Operations Landing Dashboard */}
      {authoritySubTab === "dashboard" && (
        <AuthorityDashboardView
          overview={overview}
          fleet={fleet}
          allocations={allocations}
          loading={loading}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          hasDashboardCalculated={hasDashboardCalculated}
          setHasDashboardCalculated={setHasDashboardCalculated}
          onNavigateTab={setAuthoritySubTab}
          onSelectRouteAndNavigate={(routeId) => {
            setSelectedRoute(routeId);
            setHasForecastCalculated(true);
            setAuthoritySubTab("forecast");
          }}
          onOpenAllocate={handleOpenAllocate}
          onFetchData={fetchData}
        />
      )}

      {/* 2. Route Demand Forecasting & Departure Inspection View */}
      {authoritySubTab === "forecast" && (
        <AuthorityForecastView
          mapData={mapData}
          overview={overview}
          loading={loading}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          hasForecastCalculated={hasForecastCalculated}
          setHasForecastCalculated={setHasForecastCalculated}
          activeSlotId={activeAuthoritySlotId}
          setActiveSlotId={setActiveAuthoritySlotId}
          onOpenAllocate={handleOpenAllocate}
          onFetchData={fetchData}
        />
      )}

      {/* 3. Standby Fleet Inventory & Assignment View */}
      {authoritySubTab === "fleet" && (
        <AuthorityStandbyFleetView
          fleet={fleet}
          loading={loading}
          onOpenAllocate={handleOpenAllocate}
        />
      )}

      {/* 4. Dispatch History Audit Trail View */}
      {authoritySubTab === "history" && (
        <AuthorityDispatchHistoryView
          allocations={allocations}
          loading={loading}
        />
      )}

      {/* 5. Reports & Intelligence Export View */}
      {authoritySubTab === "reports" && (
        <AuthorityReportsView
          overview={overview}
          fleet={fleet}
          allocations={allocations}
          targetDate={targetDate}
        />
      )}

      {/* Smart Bus Allocation Modal Dialog */}
      {allocateServiceId && (
        <SmartAllocationModal
          isOpen={true}
          serviceId={allocateServiceId}
          targetDate={targetDate}
          initialSlotId={allocateSlotId || undefined}
          initialDepartureTime={allocateDepartureTime || undefined}
          overview={overview}
          onClose={() => {
            setAllocateServiceId(null);
            setAllocateSlotId(null);
            setAllocateDepartureTime(null);
          }}
          onAllocationSuccess={handleAllocationSuccess}
        />
      )}
    </div>
  );
}

