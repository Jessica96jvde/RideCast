/**
 * RideCast - Global TypeScript Data Models & Interfaces
 * =====================================================
 * This file defines all TypeScript contracts used across the frontend.
 * Having explicit types prevents bugs and ensures that data returned from the
 * FastAPI backend matches the props and state expected by React components.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. Interfaces:
 *    - Blueprint describing the exact shape/properties of an object.
 *    - Example: `Stop` guarantees every bus stop has `stop_id`, `stop_name`, `lat`, and `lon`.
 * 
 * 2. Optional Fields (`?:`):
 *    - Properties that may or may not be present in a response.
 *    - Example: `corridor?: string` means corridor is optional.
 * 
 * 3. Union Types:
 *    - Restricts values to specific literal strings.
 *    - Example: `"Low" | "Moderate" | "High"` prevents invalid crowd status strings.
 */

// -----------------------------------------------------------------------------
// 1. Transit Network Metadata
// -----------------------------------------------------------------------------

/** Represents a single physical bus stop located in Coimbatore */
export interface Stop {
  stop_id: string;      // Unique stop identifier (e.g. "ST001")
  stop_name: string;    // Human-readable name (e.g. "Gandhipuram Town Stand")
  lat: number;          // Latitude coordinate
  lon: number;          // Longitude coordinate
  corridor?: string;    // Transit corridor area description
}

/** Represents a transit service / bus route line */
export interface RouteMeta {
  service_id: string;               // Route ID (e.g. "S45", "S33A")
  service_name: string;             // Route number (e.g. "45", "33A")
  start_stop_id: string;            // Origin stop ID
  end_stop_id: string;              // Destination stop ID
  route_name: string;               // Display title (e.g. "45: Ukkadam ↔ Vellamadai")
  origin_name: string;              // Origin terminal name
  dest_name: string;                // Destination terminal name
  base_daily_normal: number;        // Normal scheduled passenger capacity
  total_distance_km?: number;       // Route distance in kilometers
  estimated_journey_time_min?: number; // Approximate travel time in minutes
  total_stops?: number;             // Count of stops on this line
  color: string;                    // Brand hex color (e.g. "#BF5B04")
}

// -----------------------------------------------------------------------------
// 2. Machine Learning Predictions & Commuter Forecasts
// -----------------------------------------------------------------------------

/** Single-trip passenger crowd prediction returned by /api/predict/demand */
export interface DemandPrediction {
  service_id: string;
  from_stop_id: string;
  to_stop_id: string;
  date: string;
  time_slot: string;
  inbound: number;                  // Forecasted inbound passenger count
  outbound: number;                 // Forecasted outbound passenger count
  inbound_crowd: string;            // Formatted status with emoji (e.g. "Moderate 🟡")
  outbound_crowd: string;           // Formatted status with emoji (e.g. "High 🔴")
  inbound_level: "Low" | "Moderate" | "High";
  outbound_level: "Low" | "Moderate" | "High";
  inbound_color: string;            // Hex color code (Green/Yellow/Red)
  outbound_color: string;           // Hex color code (Green/Yellow/Red)
  inbound_pct: number;              // Occupancy fraction (e.g. 0.84 = 84% capacity)
  outbound_pct: number;
  capacity: number;                 // Bus seating capacity (standard 50)
  confidence_score?: number;        // Neural network accuracy score (e.g. 94.6%)
  confidence_text?: string;
  reason?: string;                  // Explainable AI reason text
  is_allocated?: boolean;           // True if an extra bus has been dispatched
  allocated_bus_info?: {
    bus_id: string;
    bus_number: string;
    source_depot: string;
    distance_km?: number;
    reason: string;
    allocated_by: string;
    timestamp: string;
  } | null;
  available_services?: string[];    // Other direct bus lines connecting the stops
  error?: string;
}

/** Individual time-slot crowd forecast in the 6-slot daily heatmap */
export interface SlotPrediction {
  slot_label: string;               // Display title (e.g. "08:00 – 10:00")
  time: string;                     // Departure time (e.g. "08:25")
  slot_color: string;
  inbound: number;
  outbound: number;
  inbound_crowd: string;
  outbound_crowd: string;
  inbound_pct: number;
  outbound_pct: number;
  crowd_level: "Low" | "Moderate" | "High" | "Overcrowded";
  crowd_color: string;
}

/** Multi-slot journey response returned by /api/predict/all-slots */
export interface BatchSlotsResponse {
  service_id: string;
  available_services: string[];
  date: string;
  from_stop_id: string;
  to_stop_id: string;
  slots: SlotPrediction[];
}

// -----------------------------------------------------------------------------
// 3. Transport Authority Executive & Operational Models
// -----------------------------------------------------------------------------

/** Aggregated network Key Performance Indicators */
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

/** Shift-by-shift occupancy prediction for a route */
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

/** Route-level authority intelligence forecast */
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

/** Complete authority overview payload */
export interface AuthorityOverview {
  date: string;
  kpis: AuthorityKPIs;
  routes: Record<string, AuthorityRouteForecast>;
}

// -----------------------------------------------------------------------------
// 4. Fleet Management & Bus Allocation Models
// -----------------------------------------------------------------------------

/** Candidate idle bus recommended by proximity algorithm */
export interface BusRecommendation {
  bus_id: string;                   // Bus registration code (e.g. "BUS-205")
  bus_number: string;               // License plate number (e.g. "TN-38-N-2450")
  depot_name: string;               // Home depot location (e.g. "Ukkadam Depot")
  capacity: number;                 // Seating capacity
  fuel_type: string;                // Diesel, Electric, CNG
  current_lat: number;
  current_lon: number;
  distance_km: number;              // Distance from depot to route start point
  suitable: boolean;                // Meets capacity requirements
  route_start_name: string;         // Name of terminus to dispatch to
  is_recommended: boolean;          // True for the optimal top recommendation
}

/** Fleet inventory item */
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

/** Historical bus dispatch audit record stored in SQLite */
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

// -----------------------------------------------------------------------------
// 5. Leaflet Geospatial Map Data
// -----------------------------------------------------------------------------

/** Geospatial coordinates and route geometries for Leaflet OpenStreetMap */
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
