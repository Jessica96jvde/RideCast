import csv
from pathlib import Path
from collections import defaultdict


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

ROUTE_STOPS_FILE = PROJECT_ROOT / "dataset" / "data" / "route_stops.csv"
TIMETABLE_FILE = PROJECT_ROOT / "dataset" / "data" / "route_timetable.csv"
OUTPUT_FILE = PROJECT_ROOT / "dataset" / "data" / "service_frequency.csv"

# --------------------------------------------------
# READ ROUTE-SEGMENT INFORMATION
# --------------------------------------------------

def load_route_segments():

    route_stops = defaultdict(list)

    with open(ROUTE_STOPS_FILE, "r", encoding="utf-8") as file:

        reader = csv.DictReader(file)

        for row in reader:
            service_id = row["service_id"]
            stop_order = int(row["stop_order"])
            stop_id = row["stop_id"]

            route_stops[service_id].append(
                (stop_order, stop_id)
            )

    # Convert each route into consecutive segments
    route_segments = defaultdict(list)

    for service_id, stops in route_stops.items():

        stops.sort()

        for i in range(len(stops) - 1):

            from_stop = stops[i][1]
            to_stop = stops[i + 1][1]

            route_segments[service_id].append(
                (from_stop, to_stop)
            )

    return route_segments


# --------------------------------------------------
# READ TIMETABLE
# --------------------------------------------------

def load_timetable():

    timetable_count = defaultdict(int)

    with open(TIMETABLE_FILE, "r", encoding="utf-8") as file:

        reader = csv.DictReader(file)

        for row in reader:

            service_id = row["service_id"]
            direction = row["direction"]

            timetable_count[(service_id, direction)] += 1

    return timetable_count


# --------------------------------------------------
# CALCULATE SERVICE FREQUENCY
# --------------------------------------------------

def calculate_frequency(route_segments, timetable_count):

    frequency = defaultdict(int)

    for (service_id, direction), trip_count in timetable_count.items():

        for segment in route_segments[service_id]:

            from_stop, to_stop = segment

            frequency[
                (from_stop, to_stop, direction)
            ] += trip_count

    return frequency


# --------------------------------------------------
# SAVE RESULT
# --------------------------------------------------

def save_frequency(frequency):

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "from_stop_id",
                "to_stop_id",
                "direction",
                "scheduled_trips_per_day"
            ]
        )

        writer.writeheader()

        for (from_stop, to_stop, direction), trips in sorted(
            frequency.items()
        ):

            writer.writerow({
                "from_stop_id": from_stop,
                "to_stop_id": to_stop,
                "direction": direction,
                "scheduled_trips_per_day": trips
            })


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    print("Reading route stops...")

    route_segments = load_route_segments()

    print("Reading timetable...")

    timetable_count = load_timetable()

    print("Calculating service frequency...")

    frequency = calculate_frequency(
        route_segments,
        timetable_count
    )

    save_frequency(frequency)

    print("--------------------------------")
    print("Service frequency created!")
    print("--------------------------------")
    print(f"Segments calculated: {len(frequency)}")
    print(f"Created: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()