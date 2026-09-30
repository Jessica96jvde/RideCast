"use client";

/**
 * RideCast - Leaflet Network Overview Map Component
 * ==================================================
 * Renders an interactive transit network map for the Transport Authority Portal:
 * - Plots all active transit corridors with distinctive color codes.
 * - Highlights high-congestion routes in real-time.
 * - Draws dashed trajectory lines showing emergency fleet dispatches from nearest bus depots.
 * - Displays prominent depot station labels across Coimbatore.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. Multi-Route Layering:
 *    - Iterates over all active transit corridors and adds polyline layers.
 * 
 * 2. Visual Dispatch Lines:
 *    - When `buses_required > 0`, renders a glowing dashed line (`dashArray: "6, 8"`)
 *      connecting the nearest depot directly to the congested route terminus.
 */

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
  height?: string;
  className?: string;
}

// In-memory cache for road geometries
const roadCache = new Map<string, [number, number][]>();

/**
 * Fetches turn-by-turn road curves from OSRM to render smooth asphalt polylines.
 */
async function fetchRoadRoute(coords: [number, number][]): Promise<[number, number][]> {
  if (coords.length < 2) return coords;
  const cacheKey = coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join(";");
  if (roadCache.has(cacheKey)) {
    return roadCache.get(cacheKey)!;
  }

  try {
    let sampled = coords;
    if (coords.length > 12) {
      const step = (coords.length - 1) / 10;
      sampled = [coords[0]];
      for (let i = 1; i < 10; i++) {
        sampled.push(coords[Math.round(i * step)]);
      }
      sampled.push(coords[coords.length - 1]);
    }

    const locString = sampled.map((c) => `${c[1].toFixed(5)},${c[0].toFixed(5)}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${locString}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return coords;
    const data = await res.json();
    if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
      const roadCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (pt: [number, number]) => [pt[1], pt[0]]
      );
      if (roadCoords.length > 1) {
        roadCache.set(cacheKey, roadCoords);
        return roadCoords;
      }
    }
    return coords;
  } catch (e) {
    return coords;
  }
}

export default function LeafletNetworkMap({
  selectedService,
  routeForecasts,
  stopCoords,
  stopNames,
  routeGeometry,
  routeStartCoords,
  height,
  className,
}: LeafletNetworkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet on client side
    import("leaflet").then(async (L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous map if re-rendering
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

      // Base OpenStreetMap tile layer
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

      // Plot all relevant transit routes
      for (const sid of serviceIds) {
        const geom = routeGeometry[sid];
        if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;

        allCoords.push(...geom.coordinates);

        const roadPoints = await fetchRoadRoute(geom.coordinates);
        if (!isMounted) return;

        const forecast = routeForecasts ? routeForecasts[sid] : null;
        const demand = forecast ? forecast.expected_passengers : 1500;
        const isSelected = selectedService === "All Routes" || selectedService === sid;
        const weight = selectedService === sid ? 7 : 5;
        const opacity = isSelected ? 0.95 : 0.4;

        // 1. Glowing Halo underlay along the road
        L.polyline(roadPoints, {
          color: geom.color || "#38bdf8",
          weight: weight + 5,
          opacity: isSelected ? 0.35 : 0.1,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // 2. Continuous bold route corridor line
        const polyline = L.polyline(roadPoints, {
          color: geom.color || "#38bdf8",
          weight: weight,
          opacity: opacity,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        polyline.bindPopup(`
          <div class="p-2 font-sans">
            <h4 class="font-bold text-sky-400 text-sm">Bus Service ${sid} Corridor</h4>
            <div class="text-xs text-slate-300 mt-1 space-y-1">
              <div><strong>Forecasted Demand:</strong> ${demand.toLocaleString()} passengers</div>
              <div><strong>Status:</strong> ${forecast ? forecast.crowd_level : "Normal"} ${forecast ? forecast.crowd_icon : "🟢"}</div>
              <div><strong>Extra Fleet Required:</strong> ${forecast ? forecast.buses_required : 0} units</div>
            </div>
          </div>
        `);

        // If extra bus is required: Draw a prominent Dispatch Trajectory Line from nearest depot
        if (forecast && (forecast.buses_required > 0 || forecast.crowd_level === "High")) {
          const originCoord = roadPoints[0];
          const nearestDepotCoord: [number, number] =
            sid === "S45" || sid === "S52" || sid === "S57"
              ? [10.9904, 76.9608] // Ukkadam Depot
              : sid === "S33A"
              ? [10.9980, 76.9830] // Sungam Depot
              : sid === "S48"
              ? [10.9820, 76.9870] // Ondipudur Depot
              : [11.0065, 76.9780]; // Uppilipalayam Depot

          if (originCoord) {
            L.polyline([nearestDepotCoord, originCoord], {
              color: "#f59e0b",
              weight: 4,
              dashArray: "6, 8",
              opacity: 0.9,
              lineCap: "round",
            })
              .addTo(map)
              .bindTooltip(`⚡ Extra Fleet Dispatch Line (${sid})`, { sticky: true });
          }
        }
      }

      // Major Depot Hub Labels
      const depots = [
        { name: "Ukkadam Depot", lat: 10.9904, lon: 76.9608, color: "#f59e0b" },
        { name: "Ondipudur Depot", lat: 10.9820, lon: 76.9870, color: "#a855f7" },
        { name: "Sungam Depot", lat: 10.9980, lon: 76.9830, color: "#38bdf8" },
        { name: "Uppilipalayam Depot", lat: 11.0065, lon: 76.9780, color: "#10b981" },
        { name: "Marudhamalai Depot", lat: 11.0450, lon: 76.8520, color: "#ec4899" },
      ];

      depots.forEach((depot) => {
        allCoords.push([depot.lat, depot.lon]);
        const depotLabel = L.divIcon({
          className: "depot-map-label",
          html: `<div style="background-color: #191c22; color: #EDDECB; border: 1.5px solid ${depot.color}; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 0 10px rgba(0,0,0,0.5);">🏢 ${depot.name}</div>`,
          iconSize: [110, 24],
          iconAnchor: [55, 12],
        });

        L.marker([depot.lat, depot.lon], { icon: depotLabel }).addTo(map);
      });

      // Auto-fit bounds around the network
      if (allCoords.length > 1) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [35, 35] });
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
    <div
      style={{ height: height || "450px" }}
      className={`relative w-full overflow-hidden border border-[#6B8D8A]/30 shadow-md isolate z-10 ${
        className !== undefined ? className : "h-[450px] rounded-2xl"
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
