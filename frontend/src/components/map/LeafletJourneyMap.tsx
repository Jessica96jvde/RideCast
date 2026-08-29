"use client";

import React, { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface LeafletJourneyMapProps {
  fromStopId: string;
  toStopId: string;
  serviceId?: string;
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
  height?: string;
}

export default function LeafletJourneyMap({
  fromStopId,
  toStopId,
  serviceId,
  stopCoords,
  stopNames,
  routeGeometry,
  height = "320px",
}: LeafletJourneyMapProps) {
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

      const defaultCenter: [number, number] = [11.0168, 76.9558];
      const fromCoord = stopCoords[fromStopId];
      const toCoord = stopCoords[toStopId];

      const initialCenter =
        fromCoord && toCoord
          ? ([(fromCoord[0] + toCoord[0]) / 2, (fromCoord[1] + toCoord[1]) / 2] as [
              number,
              number
            ])
          : defaultCenter;

      // Create map with full zoom freedom
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        minZoom: 8,
        maxZoom: 19,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap high-definition free tiles without watermark
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | RideCast AI',
          maxZoom: 19,
          minZoom: 8,
        }
      ).addTo(map);

      const allCoords: [number, number][] = [];
      const relevantServices = serviceId
        ? [serviceId]
        : Object.keys(routeGeometry);

      relevantServices.forEach((sid) => {
        const geom = routeGeometry[sid];
        if (!geom) return;

        const stops = geom.stops;
        const iFrom = stops.indexOf(fromStopId);
        const iTo = stops.indexOf(toStopId);

        let segmentStops = stops;
        if (iFrom !== -1 && iTo !== -1) {
          if (iFrom <= iTo) {
            segmentStops = stops.slice(iFrom, iTo + 1);
          } else {
            segmentStops = stops.slice(iTo, iFrom + 1).reverse();
          }
        }

        const coords: [number, number][] = segmentStops
          .filter((s) => stopCoords[s])
          .map((s) => stopCoords[s]);

        if (coords.length >= 2) {
          allCoords.push(...coords);

          // Clear bold polyline with vivid transit color following road curves
          L.polyline(coords, {
            color: geom.color || "#F3B763",
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
            smoothFactor: 1.0,
          })
            .addTo(map)
            .bindTooltip(`Service ${sid} Corridor`, { sticky: true });

          // Intermediate stop dots with rich hover tooltips and popups showing exact names
          segmentStops.slice(1, -1).forEach((s) => {
            const pt = stopCoords[s];
            if (pt) {
              const stopTitle = stopNames[s] || s;
              L.circleMarker(pt, {
                radius: 4.5,
                color: "#131518",
                fillColor: "#F3B763",
                fillOpacity: 1,
                weight: 2,
              })
                .addTo(map)
                .bindTooltip(stopTitle, {
                  sticky: true,
                  direction: "top",
                })
                .bindPopup(
                  `<div class="p-1 font-sans"><span class="text-[#F3B763] font-bold text-xs">🚏 Bus Stop</span><br/><strong class="text-sm text-[#27456c]">${stopTitle}</strong></div>`
                );
            }
          });
        }
      });

      const fromName = stopNames[fromStopId] || fromStopId;
      const toName = stopNames[toStopId] || toStopId;

      // Boarding Point (Origin Marker with full stop name)
      if (fromCoord) {
        allCoords.push(fromCoord);
        const startIcon = L.divIcon({
          className: "custom-map-icon",
          html: `<div style="background: #96BCBB; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #131518; box-shadow: 0 0 14px rgba(150,188,187,0.9); display:flex; align-items:center; justify-content:center; color:#131518; font-size:12px; font-weight:900;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker(fromCoord, { icon: startIcon })
          .addTo(map)
          .bindTooltip(`Boarding: ${fromName}`, { sticky: true, direction: "top" })
          .bindPopup(
            `<div class="p-1 font-sans"><span class="text-[#96BCBB] font-extrabold text-xs">🟢 Boarding Stop (FROM)</span><br/><strong class="text-sm text-[#27456c]">${fromName}</strong></div>`
          );
      }

      // Alighting Point (Destination Marker with full stop name)
      if (toCoord) {
        allCoords.push(toCoord);
        const endIcon = L.divIcon({
          className: "custom-map-icon",
          html: `<div style="background: #AF4B47; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 14px rgba(175,75,71,0.9); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:12px; font-weight:900;">🏁</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker(toCoord, { icon: endIcon })
          .addTo(map)
          .bindTooltip(`Destination: ${toName}`, { sticky: true, direction: "top" })
          .bindPopup(
            `<div class="p-1 font-sans"><span class="text-[#AF4B47] font-extrabold text-xs">🔴 Destination Stop (TO)</span><br/><strong class="text-sm text-[#27456c]">${toName}</strong></div>`
          );
      }

      // Auto-fit bounds tightly with bounded zoom
      if (allCoords.length > 1) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [fromStopId, toStopId, serviceId, stopCoords, stopNames, routeGeometry]);

  const fromName = stopNames[fromStopId] || fromStopId || "Origin";
  const toName = stopNames[toStopId] || toStopId || "Destination";

  return (
    <div
      style={{ height }}
      className="relative w-full rounded-2xl overflow-hidden border border-[#6B8D8A]/30 shadow-md isolate z-10"
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 z-20 bg-[#1f2329]/95 backdrop-blur-md border border-[#6B8D8A]/40 px-3.5 py-2 rounded-2xl text-[11px] font-bold flex flex-wrap items-center gap-3 text-[#EDDECB] shadow-xl max-w-[90%]">
        <span className="flex items-center gap-1.5 truncate max-w-[130px]" title={fromName}>
          <span className="w-2.5 h-2.5 rounded-full bg-[#96BCBB] shrink-0"></span>
          <span className="truncate">{fromName}</span>
        </span>
        <span className="text-[#B5C3C4]">→</span>
        <span className="flex items-center gap-1.5 truncate max-w-[130px]" title={toName}>
          <span className="w-2.5 h-2.5 rounded-full bg-[#AF4B47] shrink-0"></span>
          <span className="truncate">{toName}</span>
        </span>
        <span className="border-l border-[#6B8D8A]/40 pl-2.5 flex items-center gap-1.5 text-[#F3B763]">
          <span className="w-2 h-2 rounded-full bg-[#F3B763] shrink-0"></span>
          <span>Intermediate Stops</span>
        </span>
      </div>
    </div>
  );
}
