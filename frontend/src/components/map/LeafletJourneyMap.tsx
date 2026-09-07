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

function snapPointToRoad(pt: [number, number], roadLine: [number, number][]): [number, number] {
  if (!roadLine || roadLine.length === 0) return pt;
  let minDistSq = Infinity;
  let bestPt = pt;
  for (const lp of roadLine) {
    const dSq = (lp[0] - pt[0]) ** 2 + (lp[1] - pt[1]) ** 2;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      bestPt = lp;
    }
  }
  return bestPt;
}

const roadCache = new Map<string, [number, number][]>();

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

    import("leaflet").then(async (L) => {
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
        zoom: 13,
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
      
      // Look up geometry with flexible route ID prefixing and stop searching
      const candidateKeys = serviceId
        ? [serviceId, serviceId.toUpperCase(), `S${serviceId}`, serviceId.replace(/^S/i, "")]
        : Object.keys(routeGeometry);

      let matchingGeom = candidateKeys.map((k) => routeGeometry[k]).find(Boolean);
      if (!matchingGeom) {
        matchingGeom = Object.values(routeGeometry).find(
          (g) => g.stops.includes(fromStopId) && g.stops.includes(toStopId)
        );
      }

      let rawCoords: [number, number][] = [];
      let segmentStops: string[] = [];
      const lineColor = matchingGeom?.color || "#F3B763";

      if (matchingGeom) {
        const stops = matchingGeom.stops;
        const iFrom = stops.indexOf(fromStopId);
        const iTo = stops.indexOf(toStopId);

        if (iFrom !== -1 && iTo !== -1) {
          if (iFrom <= iTo) {
            segmentStops = stops.slice(iFrom, iTo + 1);
          } else {
            segmentStops = stops.slice(iTo, iFrom + 1).reverse();
          }
        } else {
          segmentStops = stops;
        }

        rawCoords = segmentStops
          .filter((s) => stopCoords[s])
          .map((s) => stopCoords[s]);
      }

      // Fallback: If rawCoords is empty or only 1 stop, connect fromCoord directly to toCoord
      if (rawCoords.length < 2 && fromCoord && toCoord) {
        rawCoords = [fromCoord, toCoord];
      }

      if (rawCoords.length >= 2) {
        allCoords.push(...rawCoords);

        // Synchronously draw baseline polyline so there is NEVER a visible gap
        const baselineHalo = L.polyline(rawCoords, {
          color: lineColor,
          weight: 10,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        const baselineCore = L.polyline(rawCoords, {
          color: lineColor,
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 1.0,
        }).addTo(map);

        const dotMarkers: any[] = [];

        // Render initial dots
        if (segmentStops.length > 2) {
          segmentStops.slice(1, -1).forEach((s, idx) => {
            const pt = stopCoords[s];
            if (pt) {
              const stopTitle = stopNames[s] || s;
              const marker = L.circleMarker(pt, {
                radius: 5,
                color: "#131518",
                fillColor: lineColor,
                fillOpacity: 1,
                weight: 2,
              })
                .addTo(map)
                .bindTooltip(`${idx + 2}. ${stopTitle}`, {
                  sticky: true,
                  direction: "top",
                })
                .bindPopup(
                  `<div class="p-1.5 font-sans"><span class="text-[#F3B763] font-black text-[11px] uppercase tracking-wider">🚏 Bus Stop #${idx + 2}</span><br/><strong class="text-sm text-[#1f2329]">${stopTitle}</strong></div>`
                );
              dotMarkers.push({ marker, originalPt: pt });
            }
          });
        }

        // Fetch high-precision OSRM asphalt street routing and snap all dots onto the road line
        fetchRoadRoute(rawCoords).then((roadPoints) => {
          if (!isMounted || roadPoints.length < 2) return;
          map.removeLayer(baselineHalo);
          map.removeLayer(baselineCore);

          L.polyline(roadPoints, {
            color: lineColor,
            weight: 10,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);

          L.polyline(roadPoints, {
            color: lineColor,
            weight: 5,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
            smoothFactor: 1.0,
          })
            .addTo(map)
            .bindTooltip(`Bus Service Route Corridor`, { sticky: true });

          // Snap each dot marker directly onto the road polyline
          dotMarkers.forEach(({ marker, originalPt }) => {
            const snappedPt = snapPointToRoad(originalPt, roadPoints);
            marker.setLatLng(snappedPt);
          });
        });
      }

      const fromName = stopNames[fromStopId] || fromStopId;
      const toName = stopNames[toStopId] || toStopId;

      // Boarding Point (Origin Marker with full stop name)
      if (fromCoord) {
        allCoords.push(fromCoord);
        const startIcon = L.divIcon({
          className: "custom-map-icon",
          html: `<div style="background: #96BCBB; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #131518; box-shadow: 0 0 16px rgba(150,188,187,0.95); display:flex; align-items:center; justify-content:center; color:#131518; font-size:13px; font-weight:900;">📍</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        L.marker(fromCoord, { icon: startIcon })
          .addTo(map)
          .bindTooltip(`Boarding: ${fromName}`, { sticky: true, direction: "top" })
          .bindPopup(
            `<div class="p-1.5 font-sans"><span class="text-[#2b7a78] font-black text-[11px] uppercase tracking-wider">🟢 Boarding Stop (FROM)</span><br/><strong class="text-sm text-[#1f2329]">${fromName}</strong></div>`
          );
      }

      // Alighting Point (Destination Marker with full stop name)
      if (toCoord) {
        allCoords.push(toCoord);
        const endIcon = L.divIcon({
          className: "custom-map-icon",
          html: `<div style="background: #AF4B47; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(175,75,71,0.95); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:13px; font-weight:900;">🏁</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        L.marker(toCoord, { icon: endIcon })
          .addTo(map)
          .bindTooltip(`Destination: ${toName}`, { sticky: true, direction: "top" })
          .bindPopup(
            `<div class="p-1.5 font-sans"><span class="text-[#AF4B47] font-black text-[11px] uppercase tracking-wider">🔴 Destination Stop (TO)</span><br/><strong class="text-sm text-[#1f2329]">${toName}</strong></div>`
          );
      }

      // Auto-fit bounds tightly with bounded zoom
      if (allCoords.length > 1) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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

  return (
    <div
      style={{ height }}
      className="relative w-full rounded-2xl overflow-hidden border border-[#6B8D8A]/30 shadow-md isolate z-10"
    >
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
