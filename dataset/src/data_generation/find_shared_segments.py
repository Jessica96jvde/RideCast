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
# READ ROUTE STOPS
# --------------------------------------------------

def load_route_stops():

    route_stops = defaultdict(list)

    with open(ROUTE_STOPS_FILE, "r", encoding="utf-8") as file:

        reader = csv.DictReader(file)

        for row in reader:

            service_id = row["service_id"].strip()
            stop_order = int(row["stop_order"])
            stop_id = row["stop_id"].strip()

            route_stops[service_id].append(
                (stop_order, stop_id)
            )

    # Sort stops in the original route direction
    for service_id in route_stops:

        route_stops[service_id].sort(
            key=lambda x: x[0]
        )

    return route_stops


# --------------------------------------------------
# CREATE DIRECTIONAL SEGMENTS
# --------------------------------------------------

def create_directional_segments(route_stops):

    directional_segments = defaultdict(list)

    for service_id, stops in route_stops.items():

        stop_ids = [stop_id for _, stop_id in stops]

        # ------------------------------
        # OUTBOUND
        # ------------------------------

        for i in range(len(stop_ids) - 1):

            from_stop = stop_ids[i]
            to_stop = stop_ids[i + 1]

            directional_segments[
                (service_id, "OUTBOUND")
            ].append(
                (from_stop, to_stop)
            )

        # ------------------------------
        # INBOUND
        # Reverse the route
        # ------------------------------

        reversed_stops = list(reversed(stop_ids))

        for i in range(len(reversed_stops) - 1):

            from_stop = reversed_stops[i]
            to_stop = reversed_stops[i + 1]

            directional_segments[
                (service_id, "INBOUND")
            ].append(
                (from_stop, to_stop)
            )

    return directional_segments


# --------------------------------------------------
# READ TIMETABLE
# --------------------------------------------------

def load_timetable():

    timetable_count = defaultdict(int)

    with open(TIMETABLE_FILE, "r", encoding="utf-8") as file:

        reader = csv.DictReader(file)

        for row in reader:

            service_id = row["service_id"].strip()
            direction = row["direction"].strip().upper()

            timetable_count[
                (service_id, direction)
            ] += 1

    return timetable_count


# --------------------------------------------------
# CALCULATE SERVICE FREQUENCY
# --------------------------------------------------

def calculate_frequency(
    directional_segments,
    timetable_count
):

    frequency = defaultdict(int)

    for (service_id, direction), trip_count in timetable_count.items():

        segments = directional_segments.get(
            (service_id, direction),
            []
        )

        for from_stop, to_stop in segments:

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

        for (
            from_stop,
            to_stop,
            direction
        ), trips in sorted(frequency.items()):

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

    route_stops = load_route_stops()

    print(f"Routes found: {len(route_stops)}")

    print("Creating outbound and inbound segments...")

    directional_segments = create_directional_segments(
        route_stops
    )

    print("Reading timetable...")

    timetable_count = load_timetable()

    print("Calculating service frequency...")

    frequency = calculate_frequency(
        directional_segments,
        timetable_count
    )

    save_frequency(frequency)

    print("--------------------------------")
    print("Service frequency created!")
    print("--------------------------------")
    print(
        f"Directional segments: {len(frequency)}"
    )
    print(
        f"Created: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()