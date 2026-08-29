"use client";

import React, { useState } from "react";
import { Bus, Filter, Search, CheckCircle2, Clock, Fuel } from "lucide-react";
import { BusItem } from "@/lib/types";

interface FleetStatusTableProps {
  fleet: BusItem[];
  loading: boolean;
}

export default function FleetStatusTable({
  fleet,
  loading,
}: FleetStatusTableProps) {
  const [filterDepot, setFilterDepot] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const depots = Array.from(new Set(fleet.map((b) => b.depot_name)));

  const filteredFleet = fleet.filter((bus) => {
    const matchesDepot = filterDepot === "all" || bus.depot_name === filterDepot;
    const matchesStatus = filterStatus === "all" || bus.status === filterStatus;
    const matchesSearch =
      bus.bus_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.depot_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDepot && matchesStatus && matchesSearch;
  });

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Bus className="w-4 h-4 text-sky-400" />
            Depot Fleet Inventory & Status Monitor
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking of idle and allocated buses across Coimbatore depots
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus ID / number..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Depot Filter */}
          <select
            value={filterDepot}
            onChange={(e) => setFilterDepot(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">All Depots</option>
            {depots.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Idle">Idle (Available)</option>
            <option value="Allocated">Allocated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
              <th className="py-2.5 px-3 font-semibold">Bus ID</th>
              <th className="py-2.5 px-3 font-semibold">Vehicle Number</th>
              <th className="py-2.5 px-3 font-semibold">Home Depot</th>
              <th className="py-2.5 px-3 font-semibold">Capacity</th>
              <th className="py-2.5 px-3 font-semibold">Fuel Engine</th>
              <th className="py-2.5 px-3 font-semibold text-right">Current Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  Loading fleet data...
                </td>
              </tr>
            ) : filteredFleet.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  No matching fleet units found.
                </td>
              </tr>
            ) : (
              filteredFleet.map((bus) => (
                <tr
                  key={bus.bus_id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-extrabold text-slate-100 font-mono">
                    {bus.bus_id}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono">
                    {bus.bus_number}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {bus.depot_name}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {bus.capacity} seats
                  </td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Fuel className="w-3 h-3 text-sky-400" />
                      {bus.fuel_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {bus.status === "Idle" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Idle / Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Clock className="w-3 h-3" />
                        Active Allocated
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
