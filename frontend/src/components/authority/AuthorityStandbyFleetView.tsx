"use client";

/**
 * RideCast - Transport Authority Standby Fleet Management View
 * =============================================================
 * Displays all standby reserve and deployed buses stationed across Coimbatore depots.
 * Allows authority officers to review capacity, vehicle details, and assign / dispatch
 * available standby units to routes requiring additional capacity.
 */

import React, { useState } from "react";
import { Bus, Search, Filter, Fuel, CheckCircle, MapPin, Send, Radio, ShieldCheck } from "lucide-react";
import { BusItem } from "@/lib/types";

interface AuthorityStandbyFleetViewProps {
  fleet: BusItem[];
  loading: boolean;
  onOpenAllocate: (serviceId: string, slotId?: string, departureTime?: string) => void;
}

export default function AuthorityStandbyFleetView({
  fleet,
  loading,
  onOpenAllocate,
}: AuthorityStandbyFleetViewProps) {
  const [filterDepot, setFilterDepot] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "Idle" | "Allocated">("all");
  const [search, setSearch] = useState("");

  const idleCount = fleet.filter((b) => b.status === "Idle").length;
  const allocatedCount = fleet.filter((b) => b.status === "Allocated").length;
  const depots = Array.from(new Set(fleet.map((b) => b.depot_name)));

  const filtered = fleet.filter((b) => {
    const matchesDepot = filterDepot === "all" || b.depot_name === filterDepot;
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;
    const matchesSearch =
      b.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      b.bus_id.toLowerCase().includes(search.toLowerCase()) ||
      b.depot_name.toLowerCase().includes(search.toLowerCase());
    return matchesDepot && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto w-full text-[#EDDECB] pb-10">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#EDDECB] flex items-center gap-2.5 font-mono uppercase tracking-wide">
          <Bus className="w-6 h-6 text-[#F3B763]" />
          Standby & Deployed Fleet
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-full bg-[#1f2329] border border-[#6B8D8A]/30 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {loading ? "..." : `${idleCount} STANDBY READY`}
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-[#1f2329] border border-[#6B8D8A]/30 text-[#F3B763] font-mono font-bold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F3B763] animate-pulse"></span>
            {loading ? "..." : `${allocatedCount} DEPLOYED`}
          </span>
        </div>
      </div>

      {/* 2. Table Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Search, Status & Depot Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#B5C3C4] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle number or ID..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] placeholder-[#B5C3C4]/40 focus:outline-none focus:border-[#F3B763]"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#B5C3C4] font-semibold">Status:</span>
              <div className="inline-flex rounded-xl bg-[#16181d] p-1 border border-[#6B8D8A]/30">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-[#F3B763] text-[#121417]"
                      : "text-[#B5C3C4] hover:text-[#EDDECB]"
                  }`}
                >
                  All ({fleet.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("Idle")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === "Idle"
                      ? "bg-emerald-500 text-white"
                      : "text-[#B5C3C4] hover:text-[#EDDECB]"
                  }`}
                >
                  Standby ({idleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("Allocated")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === "Allocated"
                      ? "bg-[#AF4B47] text-[#EDDECB]"
                      : "text-[#B5C3C4] hover:text-[#EDDECB]"
                  }`}
                >
                  Deployed ({allocatedCount})
                </button>
              </div>
            </div>

            {/* Depot Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#F3B763]" />
              <span className="text-xs text-[#B5C3C4] font-semibold">Depot:</span>
              <select
                value={filterDepot}
                onChange={(e) => setFilterDepot(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] font-bold focus:outline-none focus:border-[#F3B763] cursor-pointer"
              >
                <option value="all">All Depots</option>
                {depots.map((d) => (
                  <option key={d} value={d} className="bg-[#1f2329] text-[#EDDECB]">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Fleet Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                <th className="py-3 px-4 font-black uppercase tracking-wider">Vehicle Number</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Stationed Depot</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Engine / Fuel</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8D8A]/15">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[#B5C3C4]">
                    Loading fleet inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[#B5C3C4]">
                    No buses match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((bus) => {
                  const isAllocated = bus.status === "Allocated";
                  return (
                    <tr key={bus.bus_id} className="hover:bg-[#252a32]/60 transition-colors">
                      {/* Vehicle Number */}
                      <td className="py-3.5 px-4 font-mono font-black text-[#F3B763] text-sm">
                        <div>{bus.bus_number}</div>
                        <div className="text-[10px] text-[#B5C3C4] font-normal">{bus.bus_id}</div>
                      </td>

                      {/* Stationed Depot */}
                      <td className="py-3.5 px-4 text-[#EDDECB] font-semibold">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#96BCBB]" />
                          <span>{bus.depot_name}</span>
                        </div>
                      </td>

                      {/* Engine / Fuel */}
                      <td className="py-3.5 px-4 text-[#B5C3C4]">
                        <div className="flex items-center gap-1.5">
                          <Fuel className="w-3.5 h-3.5 text-[#F3B763]" />
                          <span>{bus.fuel_type}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isAllocated ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#AF4B47]/25 text-[#F3B763] border border-[#AF4B47]/40 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-[#F3B763] animate-pulse"></span>
                            Deployed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            Standby (Ready)
                          </span>
                        )}
                      </td>

                      {/* Action: Assign Bus or Deployed Indicator */}
                      <td className="py-3.5 px-4 text-right">
                        {isAllocated ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#16181d] text-[#96BCBB] border border-[#6B8D8A]/30 text-xs font-bold font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#96BCBB]" />
                            Deployed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenAllocate("S45")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                            title={`Assign ${bus.bus_id} to congested corridor`}
                          >
                            <Send className="w-3 h-3" />
                            <span>Assign Bus</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

