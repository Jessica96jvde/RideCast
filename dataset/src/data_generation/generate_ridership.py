import csv
import random
from pathlib import Path
from datetime import datetime, date, timedelta
from collections import defaultdict


# ==================================================
# PROJECT PATHS
# ==================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ROUTE_STOPS_FILE = PROJECT_ROOT / "dataset" / "data" / "route_stops.csv"
TIMETABLE_FILE = PROJECT_ROOT / "dataset" / "data" / "route_timetable.csv"
SERVICE_FREQUENCY_FILE = PROJECT_ROOT / "dataset" / "data" / "service_frequency.csv"
HOLIDAY_FILE = PROJECT_ROOT / "dataset" / "data" / "holiday_master.csv"
WEATHER_FILE = PROJECT_ROOT / "dataset" / "data" / "weather_history.csv"

OUTPUT_FILE = PROJECT_ROOT / "dataset" / "data" / "historical_ridership.csv"


# ==================================================
# DATE RANGE - 1 YEAR
# ==================================================

START_DATE = date(2024, 1, 1)
END_DATE = date(2024, 12, 31)


# ==================================================
# SELECTED TIME SLOTS - 6 PER SERVICE
#
# Each service uses representative departure times:
#   1. Early Morning (06:00 - 06:45)
#   2. Morning Peak Rush (08:00 - 08:45)
#   3. Late Morning (10:00 - 10:25)
#   4. Midday (12:15 - 13:25)
#   5. Evening Peak Shift 1 (16:15 - 17:10)
#   6. Evening Peak Shift 2 (18:00 - 18:25)
# All times exist in route_timetable.csv
# ==================================================

SELECTED_TIMES = {
    "S45":  ["06:25", "08:25", "10:25", "13:25", "17:10", "18:25"],
    "S57":  ["06:25", "08:25", "10:25", "12:25", "16:25", "18:25"],
    "S33A": ["06:00", "08:00", "10:00", "13:00", "17:00", "18:00"],
    "S48":  ["06:45", "08:45", "10:15", "12:15", "16:15", "18:15"],
}


# ==================================================
# BUS CAPACITY & CRUSH LOAD DEFINITIONS
# Standard Coimbatore TNSTC/Private City Bus:
# 50 Seating + 20 Standing = 70 Nominal Capacity
# Crush Load Overcrowding during Peaks: Up to 105
# ==================================================

SEATING_CAPACITY = 50
STANDING_CAPACITY = 20
TOTAL_CAPACITY = SEATING_CAPACITY + STANDING_CAPACITY  # 70 nominal passengers
BUS_CAPACITY = TOTAL_CAPACITY
MAX_CRUSH_CAPACITY = 105  # Maximum crush crowd capacity during heavy surge peaks

# Baseline average passenger load
BASE_PASSENGERS = 50


# ==================================================
# RANDOM SEED
# ==================================================

random.seed(42)


# ==================================================
# LOAD ROUTE STOPS
# ==================================================

