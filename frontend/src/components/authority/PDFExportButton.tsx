"use client";

import React, { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface PDFExportButtonProps {
  targetDate: string;
  selectedService: string;
}

export default function PDFExportButton({
  targetDate,
  selectedService,
}: PDFExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = api.getExportPdfUrl(targetDate, selectedService);
      // Trigger browser download via anchor tag
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RideCast_Intelligence_Report_${targetDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
    >
      {downloading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span>Compiling PDF Report...</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Export Authority Intelligence PDF</span>
        </>
      )}
    </button>
  );
}
