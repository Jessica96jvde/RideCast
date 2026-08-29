"use client";

import React, { useState, useEffect } from "react";
import AuthorityProfileView from "./AuthorityProfileView";
import AuthorityForecastView from "./AuthorityForecastView";
import AuthorityIdleBusesView from "./AuthorityIdleBusesView";
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
  authoritySubTab: "profile" | "forecast" | "idle" | "report";
  setAuthoritySubTab: (tab: "profile" | "forecast" | "idle" | "report") => void;
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  hasForecastCalculated: boolean;
  setHasForecastCalculated: (hasCalc: boolean) => void;
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
  onLogout,
}: AuthorityPortalProps) {
  const [targetDate, setTargetDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState<AuthorityOverview | null>(null);
  const [fleet, setFleet] = useState<BusItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);

  // Allocation Modal State
  const [allocateServiceId, setAllocateServiceId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, fleetRes, allocRes] = await Promise.all([
        api.getAuthorityOverview(targetDate),
        api.getFleet(targetDate),
        api.getAllocations(),
      ]);
      setOverview(overviewRes);
      setFleet(fleetRes);
      setAllocations(allocRes);
    } catch (e) {
      console.error("Failed to load authority data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetDate]);

  const handleOpenAllocate = (serviceId: string) => {
    setAllocateServiceId(serviceId);
  };

  const handleAllocationSuccess = () => {
    fetchData();
  };

  return (
    <div className="w-full text-[#EDDECB]">
      {/* 1. Profile Tab (Sketch 1) */}
      {authoritySubTab === "profile" && (
        <AuthorityProfileView
          allocations={allocations}
          loading={loading}
        />
      )}

      {/* 2. Forecast Tab (Sketches 2 & 3) */}
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
          onOpenAllocate={handleOpenAllocate}
          onFetchData={fetchData}
        />
      )}

      {/* 3. Idle Buses Tab */}
      {authoritySubTab === "idle" && (
        <AuthorityIdleBusesView
          fleet={fleet}
          loading={loading}
          onOpenAllocate={handleOpenAllocate}
        />
      )}

      {/* Smart Allocation Modal */}
      {allocateServiceId && (
        <SmartAllocationModal
          isOpen={true}
          serviceId={allocateServiceId}
          targetDate={targetDate}
          onClose={() => setAllocateServiceId(null)}
          onAllocationSuccess={handleAllocationSuccess}
        />
      )}
    </div>
  );
}
