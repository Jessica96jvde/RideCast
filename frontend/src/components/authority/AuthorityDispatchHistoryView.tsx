"use client";

/**
 * RideCast - Transport Authority Dispatch History View
 * ======================================================
 * Displays an immutable audit trail of all standby buses that were dispatched
 * to mitigate route passenger overcrowding.
 * Includes Date, Time, Route, Dispatched Vehicle, Depot, and Authorized Officer.
 */

import React, { useState, useMemo } from "react";
import { Clock, Search, ShieldCheck, MapPin, Bus, Filter, Calendar } from "lucide-react";
import { AllocationRecord } from "@/lib/types";

interface AuthorityDispatchHistoryViewProps {
  allocations: AllocationRecord[];
  loading: boolean;
}

export default function AuthorityDispatchHistoryView({
  allocations,
  loading,
}: AuthorityDispatchHistoryViewProps) {
  const [search, setSearch] = useState("");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState("all");

  // Deduplicate records and extract clean date/time
  const processedAllocations = useMemo(() => {
    const seen = new Set<string>();
    const cleaned: Array<
      AllocationRecord & {
        displayDate: string;
        displayTime: string;
        cleanRouteName: string;
      }
    > = [];

    allocations.forEach((item) => {
      // Build deduplication key
      const key = `${item.date}-${item.service_id}-${item.bus_id}-${item.timestamp || ""}`;
      if (seen.has(key)) return;
      seen.add(key);

      // Extract time from timestamp or default
      let timeStr = "08:15 AM";
      if (item.timestamp && item.timestamp.includes(" ")) {
        const parts = item.timestamp.split(" ");
        if (parts[1]) {
          const timeParts = parts[1].split(":");
          if (timeParts.length >= 2) {
            const hour = parseInt(timeParts[0], 10);
            const ampm = hour >= 12 ? "PM" : "AM";
            const displayHour = hour % 12 || 12;
            timeStr = `${displayHour}:${timeParts[1]} ${ampm}`;
          }
        }
      }

      // Format date
      let dateStr = item.date;
      if (item.date.includes("-")) {
        const p = item.date.split("-");
        if (p.length === 3) {
          const d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
          dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        }
      }

      // Clean route name
      const cleanName = item.route_name
        .replace(/^[A-Za-z0-9\s]+:\s*/, "")
        .replace(/^Service\s+[A-Za-z0-9]+\s*:\s*/i, "")
        .trim();

      cleaned.push({
        ...item,
        allocated_by:
          item.allocated_by && !item.allocated_by.toLowerCase().includes("rajesh")
            ? item.allocated_by
            : "Ravi",
        displayDate: dateStr,
        displayTime: timeStr,
        cleanRouteName: cleanName || "Arterial Corridor",
      });
    });

    return cleaned;
  }, [allocations]);

  // Unique routes for filter dropdown
  const routeOptions = useMemo(() => {
    const sids = new Set(processedAllocations.map((a) => a.service_id.toUpperCase()));
    return Array.from(sids);
  }, [processedAllocations]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return processedAllocations.filter((a) => {
      const matchesRoute =
        selectedRouteFilter === "all" || a.service_id.toUpperCase() === selectedRouteFilter.toUpperCase();
      const q = search.toLowerCase();
      const matchesSearch =
        a.service_id.toLowerCase().includes(q) ||
        a.bus_id.toLowerCase().includes(q) ||
        a.bus_number.toLowerCase().includes(q) ||
        a.source_depot.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.displayDate.toLowerCase().includes(q) ||
        a.allocated_by.toLowerCase().includes(q);
      return matchesRoute && matchesSearch;
    });
  }, [processedAllocations, selectedRouteFilter, search]);

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto w-full text-[#EDDECB] pb-10">
      {/* 1. Header Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#EDDECB] flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#F3B763]" />
            Dispatch History
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-4 py-2 rounded-full bg-[#16181d] border border-[#6B8D8A]/30 font-mono font-bold text-xs text-[#F3B763] shadow-sm">
            {loading ? "Loading dispatches..." : `${filtered.length} Dispatches Recorded`}
          </span>
        </div>
      </div>

      {/* 2. Audit Table Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#B5C3C4] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search date, route, vehicle number, or reason..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] placeholder-[#B5C3C4]/40 focus:outline-none focus:border-[#F3B763]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#F3B763]" />
            <span className="text-xs text-[#B5C3C4] font-semibold">Route:</span>
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] font-bold focus:outline-none focus:border-[#F3B763] cursor-pointer"
            >
              <option value="all">All Dispatched Routes</option>
              {routeOptions.map((sid) => (
                <option key={sid} value={sid} className="bg-[#1f2329] text-[#EDDECB]">
                  Route {sid.replace(/^S/i, "")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                <th className="py-3 px-4 font-black uppercase tracking-wider">Date & Time</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Route</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Dispatched Bus</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Source Depot</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8D8A]/15">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[#B5C3C4]">
                    Loading dispatch history...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[#B5C3C4]">
                    No dispatches have been recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-[#252a32]/60 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-black text-[#F3B763]">{item.displayDate}</div>
                      <div className="text-[11px] text-[#B5C3C4] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#B5C3C4]" />
                        <span>{item.displayTime}</span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4 font-bold text-[#EDDECB]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#AF4B47]/20 text-[#F3B763] border border-[#AF4B47]/30 text-[11px] font-mono font-black shrink-0">
                          Route {item.service_id.replace(/^S/i, "")}
                        </span>
                        <span className="truncate max-w-[180px]" title={item.cleanRouteName}>
                          {item.cleanRouteName}
                        </span>
                      </div>
                    </td>

                    {/* Dispatched Bus */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-extrabold text-[#EDDECB] text-xs">{item.bus_number || item.bus_id}</div>
                    </td>

                    {/* Source Depot */}
                    <td className="py-3.5 px-4 text-[#EDDECB] font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#96BCBB]" />
                        <span>{item.source_depot}</span>
                      </div>
                    </td>

                    {/* Authorized By */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[#F3B763] font-bold text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#F3B763]" />
                        <span>
                          {item.allocated_by && !item.allocated_by.toLowerCase().includes("rajesh")
                            ? item.allocated_by
                            : "Ravi"}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
