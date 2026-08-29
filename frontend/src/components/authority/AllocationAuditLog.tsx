"use client";

import React, { useState } from "react";
import { Clock, ShieldCheck, MapPin, Search } from "lucide-react";
import { AllocationRecord } from "@/lib/types";

interface AllocationAuditLogProps {
  allocations: AllocationRecord[];
  loading: boolean;
}

export default function AllocationAuditLog({
  allocations,
  loading,
}: AllocationAuditLogProps) {
  const [search, setSearch] = useState("");

  const filtered = allocations.filter((a) => {
    return (
      a.service_id.toLowerCase().includes(search.toLowerCase()) ||
      a.bus_id.toLowerCase().includes(search.toLowerCase()) ||
      a.source_depot.toLowerCase().includes(search.toLowerCase()) ||
      a.reason.toLowerCase().includes(search.toLowerCase()) ||
      a.date.includes(search)
    );
  });

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Smart Fleet Dispatch Audit Log
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all authority bus allocations with officer timestamp
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
              <th className="py-2.5 px-3 font-semibold">Date</th>
              <th className="py-2.5 px-3 font-semibold">Route</th>
              <th className="py-2.5 px-3 font-semibold">Dispatched Vehicle</th>
              <th className="py-2.5 px-3 font-semibold">Source Hub</th>
              <th className="py-2.5 px-3 font-semibold">Haversine Distance</th>
              <th className="py-2.5 px-3 font-semibold">Dispatch Reason / Surge Trigger</th>
              <th className="py-2.5 px-3 font-semibold text-right">Authorized By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  Loading audit log...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No allocation records found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 text-slate-300 font-mono">
                    {item.date}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold text-[11px]">
                      {item.service_id}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-100 font-extrabold font-mono">
                    {item.bus_id}{" "}
                    <span className="text-slate-400 font-normal text-[11px]">
                      ({item.bus_number})
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {item.source_depot}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono">
                    {item.distance_km} km
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                    {item.reason}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-amber-300 font-medium text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      {item.allocated_by}
                    </span>
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
