import csv
from collections import Counter

FILE = r"D:\RideCast\dataset\data\historical_ridership.csv"

route_counts = Counter()
segment_counts = Counter()
route_segment_counts = Counter()

with open(FILE, "r", encoding="utf-8") as file:

    reader = csv.DictReader(file)

    for row in reader:

        route = row["service_id"]
        direction = row["direction"]

        segment = (
            row["from_stop_id"]
            + "->"
            + row["to_stop_id"]
        )

        route_counts[route] += 1

        segment_counts[
            (segment, direction)
        ] += 1

        route_segment_counts[
            (route, direction, segment)
        ] += 1


print("\n========== RECORDS BY ROUTE ==========\n")

for route, count in sorted(route_counts.items()):

    print(
        f"{route}: {count:,} records"
    )


print("\n========== RECORDS BY SEGMENT ==========\n")

for (segment, direction), count in sorted(
    segment_counts.items()
):

    print(
        f"{segment} | {direction}: "
        f"{count:,} records"
    )


print("\n========== ROUTE + SEGMENT ==========\n")

for (
    route,
    direction,
    segment
), count in sorted(
    route_segment_counts.items()
):

    print(
        f"{route} | {direction} | "
        f"{segment}: {count:,}"
    )