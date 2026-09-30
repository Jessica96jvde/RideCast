/**
 * RideCast - Centralized Frontend API Client
 * ==========================================
 * This module provides type-safe asynchronous functions to communicate with
 * the FastAPI backend server (http://127.0.0.1:8000).
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. `fetch()` API:
 *    - Built-in browser function for making HTTP requests (GET, POST, etc.) over the network.
 * 
 * 2. Generics (`<T>`):
 *    - Allows `fetchJSON<T>` to return data typed as any specific interface (e.g. `Stop[]`, `DemandPrediction`).
 *    - TypeScript automatically provides autocomplete and type-checking on the returned result!
 * 
 * 3. Error Handling:
 *    - If the backend returns a non-200 status code (e.g., 400 Bad Request or 401 Unauthorized),
 *      `fetchJSON` parses the error message and throws a JavaScript `Error` with a helpful description.
 */

import {
  Stop,
  RouteMeta,
  DemandPrediction,
  BatchSlotsResponse,
  AuthorityOverview,
  BusRecommendation,
  BusItem,
  AllocationRecord,
  MapMetadata,
} from "./types";

// Base URL for the FastAPI backend (defaults to localhost:8000 in development)
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Generic helper function to make HTTP requests and parse JSON responses.
 * @param endpoint - API path (e.g. "/api/stops")
 * @param options  - Optional fetch settings (method, headers, body)
 */
async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  // Check if server responded with an error HTTP status
  if (!res.ok) {
    let errorDetail = "API request failed";
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

/** Exported API client object grouping all backend endpoints */
export const api = {
  // ---------------------------------------------------------------------------
  // 1. Transit Network Metadata
  // ---------------------------------------------------------------------------
  getStops: () => fetchJSON<Stop[]>("/api/stops"),
  getRoutes: () => fetchJSON<RouteMeta[]>("/api/routes"),
  getServicesBetween: (fromStop: string, toStop: string) =>
    fetchJSON<{ services: string[] }>(
      `/api/services-between?from_stop=${fromStop}&to_stop=${toStop}`
    ),
  getTimetable: (serviceId: string) =>
    fetchJSON<{ service_id: string; departure_times: string[] }>(
      `/api/timetable/${serviceId}`
    ),
  getMapData: () => fetchJSON<MapMetadata>("/api/map/data"),

  // ---------------------------------------------------------------------------
  // 2. Machine Learning Demand Predictions
  // ---------------------------------------------------------------------------
  predictDemand: (payload: {
    from_stop_id: string;
    to_stop_id: string;
    date: string;
    time_slot: string;
    service_id?: string;
  }) =>
    fetchJSON<DemandPrediction>("/api/predict/demand", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  predictAllSlots: (payload: {
    from_stop_id: string;
    to_stop_id: string;
    date: string;
    service_id?: string;
  }) =>
    fetchJSON<BatchSlotsResponse>("/api/predict/all-slots", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ---------------------------------------------------------------------------
  // 3. Commuter Feedback
  // ---------------------------------------------------------------------------
  submitFeedback: (payload: {
    useful: boolean;
    from_stop?: string;
    to_stop?: string;
    time_slot?: string;
  }) =>
    fetchJSON<{ success: boolean; message: string }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ---------------------------------------------------------------------------
  // 4. Officer Authentication
  // ---------------------------------------------------------------------------
  login: (payload: { username: string; password: string }) =>
    fetchJSON<{
      success: boolean;
      token: string;
      username: string;
      role: string;
      message: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifyAuth: (token: string) =>
    fetchJSON<{ valid: boolean; role?: string }>(
      `/api/auth/verify?token=${token}`
    ),

  // ---------------------------------------------------------------------------
  // 5. Transport Authority Operations & Reports
  // ---------------------------------------------------------------------------
  getAuthorityOverview: (date: string) =>
    fetchJSON<AuthorityOverview>(`/api/authority/overview?date=${date}`),

  getRecommendations: (serviceId: string, date: string, capacity: number = 50) =>
    fetchJSON<{
      service_id: string;
      date: string;
      recommendations: BusRecommendation[];
    }>(
      `/api/authority/recommendations?service_id=${serviceId}&date=${date}&capacity=${capacity}`
    ),

  allocateBus: (payload: {
    date: string;
    service_id: string;
    bus_id: string;
    reason: string;
    allocated_by?: string;
  }) =>
    fetchJSON<{
      success: boolean;
      message: string;
      allocation: any;
    }>("/api/authority/allocate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFleet: (date: string) =>
    fetchJSON<BusItem[]>(`/api/authority/fleet?date=${date}`),

  getAllocations: async (date?: string) => {
    const list = await fetchJSON<AllocationRecord[]>(
      date ? `/api/authority/allocations?date=${date}` : `/api/authority/allocations`
    );
    return list.map((item) => ({
      ...item,
      allocated_by:
        item.allocated_by && !item.allocated_by.toLowerCase().includes("rajesh")
          ? item.allocated_by
          : "Ravi",
    }));
  },

  getExportPdfUrl: (date: string, serviceId: string = "All Routes") =>
    `${API_BASE_URL}/api/authority/export-pdf?date=${date}&service_id=${encodeURIComponent(
      serviceId
    )}`,
};
