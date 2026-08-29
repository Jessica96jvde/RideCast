import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RideCast — AI Bus Crowd Forecasting & Fleet Allocation",
  description:
    "Next-generation urban transit intelligence platform predicting bus crowd density, optimizing departures, and automating proximity fleet dispatch for Coimbatore city.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
