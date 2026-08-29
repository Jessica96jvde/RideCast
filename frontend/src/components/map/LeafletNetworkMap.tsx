"use client";

import React, { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { AuthorityRouteForecast } from "@/lib/types";

interface LeafletNetworkMapProps {
  selectedService: string;
  routeForecasts?: Record<string, AuthorityRouteForecast>;
  stopCoords: Record<string, [number, number]>;
  stopNames: Record<string, string>;
  routeGeometry: Record<
    string,
    {
      service_id: string;
      color: string;
      stops: string[];
      coordinates: [number, number][];
    }
  >;
  routeStartCoords: Record<string, [number, number, string]>;
}

export default function LeafletNetworkMap({
  selectedService,
  routeForecasts,
  stopCoords,
  stopNames,
  routeGeometry,
  routeStartCoords,
}: LeafletNetworkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [11.0168, 76.9558],
        zoom: 12,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | RideCast Fleet Operations',
          maxZoom: 19,
        }
      ).addTo(map);

      const allCoords: [number, number][] = [];
      const serviceIds =
        selectedService === "All Routes"
          ? Object.keys(routeGeometry)
          : [selectedService];

      serviceIds.forEach((sid) => {
        const geom = routeGeometry[sid];
        if (!geom || !geom.coordinates || geom.coordinates.length < 2) return;

        allCoords.push(...geom.coordinates);

        const forecast = routeForecasts ? routeForecasts[sid] : null;
        const demand = forecast ? forecast.expected_passengers : 1500;
        const weight = selectedService === sid ? 7 : 4.5;
        const opacity = selectedService === "All Routes" || selectedService === sid ? 0.9 : 0.35;

        // Corridor polyline
        const polyline = L.polyline(geom.coordinates, {
          color: geom.color || "#38bdf8",
          weight: weight,
          opacity: opacity,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        polyline.bindPopup(`
          <div class="p-2">
            <h4 class="font-bold text-sky-400 text-sm">Route ${sid}</h4>
            <div class="text-xs text-slate-300 mt-1">
              <strong>Forecasted Demand:</strong> ${demand.toLocaleString()} passengers<br/>
              <strong>Status:</strong> ${forecast ? forecast.crowd_level : "Normal"} ${forecast ? forecast.crowd_icon : "🟢"}<br/>
              <strong>Extra Buses:</strong> ${forecast ? forecast.buses_required : 0} units
            </div>
          </div>
        `);

        // Start and end terminal markers
        if (geom.stops.length > 0) {
          const startId = geom.stops[0];
          const endId = geom.stops[geom.stops.length - 1];

          if (stopCoords[startId]) {
            L.circleMarker(stopCoords[startId], {
              radius: 6,
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 1,
              weight: 2,
            })
              .addTo(map)
              .bindTooltip(`Origin: ${stopNames[startId] || startId}`);
          }

          if (stopCoords[endId]) {
            L.circleMarker(stopCoords[endId], {
              radius: 6,
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 1,
              weight: 2,
            })
              .addTo(map)
              .bindTooltip(`Terminus: ${stopNames[endId] || endId}`);
          }
        }
      });

      // Plot Major Depot Hubs
      const depots = [
        { name: "Ukkadam Depot", lat: 11.0005, lon: 76.9695, color: "#f59e0b" },
        { name: "Gandhipuram Depot", lat: 11.0025, lon: 76.9665, color: "#38bdf8" },
        { name: "Singanallur Depot", lat: 10.9760, lon: 76.9940, color: "#10b981" },
        { name: "Ondipudur Depot", lat: 10.9820, lon: 76.9870, color: "#a855f7" },
        { name: "Saibaba Colony Stand", lat: 11.0455, lon: 76.8790, color: "#ec4899" },
      ];

      depots.forEach((depot) => {
        const depotIcon = L.divIcon({
          className: "depot-map-marker",
          html: `<div style="background-color: ${depot.color}; width: 14px; height: 14px; border-radius: 3px; border: 2px solid #ffffff; box-shadow: 0 0 8px ${depot.color};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        L.marker([depot.lat, depot.lon], { icon: depotIcon })
          .addTo(map)
          .bindPopup(`<strong>🏢 ${depot.name}</strong><br/><span class="text-xs text-slate-400">Fleet Dispatch Hub</span>`);
      });

      if (allCoords.length > 1) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedService, routeForecasts, stopCoords, stopNames, routeGeometry, routeStartCoords]);

  return (
    <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-[#6B8D8A]/30 shadow-md isolate z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 z-20 bg-[#1f2329]/95 backdrop-blur-md border border-[#6B8D8A]/40 px-3.5 py-2 rounded-2xl text-xs flex flex-wrap items-center gap-3 text-[#EDDECB] shadow-xl">
        <span className="font-black text-[#F3B763]">Corridors:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#AF4B47]"></span> S45</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F3B763]"></span> S57</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#96BCBB]"></span> S33A</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6B8D8A]"></span> S48</span>
        <span className="border-l border-[#6B8D8A]/40 pl-2 flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-[#E4C964] rounded-sm"></span> Depot Hubs
        </span>
      </div>
    </div>
  );
}