def load_route_stops():
    route_stops = defaultdict(list)

    with open(ROUTE_STOPS_FILE, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            service_id = row["service_id"].strip()
            stop_order = int(row["stop_order"])
            stop_id = row["stop_id"].strip()
            route_stops[service_id].append((stop_order, stop_id))

    for service_id in route_stops:
        route_stops[service_id].sort(key=lambda x: x[0])

    return route_stops


# ==================================================
# CREATE ZONE-BASED SEGMENTS
# ==================================================

def create_route_segments(route_stops, service_frequency):
    segments = defaultdict(list)

    for service_id, stops in route_stops.items():
        stop_ids = [stop_id for _, stop_id in stops]

        for direction, ordered_stops in [
            ("OUTBOUND", stop_ids),
            ("INBOUND", list(reversed(stop_ids)))
        ]:
            zone_start = ordered_stops[0]
            current_freq = service_frequency.get(
                (ordered_stops[0], ordered_stops[1], direction),
                1
            )

            for i in range(1, len(ordered_stops) - 1):
                next_freq = service_frequency.get(
                    (ordered_stops[i], ordered_stops[i + 1], direction),
                    1
                )

                if next_freq != current_freq:
                    # Frequency changed = end of zone
                    segments[(service_id, direction)].append(
                        (zone_start, ordered_stops[i], current_freq)
                    )
                    zone_start = ordered_stops[i]
                    current_freq = next_freq

            # Last zone
            segments[(service_id, direction)].append(
                (zone_start, ordered_stops[-1], current_freq)
            )

    return segments


# ==================================================
# LOAD SERVICE FREQUENCY
# ==================================================

def load_service_frequency():
    frequency = {}

    with open(SERVICE_FREQUENCY_FILE, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            key = (
                row["from_stop_id"].strip(),
                row["to_stop_id"].strip(),
                row["direction"].strip().upper()
            )
            frequency[key] = int(row["scheduled_trips_per_day"])

    return frequency


# ==================================================
# LOAD HOLIDAYS
# ==================================================

def load_holidays():
    holidays = {}

    with open(HOLIDAY_FILE, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            date_value = row["date"].strip()
            if date_value.lower() == "date":
                continue
            holiday_date = datetime.strptime(date_value, "%Y-%m-%d").date()
            holidays[holiday_date] = row["holiday_name"].strip()

    return holidays


# ==================================================
# LOAD WEATHER
# ==================================================

def load_weather():
    weather = {}

    with open(WEATHER_FILE, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            key = (
                row["date"].strip(),
                row["time"].strip()
            )
            weather[key] = {
                "temperature_c": float(row["temperature_c"]),
                "humidity": float(row["humidity"]),
                "rain_mm": float(row["rain_mm"]),
                "weather_code": int(row["weather_code"])
            }

    return weather


# ==================================================
# GET WEATHER
# ==================================================

def get_weather(weather, current_date, departure_time):
    hour = int(departure_time.split(":")[0])
    minute = int(departure_time.split(":")[1])

    # Use nearest hourly weather
    if minute >= 30:
        hour += 1

    hour = max(4, min(hour, 20))
    key = (
        current_date.strftime("%Y-%m-%d"),
        f"{hour:02d}:00"
    )

    return weather.get(
        key,
        {
            "temperature_c": 28.0,
            "humidity": 65.0,
            "rain_mm": 0.0,
            "weather_code": 0
        }
    )


# ==================================================
# CALCULATE SEGMENT FACTOR
# ==================================================

def get_segment_factor(service_frequency):
    if service_frequency >= 40:
        return 1.25
    elif service_frequency >= 30:
        return 1.15
    elif service_frequency >= 20:
        return 1.05
    elif service_frequency >= 10:
        return 0.90
    else:
        return 0.75


# ==================================================
# CALCULATE TIME FACTOR
# ==================================================

def get_time_factor(departure_time, direction="OUTBOUND"):
    hour = int(departure_time.split(":")[0])

    # Morning commuter rush (07:00 – 09:59)
    # Inbound towards commercial center is exceptionally heavy
    if 7 <= hour <= 9:
        return 1.75 if direction == "INBOUND" else 1.65

    # Evening commuter rush (16:00 – 19:59 / 4:00 PM – 8:00 PM)
    # Outbound heading home to residential/outer corridors has maximum crush load
    elif 16 <= hour <= 19:
        return 1.82 if direction == "OUTBOUND" else 1.70

    # Midday steady transit (11:00 – 15:59)
    elif 11 <= hour <= 15:
        return 0.85

    # Early morning (05:00 - 06:59) & night (20:00+) off-peak
    else:
        return 0.52


# ==================================================
# CALCULATE PASSENGER COUNT
# ==================================================

def calculate_passengers(
    departure_time,
    current_date,
    is_holiday,
    rain_mm,
    service_frequency,
    direction="OUTBOUND"
):
    # Base demand
    demand = BASE_PASSENGERS

    # Zone service intensity
    demand *= get_segment_factor(service_frequency)

    # Time of day & directional rush dynamics
    demand *= get_time_factor(departure_time, direction)

    # Weekday / Weekend dynamics
    weekday = current_date.weekday()
    if weekday == 0:
        # Monday morning office/college rush
        demand *= 1.10
    elif weekday == 4:
        # Friday evening weekend exodus
        demand *= 1.12
    elif weekday == 5:
        # Saturday shopping & market movement
        demand *= 0.88
    elif weekday == 6:
        # Sunday lull
        demand *= 0.72
    else:
        # Tuesday-Thursday standard
        demand *= 1.00

    # Public Holiday / Festival surge (Deepavali, Pongal, etc.)
    if is_holiday:
        demand *= 1.35

    # Rain (Modal shift from two-wheelers to buses in Coimbatore)
    if rain_mm >= 5:
        demand *= 1.22
    elif rain_mm >= 1:
        demand *= 1.10

    # Continuous bus variation (realistic dispersion)
    demand *= random.uniform(0.82, 1.18)

    # 10% probability of sudden corridor spike (college dismissal / bus bunching)
    if random.random() < 0.10:
        demand *= random.uniform(1.12, 1.25)

    # Crush capacity limit (Nominal 70, crush load up to 105)
    passengers = round(demand)
    passengers = max(10, min(passengers, MAX_CRUSH_CAPACITY))

    return passengers


# ==================================================
# GENERATE DATASET
# ==================================================

def generate_dataset():
    print("Loading route stops...")
    route_stops = load_route_stops()

    print("Loading service frequency...")
    service_frequency = load_service_frequency()

    print("Creating zone-based route segments...")
    route_segments = create_route_segments(route_stops, service_frequency)

    print("Loading holidays...")
    holidays = load_holidays()

    print("Loading weather...")
    weather = load_weather()

    print("Generating passenger records...")
    rows = []

    current_date = START_DATE

    while current_date <= END_DATE:
        is_holiday = (current_date in holidays)
        holiday_name = holidays.get(current_date, "")
        date_str = current_date.strftime("%Y-%m-%d")
        day_name = current_date.strftime("%A")

        for service_id, time_slots in SELECTED_TIMES.items():
            outbound_zones = route_segments.get((service_id, "OUTBOUND"), [])
            inbound_zones = route_segments.get((service_id, "INBOUND"), [])

            # Map inbound zones by normalized segment key
            inbound_freq_map = {}
            for z_start, z_end, z_freq in inbound_zones:
                seg_k = (min(z_start, z_end), max(z_start, z_end))
                inbound_freq_map[seg_k] = z_freq

            for departure_time in time_slots:
                weather_data = get_weather(weather, current_date, departure_time)

                for zone_start, zone_end, out_freq in outbound_zones:
                    segment_start = min(zone_start, zone_end)
                    segment_end = max(zone_start, zone_end)
                    seg_key = (segment_start, segment_end)
                    in_freq = inbound_freq_map.get(seg_key, out_freq)

                    # Calculate realistic counts for BOTH directions
                    out_pax = calculate_passengers(
                        departure_time=departure_time,
                        current_date=current_date,
                        is_holiday=is_holiday,
                        rain_mm=weather_data["rain_mm"],
                        service_frequency=out_freq,
                        direction="OUTBOUND"
                    )

                    in_pax = calculate_passengers(
                        departure_time=departure_time,
                        current_date=current_date,
                        is_holiday=is_holiday,
                        rain_mm=weather_data["rain_mm"],
                        service_frequency=in_freq,
                        direction="INBOUND"
                    )

                    row = {
                        "date": date_str,
                        "time": departure_time,
                        "service_id": service_id,
                        "from_stop_id": segment_start,
                        "to_stop_id": segment_end,
                        "temperature_c": weather_data["temperature_c"],
                        "humidity": weather_data["humidity"],
                        "rain_mm": weather_data["rain_mm"],
                        "weather_code": weather_data["weather_code"],
                        "holiday": "Yes" if is_holiday else "No",
                        "holiday_name": holiday_name,
                        "day_of_week": day_name,
                        "inbound_scheduled_trips_per_day": in_freq,
                        "outbound_scheduled_trips_per_day": out_freq,
                        "inbound_passenger_count": in_pax,
                        "outbound_passenger_count": out_pax,
                    }
                    rows.append(row)

        current_date += timedelta(days=1)

    return rows


# ==================================================
# SAVE DATASET
# ==================================================

def save_dataset(rows):
    fieldnames = [
        "date",
        "time",
        "service_id",
        "from_stop_id",
        "to_stop_id",
        "temperature_c",
        "humidity",
        "rain_mm",
        "weather_code",
        "holiday",
        "holiday_name",
        "day_of_week",
        "inbound_scheduled_trips_per_day",
        "outbound_scheduled_trips_per_day",
        "inbound_passenger_count",
        "outbound_passenger_count"
    ]

    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# ==================================================
# MAIN
# ==================================================

def main():
    rows = generate_dataset()
    save_dataset(rows)
    print("--------------------------------")
    print("Passenger dataset created successfully!")
    print("--------------------------------")
    print(f"Records: {len(rows):,}")
    print(f"File: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
