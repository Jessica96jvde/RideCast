import { AuthorityRouteForecast, TripSlotForecast } from "./types";

/**
 * Standardized 6 Commuter Time Slots for Transport Authority Operations
 * Each window defines strict start and end minute boundaries [startMinutes, endMinutes).
 */
export interface TimeSlotConfig {
  id: string;
  window: string;
  title: string;
  startMinutes: number; // e.g. 06:00 = 360
  endMinutes: number;   // e.g. 08:00 = 480 (exclusive, i.e. 06:00 to 07:59)
  defaultTimes: string[];
  peakIndex: number;
}

export const AUTHORITY_TIME_SLOTS: TimeSlotConfig[] = [
  {
    id: "slot_1",
    window: "06:00–08:00",
    title: "Early Morning",
    startMinutes: 6 * 60,       // 360 (06:00)
    endMinutes: 8 * 60,         // 480 (up to 07:59)
    defaultTimes: ["06:10", "06:25", "06:45", "07:10", "07:30", "07:50"],
    peakIndex: 1, // 06:25
  },
  {
    id: "slot_2",
    window: "08:00–10:00",
    title: "Morning Peak",
    startMinutes: 8 * 60,       // 480 (08:00)
    endMinutes: 10 * 60,        // 600 (up to 09:59)
    defaultTimes: ["08:10", "08:25", "08:45", "09:10", "09:25", "09:50"],
    peakIndex: 1, // 08:25
  },
  {
    id: "slot_3",
    window: "10:00–12:00",
    title: "Late Morning",
    startMinutes: 10 * 60,      // 600 (10:00)
    endMinutes: 12 * 60,        // 720 (up to 11:59)
    defaultTimes: ["10:10", "10:25", "10:45", "11:10", "11:25", "11:50"],
    peakIndex: 1, // 10:25
  },
  {
    id: "slot_4",
    window: "12:00–14:00",
    title: "Midday",
    startMinutes: 12 * 60,      // 720 (12:00)
    endMinutes: 14 * 60,        // 840 (up to 13:59)
    defaultTimes: ["12:10", "12:25", "12:45", "13:10", "13:25", "13:50"],
    peakIndex: 1, // 12:25
  },
  {
    id: "slot_5",
    window: "14:00–17:00",
    title: "Afternoon",
    startMinutes: 14 * 60,      // 840 (14:00)
    endMinutes: 17 * 60,        // 1020 (up to 16:59)
    defaultTimes: ["14:15", "14:25", "14:45", "15:15", "15:45", "16:45"],
    peakIndex: 1, // 14:25
  },
  {
    id: "slot_6",
    window: "17:00–20:00",
    title: "Evening Peak",
    startMinutes: 17 * 60,      // 1020 (17:00)
    endMinutes: 20 * 60,        // 1200 (up to 19:59)
    defaultTimes: ["17:10", "17:35", "18:00", "18:30", "19:00", "19:30"],
    peakIndex: 0, // 17:10
  },
];

export interface SlotDeparture {
  time: string;
  passengers: number;
  capacity: number;
  excessPax: number;
  isPeak: boolean;
  occupancyPct: number;
}

export interface AnalyzedTimeSlot {
  slotId: string;
  window: string;
  title: string;
  totalDepartures: number;
  totalCapacity: number;
  totalPassengers: number;
  netExcess: number;
  departures: SlotDeparture[];
  peakDeparture: SlotDeparture;
  peakExcess: number;
  requiresAttention: boolean;
  overcrowdedCount: number;
  undercrowdedCount: number;
  withinCapacityCount: number;
  suggestedAction: string | null;
  suggestedReason: string | null;
}

export interface AnalyzedRouteSummary {
  serviceId: string;
  routeName: string;
  originName: string;
  destName: string;
  timeSlots: AnalyzedTimeSlot[];
  attentionSlots: AnalyzedTimeSlot[];
  requiresAttention: boolean;
  peakSlot: AnalyzedTimeSlot;
}

const DEFAULT_BUS_CAPACITY = 70;

// Intraday ratios for the 6 departures within each slot window
const DEPARTURE_RATIOS = [0.62, 1.0, 0.58, 0.61, 0.54, 0.48];

/**
 * Parses time string (e.g. "08:25", "17:10") into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (clean.toLowerCase().includes("pm") && h < 12) h += 12;
  if (clean.toLowerCase().includes("am") && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Checks if a given departure time falls strictly within a slot's minute window [startMin, endMin).
 */
export function isTimeInSlotWindow(timeStr: string, startMin: number, endMin: number): boolean {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === -1) return false;
  return mins >= startMin && mins < endMin;
}

/**
 * Analyzes a route across all 6 fixed time slots.
 * Evaluates combined capacity across all departures within each time slot window.
 * 
 * CAPACITY & OVERCROWDING RULE:
 * For a time slot with N scheduled departures (e.g. 6 buses * 70 = 420 capacity),
 * demand across all departures is tallied. A spike in one departure (e.g. 95 pax)
 * is absorbed/cushioned by under-capacity departures in the same window.
 * The time slot requires attention / extra bus allocation ONLY IF total passengers
 * across the window exceeds the total combined capacity (totalPassengers > totalCapacity).
 */
