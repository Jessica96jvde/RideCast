"use client";

/**
 * RideCast - Transport Authority Reports & Export View
 * ======================================================
 * Enables the Transport Authority Director (Ravi) to configure, preview,
 * and export transit intelligence reports across crowd demand forecasts,
 * fleet dispatch history, standby fleet readiness, and overcrowding summaries.
 * Includes 1-click PDF download via backend report service and CSV export.
 */

import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Bus,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  Table,
  FileSpreadsheet,
} from "lucide-react";
import { AuthorityOverview, BusItem, AllocationRecord } from "@/lib/types";
import { api } from "@/lib/api";

interface AuthorityReportsViewProps {
  overview: AuthorityOverview | null;
  fleet: BusItem[];
  allocations: AllocationRecord[];
  targetDate: string;
}

type ReportType =
  | "forecast"
  | "dispatch"
  | "fleet"
  | "overcrowding"
  | "allocation";

export default function AuthorityReportsView({
  overview,
  fleet,
  allocations,
  targetDate,
}: AuthorityReportsViewProps) {
  const [reportType, setReportType] = useState<ReportType>("forecast");
  const [selectedRoute, setSelectedRoute] = useState("All Routes");
  const [startDate, setStartDate] = useState(targetDate || "2026-08-20");
  const [endDate, setEndDate] = useState(targetDate || "2026-08-26");
  const [isGenerated, setIsGenerated] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Report Data Generation
  // ---------------------------------------------------------------------------
  const routesData = overview?.routes || {};
  const routeEntries = Object.entries(routesData).filter(([sid]) => {
    if (selectedRoute === "All Routes") return true;
    return sid.toUpperCase() === selectedRoute.toUpperCase();
  });

  // Export PDF handler
  const handleExportPdf = () => {
    setIsExportingPdf(true);
    const pdfUrl = api.getExportPdfUrl(targetDate, selectedRoute);
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.target = "_blank";
    link.download = `RideCast_Report_${targetDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExportingPdf(false), 1200);
  };

  // Export CSV handler
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `RideCast_${reportType}_report_${targetDate}.csv`;

    if (reportType === "forecast" || reportType === "overcrowding") {
      headers = ["Route ID", "Route Name", "Expected Passengers", "Normal Capacity", "Crowd Level", "Extra Buses Needed"];
      rows = routeEntries.map(([sid, r]) => [
        sid,
        `"${r.route_name}"`,
        r.expected_passengers.toString(),
        r.normal_passengers.toString(),
        r.crowd_level,
        r.buses_required.toString(),
      ]);
    } else if (reportType === "dispatch" || reportType === "allocation") {
      headers = ["Date", "Route ID", "Route Name", "Vehicle Number", "Depot", "Reason", "Authorized By"];
      rows = allocations.map((a) => [
        a.date,
        a.service_id,
        `"${a.route_name}"`,
        a.bus_number || a.bus_id,
        `"${a.source_depot}"`,
        `"${a.reason}"`,
        `"${a.allocated_by}"`,
      ]);
    } else {
      headers = ["Vehicle Number", "Depot", "Capacity", "Fuel Type", "Status"];
      rows = fleet.map((b) => [
        b.bus_number,
        `"${b.depot_name}"`,
        b.capacity.toString(),
        b.fuel_type,
        b.status,
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preset date ranges
  const applyPreset = (preset: "today" | "week" | "month" | "all") => {
    if (preset === "today") {
      setStartDate(targetDate);
      setEndDate(targetDate);
    } else if (preset === "week") {
      setStartDate("2026-08-20");
      setEndDate("2026-08-26");
    } else if (preset === "month") {
      setStartDate("2026-08-01");
      setEndDate("2026-08-31");
    } else {
      setStartDate("2026-08-01");
      setEndDate("2026-09-24");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto w-full text-[#EDDECB] pb-10">
      {/* 1. Header Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#EDDECB] flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#F3B763]" />
            Reports & Operations Intelligence
          </h1>
          <p className="text-xs text-[#B5C3C4] mt-1">
            Generate, inspect, and export executive transit intelligence documents
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#AF4B47] hover:bg-[#c75651] text-[#EDDECB] font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? "Exporting PDF..." : "Export PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#252a32] hover:bg-[#343b44] text-[#EDDECB] font-bold text-xs uppercase tracking-wider border border-[#6B8D8A]/30 transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#96BCBB]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Configuration Form Card */}
      <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="border-b border-[#6B8D8A]/20 pb-2">
          <h2 className="text-xs font-black text-[#EDDECB] uppercase tracking-wider">
            Report Parameters & Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Report Type (4 cols) */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[11px] font-black text-[#B5C3C4] uppercase tracking-wider">
              Report Type:
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as ReportType);
                setIsGenerated(true);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] font-bold focus:outline-none focus:border-[#F3B763] cursor-pointer"
            >
              <option value="forecast" className="bg-[#1f2329]">
                Crowd Forecast & Demand Intelligence
              </option>
              <option value="dispatch" className="bg-[#1f2329]">
                Dispatch History & Extra Bus Allocations
              </option>
              <option value="fleet" className="bg-[#1f2329]">
                Standby Fleet Availability & Status
              </option>
              <option value="overcrowding" className="bg-[#1f2329]">
                Overcrowding Summary & Surge Analysis
              </option>
              <option value="allocation" className="bg-[#1f2329]">
                Executive Bus Allocation Audit
              </option>
            </select>
          </div>

          {/* Route Filter (4 cols) */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[11px] font-black text-[#B5C3C4] uppercase tracking-wider">
              Corridor / Route Scope:
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => {
                setSelectedRoute(e.target.value);
                setIsGenerated(true);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16181d] border border-[#6B8D8A]/30 text-xs text-[#EDDECB] font-bold focus:outline-none focus:border-[#F3B763] cursor-pointer"
            >
              <option value="All Routes" className="bg-[#1f2329]">
                All Routes (Metropolitan Network — 16 Services)
              </option>
              <option value="S45" className="bg-[#1f2329]">Route 45 — Ukkadam ↔ Vellamadai</option>
              <option value="S57" className="bg-[#1f2329]">Route 57 — Ukkadam ↔ Saibaba Stand</option>
              <option value="S33A" className="bg-[#1f2329]">Route 33A — Gandhipuram ↔ Kinathukadavu</option>
              <option value="S48" className="bg-[#1f2329]">Route 48 — Gandhipuram ↔ Vanthavalam</option>
              <option value="S52" className="bg-[#1f2329]">Route 52 — Gandhipuram ↔ Kovilpalayam</option>
            </select>
          </div>

          {/* Date Range / Presets (4 cols) */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[11px] font-black text-[#B5C3C4] uppercase tracking-wider">
              Date Range Presets:
            </label>
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="py-2 rounded-lg bg-[#16181d] hover:bg-[#252a32] text-[10px] font-black uppercase text-[#EDDECB] border border-[#6B8D8A]/20 transition-all cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset("week")}
                className="py-2 rounded-lg bg-[#16181d] hover:bg-[#252a32] text-[10px] font-black uppercase text-[#EDDECB] border border-[#6B8D8A]/20 transition-all cursor-pointer"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset("month")}
                className="py-2 rounded-lg bg-[#16181d] hover:bg-[#252a32] text-[10px] font-black uppercase text-[#EDDECB] border border-[#6B8D8A]/20 transition-all cursor-pointer"
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="py-2 rounded-lg bg-[#16181d] hover:bg-[#252a32] text-[10px] font-black uppercase text-[#EDDECB] border border-[#6B8D8A]/20 transition-all cursor-pointer"
              >
                Audit
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setIsGenerated(true)}
            className="px-5 py-2.5 rounded-xl bg-[#F3B763] hover:bg-[#e2a855] text-[#14161a] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#14161a]" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* 3. Live Report Data Preview */}
      {isGenerated && (
        <div className="bg-[#1f2329] border border-[#6B8D8A]/30 rounded-3xl p-6 shadow-2xl space-y-4">
          {/* Header info in preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6B8D8A]/20 pb-3">
            <div>
              <div className="text-sm font-black text-[#EDDECB] uppercase tracking-wide flex items-center gap-2">
                <Table className="w-4 h-4 text-[#F3B763]" />
                <span>
                  {reportType === "forecast" && "Crowd Forecast & Demand Intelligence Report"}
                  {reportType === "dispatch" && "Dispatch History & Fleet Allocations Report"}
                  {reportType === "fleet" && "Standby Fleet Availability & Status Report"}
                  {reportType === "overcrowding" && "Overcrowding Risk & Surge Analysis Report"}
                  {reportType === "allocation" && "Executive Bus Allocation Audit Report"}
                </span>
              </div>
              <p className="text-[11px] text-[#B5C3C4] mt-0.5">
                Target Date: <strong>{targetDate}</strong> • Scope: <strong>{selectedRoute}</strong> • Officer: <strong>Ravi</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                Report Ready
              </span>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto">
            {reportType === "forecast" || reportType === "overcrowding" ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Route</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Corridor Name</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Expected Demand</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Normal Baseline</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Crowd Status</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider text-right">Extra Buses Needed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6B8D8A]/15">
                  {routeEntries.map(([sid, r]) => (
                    <tr key={sid} className="hover:bg-[#252a32]/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-black text-[#F3B763]">
                        Route {sid.replace(/^S/i, "")}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#EDDECB]">
                        {r.route_name.replace(/^[A-Za-z0-9\s]+:\s*/, "").replace(/^Service\s+[A-Za-z0-9]+\s*:\s*/i, "").trim()}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-[#EDDECB]">
                        {r.expected_passengers.toLocaleString()} pax
                      </td>
                      <td className="py-3 px-3 font-mono text-[#B5C3C4]">
                        {r.normal_passengers.toLocaleString()} pax
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            r.crowd_level === "High"
                              ? "bg-[#AF4B47]/20 text-[#AF4B47] border-[#AF4B47]/40"
                              : r.crowd_level === "Moderate"
                              ? "bg-[#F3B763]/20 text-[#F3B763] border-[#F3B763]/40"
                              : "bg-[#96BCBB]/20 text-[#96BCBB] border-[#96BCBB]/40"
                          }`}
                        >
                          {r.crowd_icon} {r.crowd_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {r.buses_required > 0 ? (
                          <span className="text-red-400 font-black">+{r.buses_required} Extra Bus Needed</span>
                        ) : (
                          <span className="text-emerald-400 font-normal">Standard Fleet (0)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === "dispatch" || reportType === "allocation" ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Date</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Route</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Dispatched Bus</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Source Depot</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider text-right">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6B8D8A]/15">
                  {allocations.map((a, idx) => (
                    <tr key={idx} className="hover:bg-[#252a32]/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#F3B763]">{a.date}</td>
                      <td className="py-3 px-3 font-bold text-[#EDDECB]">
                        Route {a.service_id.replace(/^S/i, "")}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#EDDECB]">
                        {a.bus_number || a.bus_id}
                      </td>
                      <td className="py-3 px-3 text-[#B5C3C4]">{a.source_depot}</td>
                      <td className="py-3 px-3 text-right text-[#F3B763] font-semibold">
                        {a.allocated_by && !a.allocated_by.toLowerCase().includes("rajesh")
                          ? a.allocated_by
                          : "Ravi"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#6B8D8A]/20 text-[#B5C3C4] bg-[#16181d]">
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Vehicle Number</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Depot</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider">Fuel Type</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6B8D8A]/15">
                  {fleet.map((bus) => (
                    <tr key={bus.bus_id} className="hover:bg-[#252a32]/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-black text-[#F3B763]">{bus.bus_number}</td>
                      <td className="py-3 px-3 text-[#EDDECB]">{bus.depot_name}</td>
                      <td className="py-3 px-3 text-[#B5C3C4]">{bus.fuel_type}</td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            bus.status === "Idle"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-[#AF4B47]/20 text-[#AF4B47] border border-[#AF4B47]/30"
                          }`}
                        >
                          {bus.status === "Idle" ? "Standby (Ready)" : "Dispatched"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
