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
# Each service uses different minute offsets
# so time slots are defined per service.
# Times are chosen to represent:
#   early morning, morning peak, late morning,
#   midday, evening peak, evening
# All times must exist in route_timetable.csv
# ==================================================

SELECTED_TIMES = {
    "S45":  {"06:25", "08:25", "10:25", "11:25", "13:25", "15:25"},
    "S57":  {"06:25", "08:25", "10:25", "12:25", "16:25", "18:25"},
    "S33A": {"06:00", "08:00", "10:00", "13:00", "17:00", "18:00"},
    "S48":  {"06:45", "08:45", "10:15", "12:15", "16:15", "18:15"},
}


# ==================================================
# BUS CAPACITY
# ==================================================

BUS_CAPACITY = 50

# Normal occupancy assumption
BASE_OCCUPANCY = 0.75

BASE_PASSENGERS = round(
    BUS_CAPACITY * BASE_OCCUPANCY
)


# ==================================================
# RANDOM SEED
# ==================================================

random.seed(42)


# ==================================================
# LOAD ROUTE STOPS
# ==================================================

def load_route_stops():

    route_stops = defaultdict(list)

    with open(
        ROUTE_STOPS_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            service_id = row["service_id"].strip()
            stop_order = int(row["stop_order"])
            stop_id = row["stop_id"].strip()

            route_stops[service_id].append(
                (stop_order, stop_id)
            )

    for service_id in route_stops:

        route_stops[service_id].sort(
            key=lambda x: x[0]
        )

    return route_stops


# ==================================================
# CREATE ZONE-BASED SEGMENTS
#
# Instead of one row per consecutive stop pair,
# consecutive stops with the same frequency are
# grouped into one zone.
#
# Example for S45 OUTBOUND:
#   ST002 -> ST004  [32 trips] (zone 1)
#   ST004 -> ST005  [11 trips] (zone 2 - branch)
#   ST005 -> ST014  [32 trips] (zone 3)
#   ...
#
# A frequency change = a natural bus run boundary.
# No bus runs only ST002->ST003, so predicting
# that individually is meaningless.
# ==================================================

def create_route_segments(route_stops, service_frequency):

    segments = defaultdict(list)

    for service_id, stops in route_stops.items():

        stop_ids = [
            stop_id
            for _, stop_id in stops
        ]

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
                    segments[
                        (service_id, direction)
                    ].append(
                        (zone_start, ordered_stops[i], current_freq)
                    )

                    zone_start = ordered_stops[i]
                    current_freq = next_freq

            # Last zone
            segments[
                (service_id, direction)
            ].append(
                (zone_start, ordered_stops[-1], current_freq)
            )

    return segments


# ==================================================
# LOAD TIMETABLE
# ==================================================

def load_timetable():

    timetable = []

    with open(
        TIMETABLE_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            service_id = row["service_id"].strip()
            departure_time = row["departure_time"].strip()

            # Keep only the 6 selected time slots
            # for this specific service
            service_times = SELECTED_TIMES.get(
                service_id,
                set()
            )

            if departure_time not in service_times:
                continue

            timetable.append({

                "service_id":
                    service_id,

                "direction":
                    row["direction"].strip().upper(),

                "departure_time":
                    departure_time
            })

    return timetable


# ==================================================
# LOAD SERVICE FREQUENCY
# ==================================================

def load_service_frequency():

    frequency = {}

    with open(
        SERVICE_FREQUENCY_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            key = (
                row["from_stop_id"].strip(),
                row["to_stop_id"].strip(),
                row["direction"].strip().upper()
            )

            frequency[key] = int(
                row["scheduled_trips_per_day"]
            )

    return frequency


# ==================================================
# LOAD HOLIDAYS
# ==================================================

def load_holidays():

    holidays = {}

    with open(
        HOLIDAY_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            date_value = row["date"].strip()

            # Ignore accidental repeated headers
            if date_value.lower() == "date":
                continue

            holiday_date = datetime.strptime(
                date_value,
                "%Y-%m-%d"
            ).date()

            holidays[holiday_date] = (
                row["holiday_name"].strip()
            )

    return holidays


# ==================================================
# LOAD WEATHER
# ==================================================

def load_weather():

    weather = {}

    with open(
        WEATHER_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            key = (
                row["date"].strip(),
                row["time"].strip()
            )

            weather[key] = {

                "temperature_c":
                    float(row["temperature_c"]),

                "humidity":
                    float(row["humidity"]),

                "rain_mm":
                    float(row["rain_mm"]),

                "weather_code":
                    int(row["weather_code"])
            }

    return weather


# ==================================================
# GET WEATHER
# ==================================================

def get_weather(
    weather,
    current_date,
    departure_time
):

    hour = int(
        departure_time.split(":")[0]
    )

    minute = int(
        departure_time.split(":")[1]
    )

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
            "temperature_c": 0,
            "humidity": 0,
            "rain_mm": 0,
            "weather_code": 0
        }
    )


# ==================================================
# CALCULATE SEGMENT FACTOR
# ==================================================

def get_segment_factor(
    service_frequency
):

    if service_frequency >= 40:
        return 1.15

    elif service_frequency >= 30:
        return 1.10

    elif service_frequency >= 20:
        return 1.05

    elif service_frequency >= 10:
        return 0.95

    else:
        return 0.85


# ==================================================
# CALCULATE TIME FACTOR
# ==================================================

def get_time_factor(
    departure_time
):

    hour = int(
        departure_time.split(":")[0]
    )

    # Morning peak
    if 7 <= hour <= 10:
        return 1.15

    # Evening peak
    elif 16 <= hour <= 19:
        return 1.15

    # Midday
    elif 11 <= hour <= 15:
        return 0.90

    # Early morning / late evening
    else:
        return 0.70


# ==================================================
# CALCULATE PASSENGER COUNT
# ==================================================

def calculate_passengers(
    departure_time,
    current_date,
    is_holiday,
    rain_mm,
    service_frequency
):

    # ----------------------------------------------
    # BASE
    # ----------------------------------------------

    demand = BASE_PASSENGERS


    # ----------------------------------------------
    # ZONE SERVICE INTENSITY
    # ----------------------------------------------

    demand *= get_segment_factor(
        service_frequency
    )


    # ----------------------------------------------
    # TIME OF DAY
    # ----------------------------------------------

    demand *= get_time_factor(
        departure_time
    )


    # ----------------------------------------------
    # WEEKDAY / WEEKEND
    # ----------------------------------------------

    weekday = current_date.weekday()

    if weekday == 5:

        # Saturday
        demand *= 0.90

    elif weekday == 6:

        # Sunday
        demand *= 0.85

    else:

        # Monday-Friday
        demand *= 1.00


    # ----------------------------------------------
    # PUBLIC HOLIDAY
    # ----------------------------------------------

    if is_holiday:

        demand *= 1.05


    # ----------------------------------------------
    # RAIN
    # ----------------------------------------------

    if rain_mm >= 10:

        # Heavy rain
        demand *= 0.75

    elif rain_mm >= 5:

        # Moderate-heavy rain
        demand *= 0.85

    elif rain_mm >= 1:

        # Light rain
        demand *= 0.95

    else:

        # No significant rain
        demand *= 1.00


    # ----------------------------------------------
    # RANDOM REAL-WORLD VARIATION
    # ----------------------------------------------

    demand *= random.uniform(
        0.90,
        1.10
    )


    # ----------------------------------------------
    # CAPACITY LIMIT
    # ----------------------------------------------

    passengers = round(demand)

    passengers = max(
        0,
        min(
            passengers,
            BUS_CAPACITY
        )
    )

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
    route_segments = create_route_segments(
        route_stops,
        service_frequency
    )

    print("Loading timetable...")
    timetable = load_timetable()

    print("Loading holidays...")
    holidays = load_holidays()

    print("Loading weather...")
    weather = load_weather()

    print("Generating passenger records...")

    # Dictionary to combine
    # inbound and outbound into one row
    rows = {}

    current_date = START_DATE

    while current_date <= END_DATE:

        is_holiday = (
            current_date in holidays
        )

        holiday_name = holidays.get(
            current_date,
            ""
        )

        for trip in timetable:

            service_id = trip["service_id"]
            direction = trip["direction"]
            departure_time = trip["departure_time"]

            zones = route_segments.get(
                (service_id, direction),
                []
            )

            weather_data = get_weather(
                weather,
                current_date,
                departure_time
            )

            for zone_start, zone_end, zone_freq in zones:

                # ----------------------------------
                # NORMALIZE ZONE
                #
                # OUTBOUND: ST002 -> ST014
                # INBOUND:  ST014 -> ST002
                #
                # Both become: ST002 <-> ST014
                # ----------------------------------

                segment_start = min(
                    zone_start,
                    zone_end
                )

                segment_end = max(
                    zone_start,
                    zone_end
                )

                # Same key for both directions
                key = (
                    current_date.strftime("%Y-%m-%d"),
                    departure_time,
                    service_id,
                    segment_start,
                    segment_end
                )

                passenger_count = calculate_passengers(
                    departure_time,
                    current_date,
                    is_holiday,
                    weather_data["rain_mm"],
                    zone_freq
                )

                # ----------------------------------
                # CREATE ROW ON FIRST DIRECTION SEEN
                # ----------------------------------

                if key not in rows:

                    rows[key] = {

                        "date":
                            current_date.strftime(
                                "%Y-%m-%d"
                            ),

                        "time":
                            departure_time,

                        "service_id":
                            service_id,

                        "from_stop_id":
                            segment_start,

                        "to_stop_id":
                            segment_end,

                        "temperature_c":
                            weather_data["temperature_c"],

                        "humidity":
                            weather_data["humidity"],

                        "rain_mm":
                            weather_data["rain_mm"],

                        "weather_code":
                            weather_data["weather_code"],

                        "holiday":
                            "Yes" if is_holiday else "No",

                        "holiday_name":
                            holiday_name,

                        "day_of_week":
                            current_date.strftime("%A"),

                        "inbound_scheduled_trips_per_day":
                            0,

                        "outbound_scheduled_trips_per_day":
                            0,

                        "inbound_passenger_count":
                            0,

                        "outbound_passenger_count":
                            0
                    }

                # ----------------------------------
                # STORE IN CORRECT DIRECTION
                # ----------------------------------

                if direction == "INBOUND":

                    rows[key][
                        "inbound_scheduled_trips_per_day"
                    ] = zone_freq

                    rows[key][
                        "inbound_passenger_count"
                    ] = passenger_count

                elif direction == "OUTBOUND":

                    rows[key][
                        "outbound_scheduled_trips_per_day"
                    ] = zone_freq

                    rows[key][
                        "outbound_passenger_count"
                    ] = passenger_count

        current_date += timedelta(days=1)

    return list(rows.values())


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

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(rows)


# ==================================================
# MAIN
# ==================================================

def main():

    rows = generate_dataset()

    save_dataset(rows)

    print("--------------------------------")
    print("Passenger dataset created!")
    print("--------------------------------")
    print(f"Records: {len(rows)}")
    print(f"File: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