export function analyzeRouteTimeSlots(
  serviceId: string,
  routeForecast: AuthorityRouteForecast
): AnalyzedRouteSummary {
  const cleanRouteName = routeForecast.route_name
    .replace(/^[A-Za-z0-9\s]+:\s*/, "")
    .replace(/^Service\s+[A-Za-z0-9]+\s*:\s*/i, "")
    .trim();

  const tripSlots = routeForecast.trip_slots || [];

  const analyzedSlots: AnalyzedTimeSlot[] = AUTHORITY_TIME_SLOTS.map((config) => {
    // 1. Strictly find all trip slot forecasts from backend whose time falls inside this slot's window
    const matchingTripsInWindow = tripSlots.filter(
      (t) => t.time && isTimeInSlotWindow(t.time, config.startMinutes, config.endMinutes)
    );

    let peakPaxBase: number;
    let customPeakTime: string | null = null;

    if (matchingTripsInWindow.length > 0) {
      // Find the departure with the highest expected passengers strictly within this window
      const busiestTrip = matchingTripsInWindow.reduce(
        (max, t) => (t.passengers > max.passengers ? t : max),
        matchingTripsInWindow[0]
      );
      peakPaxBase = busiestTrip.passengers;
      customPeakTime = busiestTrip.time;
    } else {
      // Direct slot_id match check with strict window validation
      const directIdMatch = tripSlots.find((t) => t.slot_id === config.id);
      if (directIdMatch && directIdMatch.time && isTimeInSlotWindow(directIdMatch.time, config.startMinutes, config.endMinutes)) {
        peakPaxBase = directIdMatch.passengers;
        customPeakTime = directIdMatch.time;
      } else if (directIdMatch) {
        peakPaxBase = directIdMatch.passengers;
        customPeakTime = null; // Do NOT inherit time if outside window
      } else {
        peakPaxBase = Math.round(routeForecast.normal_passengers / 30);
        customPeakTime = null;
      }
    }

    // Determine verified peak time strictly inside the slot window
    const validPeakTime = (customPeakTime && isTimeInSlotWindow(customPeakTime, config.startMinutes, config.endMinutes))
      ? customPeakTime
      : config.defaultTimes[config.peakIndex];

    // Generate the 6 scheduled departures strictly within this slot window
    const departures: SlotDeparture[] = config.defaultTimes.map((defaultTime, depIdx) => {
      const isPeak = depIdx === config.peakIndex;
      const rawTime = isPeak ? validPeakTime : defaultTime;
      
      // Strict fallback to guarantee time is within window
      const finalTime = isTimeInSlotWindow(rawTime, config.startMinutes, config.endMinutes)
        ? rawTime
        : config.defaultTimes[depIdx];

      let pax = isPeak
        ? peakPaxBase
        : Math.max(25, Math.round(peakPaxBase * (DEPARTURE_RATIOS[depIdx] || 0.6)));

      // Ensure peak departure is strictly the highest in this window
      if (!isPeak && pax >= peakPaxBase) {
        pax = Math.max(25, peakPaxBase - 15);
      }

      const capacity = DEFAULT_BUS_CAPACITY;
      const excessPax = Math.max(0, pax - capacity);
      const occupancyPct = Math.round((pax / capacity) * 100);

      return {
        time: finalTime,
        passengers: pax,
        capacity,
        excessPax,
        isPeak,
        occupancyPct,
      };
    });

    // 2. Compute Total Slot Capacity & Total Passenger Demand
    const totalCapacity = departures.length * DEFAULT_BUS_CAPACITY; // e.g. 6 * 70 = 420
    const totalPassengers = departures.reduce((sum, d) => sum + d.passengers, 0);
    const netExcess = Math.max(0, totalPassengers - totalCapacity);

    // ONLY require attention / deploy extra bus if total passengers exceed total combined capacity
    const requiresAttention = totalPassengers > totalCapacity;

    // Find the departure with highest expected passengers strictly within this slot
    const peakDeparture = departures.reduce(
      (max, d) => (d.passengers > max.passengers ? d : max),
      departures[0]
    );
    
    // Net excess across the whole time slot window
    const peakExcess = netExcess;

    const overcrowdedCount = departures.filter((d) => d.passengers > DEFAULT_BUS_CAPACITY || d.passengers >= 80).length;
    const undercrowdedCount = departures.filter((d) => d.passengers < 36).length;
    const withinCapacityCount = departures.filter(
      (d) => d.passengers >= 36 && d.passengers <= DEFAULT_BUS_CAPACITY && d.passengers < 80
    ).length;

    const suggestedAction = requiresAttention
      ? `Deploy 1 standby bus for the ${peakDeparture.time} departure`
      : null;

    const suggestedReason = requiresAttention
      ? `Total passenger demand (${totalPassengers} pax) exceeds the combined scheduled capacity (${totalCapacity} pax) across ${departures.length} departures in the ${config.window} window.`
      : null;

    return {
      slotId: config.id,
      window: config.window,
      title: config.title,
      totalDepartures: departures.length,
      totalCapacity,
      totalPassengers,
      netExcess,
      departures,
      peakDeparture,
      peakExcess,
      requiresAttention,
      overcrowdedCount,
      undercrowdedCount,
      withinCapacityCount,
      suggestedAction,
      suggestedReason,
    };
  });

  const attentionSlots = analyzedSlots.filter((s) => s.requiresAttention);
  const requiresAttention = attentionSlots.length > 0;

  // Pick the peak slot with highest net excess or highest demand across the day
  const peakSlot = [...analyzedSlots].sort(
    (a, b) => b.netExcess - a.netExcess || b.totalPassengers - a.totalPassengers
  )[0];

  return {
    serviceId,
    routeName: cleanRouteName,
    originName: routeForecast.origin_name || "Origin Terminal",
    destName: routeForecast.dest_name || "Destination Terminal",
    timeSlots: analyzedSlots,
    attentionSlots,
    requiresAttention,
    peakSlot,
  };
}
