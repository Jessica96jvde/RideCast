import csv
from collections import defaultdict

def get_period(time):
    hour = int(time.split(':')[0])
    minute = int(time.split(':')[1])
    t = hour * 60 + minute
    if t < 7*60:      return '1_EARLY_MORNING (before 07:00)'
    elif t < 10*60:   return '2_MORNING_PEAK  (07:00-09:59)'
    elif t < 12*60:   return '3_LATE_MORNING  (10:00-11:59)'
    elif t < 14*60:   return '4_MIDDAY        (12:00-13:59)'
    elif t < 16*60:   return '5_AFTERNOON     (14:00-15:59)'
    elif t < 19*60:   return '6_EVENING_PEAK  (16:00-18:59)'
    else:             return '7_LATE_EVENING  (19:00+)'

timetable = defaultdict(list)
with open('dataset/data/route_timetable.csv', 'r') as f:
    for row in csv.DictReader(f):
        if row['direction'].strip() == 'OUTBOUND':
            timetable[row['service_id'].strip()].append(row['departure_time'].strip())

for s in sorted(timetable):
    print('=== ' + s + ' ===')
    by_period = defaultdict(list)
    for t in sorted(set(timetable[s])):
        by_period[get_period(t)].append(t)
    for period in sorted(by_period):
        times = by_period[period]
        print('  ' + period + ': ' + str(times))
    print()
