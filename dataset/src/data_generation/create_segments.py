import csv
from pathlib import Path


# Project location
PROJECT_ROOT = Path(__file__).resolve().parents[2]

ROUTE_STOPS_FILE = PROJECT_ROOT / "dataset" / "data" / "route_stops.csv"

SEGMENT_FILE = PROJECT_ROOT / "dataset" / "data" / "segment_master.csv"

MAPPING_FILE = PROJECT_ROOT / "dataset" / "data" / "service_segment_mapping.csv"


def load_route_stops():
    """Load route stops and organize them by service."""

    routes = {}

    with open(
        ROUTE_STOPS_FILE,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            service_id = row["service_id"].strip()
            stop_order = int(row["stop_order"])
            stop_id = row["stop_id"].strip()

            routes.setdefault(service_id, []).append(
                (stop_order, stop_id)
            )

    # Make sure stops are in the correct order
    for service_id in routes:
        routes[service_id].sort(key=lambda x: x[0])

    return routes


def create_segments(routes):

    segments = []
    mappings = []

    segment_lookup = {}

    segment_number = 1

    for service_id, stops in routes.items():

        for i in range(len(stops) - 1):

            from_stop = stops[i][1]
            to_stop = stops[i + 1][1]

            segment_key = (from_stop, to_stop)

            # Create segment only once
            if segment_key not in segment_lookup:

                segment_id = f"SEG{segment_number:03d}"

                segment_lookup[segment_key] = segment_id

                segments.append({
                    "segment_id": segment_id,
                    "from_stop_id": from_stop,
                    "to_stop_id": to_stop
                })

                segment_number += 1

            else:
                segment_id = segment_lookup[segment_key]

            # Connect route to segment
            mappings.append({
                "service_id": service_id,
                "segment_id": segment_id
            })

    return segments, mappings


def save_files(segments, mappings):

    # Save segment master
    with open(
        SEGMENT_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "segment_id",
                "from_stop_id",
                "to_stop_id"
            ]
        )

        writer.writeheader()
        writer.writerows(segments)

    # Save service-segment mapping
    with open(
        MAPPING_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "service_id",
                "segment_id"
            ]
        )

        writer.writeheader()
        writer.writerows(mappings)


def main():

    print("Reading route_stops.csv...")

    routes = load_route_stops()

    print(f"Routes found: {len(routes)}")

    segments, mappings = create_segments(routes)

    save_files(segments, mappings)

    print()
    print("--------------------------------")
    print("Segments created successfully!")
    print("--------------------------------")
    print(f"Unique segments: {len(segments)}")
    print(f"Route-segment mappings: {len(mappings)}")
    print()
    print(f"Created: {SEGMENT_FILE}")
    print(f"Created: {MAPPING_FILE}")


if __name__ == "__main__":
    main()