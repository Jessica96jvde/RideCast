"use client";

import React, { useState } from "react";
import { Bus, Search, Filter, Fuel, CheckCircle, Clock, MapPin } from "lucide-react";
import { BusItem } from "@/lib/types";

interface AuthorityIdleBusesViewProps {
  fleet: BusItem[];
  loading: boolean;
  onOpenAllocate?: (serviceId: string, slotId?: string, departureTime?: string) => void;
}

export default function AuthorityIdleBusesView({
  fleet,
  loading,
  onOpenAllocate,
}: AuthorityIdleBusesViewProps) {
  const [filterDepot, setFilterDepot] = useState<string>("all");
  const [search, setSearch] = useState("");

  const idleFleet = fleet.filter((b) => b.status === "Idle");
  const depots = Array.from(new Set(idleFleet.map((b) => b.depot_name)));

  const filtered = idleFleet.filter((b) => {
    const matchesDepot = filterDepot === "all" || b.depot_name === filterDepot;
    const matchesSearch =
      b.bus_id.toLowerCase().includes(search.toLowerCase()) ||
      b.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      b.depot_name.toLowerCase().includes(search.toLowerCase());
    return matchesDepot && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto w-full text-[#EDDECB] pb-10">
      {/* Header Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#EDDECB] flex items-center gap-2.5">
            <Bus className="w-6 h-6 text-[#F3B763]" />
            Idle Depot Fleet Inventory
          </h1>
          <p className="text-xs text-[#B5C3C4] mt-1">
            Standby reserve fleet units across Coimbatore depots available for surge reallocation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
            {filtered.length} Standby Units Available
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#B5C3C4] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bus number or depot..."
              className="pl-9 pr-3.5 py-2 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] placeholder-[#B5C3C4]/40 focus:outline-none focus:border-[#F3B763]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#F3B763]" />
            <span className="text-xs text-[#B5C3C4] font-semibold">Depot:</span>
            <select
              value={filterDepot}
              onChange={(e) => setFilterDepot(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] font-bold focus:outline-none focus:border-[#F3B763] cursor-pointer"
            >
              <option value="all">All Standby Depots</option>
              {depots.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                <th className="py-3 px-4 font-black uppercase tracking-wider">Bus ID</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Vehicle Number</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Stationed Depot</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider">Engine / Fuel</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-right">Standby Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#6B8D8A]/15">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#B5C3C4]">
                    Loading idle fleet data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#B5C3C4]">
                    No idle buses found for the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((bus) => (
                  <tr key={bus.bus_id} className="hover:bg-[#252a32]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-[#F3B763]">
                      {bus.bus_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#EDDECB]">
                      {bus.bus_number}
                    </td>
                    <td className="py-3.5 px-4 text-[#EDDECB] font-semibold">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#96BCBB]" />
                        <span>{bus.depot_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#B5C3C4]">
                      <div className="flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-[#F3B763]" />
                        <span>{bus.fuel_type}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" />
                        Standby (Ready)
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
