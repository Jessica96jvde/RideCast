export interface Stop {
  stop_id: string;
  stop_name: string;
  lat: number;
  lon: number;
  corridor?: string;
}

export interface RouteMeta {
  service_id: string;
  service_name: string;
  start_stop_id: string;
  end_stop_id: string;
  route_name: string;
  origin_name: string;
  dest_name: string;
  base_daily_normal: number;
  total_distance_km?: number;
  estimated_journey_time_min?: number;
  total_stops?: number;
  color: string;
}

export interface DemandPrediction {
  service_id: string;
  from_stop_id: string;
  to_stop_id: string;
  date: string;
  time_slot: string;
  inbound: number;
  outbound: number;
  inbound_crowd: string;
  outbound_crowd: string;
  inbound_level: "Low" | "Moderate" | "High";
  outbound_level: "Low" | "Moderate" | "High";
  inbound_color: string;
  outbound_color: string;
  inbound_pct: number;
  outbound_pct: number;
  capacity: number;
  confidence_score?: number;
  confidence_text?: string;
  reason?: string;
  is_allocated?: boolean;
  allocated_bus_info?: {
    bus_id: string;
    bus_number: string;
    source_depot: string;
    distance_km?: number;
    reason: string;
    allocated_by: string;
    timestamp: string;
  } | null;
  available_services?: string[];
  error?: string;
}

export interface SlotPrediction {
  slot_label: string;
  time: string;
  slot_color: string;
  inbound: number;
  outbound: number;
  inbound_crowd: string;
  outbound_crowd: string;
  inbound_pct: number;
  outbound_pct: number;
  crowd_level: "Low" | "Moderate" | "High";
  crowd_color: string;
}

export interface BatchSlotsResponse {
  service_id: string;
  available_services: string[];
  date: string;
  from_stop_id: string;
  to_stop_id: string;
  slots: SlotPrediction[];
}

export interface AuthorityKPIs {
  total_expected_passengers: number;
  total_normal_capacity: number;
  crowd_ratio_pct: number;
  total_extra_buses_required: number;
  model_confidence_score: number;
  fleet_total: number;
  fleet_idle: number;
  fleet_allocated: number;
}

export interface TripSlotForecast {
  slot_id: string;
  time: string;
  label: string;
  title: string;
  passengers: number;
  capacity: number;
  occupancy_pct: number;
  crowd_level: "Low" | "Moderate" | "High";
  crowd_icon: string;
  crowd_color: string;
  needs_extra_bus: boolean;
}

export interface AuthorityRouteForecast {
  service_id: string;
  route_name: string;
  origin: string;
  dest: string;
  origin_name: string;
  dest_name: string;
  target_date: string;
  normal_passengers: number;
  expected_passengers: number;
  crowd_level: "Low" | "Moderate" | "High";
  crowd_icon: string;
  crowd_color: string;
  buses_required: number;
  confidence_score: number;
  last_allocated_bus: string;
  reasons: string[];
  trip_slots?: TripSlotForecast[];
}

export interface AuthorityOverview {
  date: string;
  kpis: AuthorityKPIs;
  routes: Record<string, AuthorityRouteForecast>;
}

export interface BusRecommendation {
  bus_id: string;
  bus_number: string;
  depot_name: string;
  capacity: number;
  fuel_type: string;
  current_lat: number;
  current_lon: number;
  distance_km: number;
  suitable: boolean;
  route_start_name: string;
  is_recommended: boolean;
}

export interface BusItem {
  bus_id: string;
  bus_number: string;
  depot_name: string;
  current_lat: number;
  current_lon: number;
  capacity: number;
  fuel_type: string;
  status: "Idle" | "Allocated";
  available_date: string;
}

export interface AllocationRecord {
  id: number;
  date: string;
  service_id: string;
  route_name: string;
  bus_id: string;
  bus_number: string;
  source_depot: string;
  distance_km: number;
  reason: string;
  allocated_by: string;
  timestamp: string;
}

export interface MapMetadata {
  stop_coords: Record<string, [number, number]>;
  stop_names: Record<string, string>;
  service_colors: Record<string, string>;
  route_geometry: Record<
    string,
    {
      service_id: string;
      color: string;
      stops: string[];
      coordinates: [number, number][];
    }
  >;
  route_start_coords: Record<string, [number, number, string]>;
  center: [number, number];
}
