import csv
from collections import defaultdict

route_stops = defaultdict(list)
with open('data/route_stops.csv', 'r') as f:
    for row in csv.DictReader(f):
        s = row['service_id'].strip()
        route_stops[s].append(row['stop_id'].strip())

# For each consecutive segment, which services cover it
segment_services = defaultdict(set)
for service, stops in route_stops.items():
    for i in range(len(stops) - 1):
        seg = (stops[i], stops[i+1])
        segment_services[seg].add(service)

# Find segments covered by MORE THAN ONE service
print('=== SEGMENTS COVERED BY MULTIPLE SERVICES ===')
multi = {seg: svcs for seg, svcs in segment_services.items() if len(svcs) > 1}
for seg, svcs in sorted(multi.items()):
    print('  ' + seg[0] + ' -> ' + seg[1] + ' : ' + str(svcs))

print()
print('Total segments covered by multiple services: ' + str(len(multi)))
print('Total unique segments: ' + str(len(segment_services)))

# Show stops that appear in multiple services
print()
print('=== SHARED STOPS (appear in 2+ services) ===')
stop_services = defaultdict(set)
for service, stops in route_stops.items():
    for stop in stops:
        stop_services[stop].add(service)

for stop, svcs in sorted(stop_services.items()):
    if len(svcs) > 1:
        print('  ' + stop + ': ' + str(svcs))
