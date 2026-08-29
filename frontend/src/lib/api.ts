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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

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

export const api = {
  // Metadata
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

  // Passenger Predictions
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

  // Feedback
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

  // Auth
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

  // Authority Operations
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

  getAllocations: (date?: string) =>
    fetchJSON<AllocationRecord[]>(
      date ? `/api/authority/allocations?date=${date}` : `/api/authority/allocations`
    ),

  getExportPdfUrl: (date: string, serviceId: string = "All Routes") =>
    `${API_BASE_URL}/api/authority/export-pdf?date=${date}&service_id=${encodeURIComponent(
      serviceId
    )}`,
};
