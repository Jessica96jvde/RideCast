import requests

# Test OSRM routing in Coimbatore between Collector Office / DSP Office and VOC Park
# Lon, Lat format for OSRM: 76.9698,11.0048 to 76.9682,11.0138
url = "https://router.project-osrm.org/route/v1/driving/76.9698,11.0048;76.9682,11.0138?overview=full&geometries=geojson"
try:
    res = requests.get(url, timeout=10)
    data = res.json()
    if "routes" in data and len(data["routes"]) > 0:
        geom = data["routes"][0]["geometry"]["coordinates"]
        print(f"OSRM SUCCESS! Got {len(geom)} road-snapped waypoints following streets exactly!")
        print("First 3 waypoints (lon, lat):", geom[:3])
        print("Distance (meters):", data["routes"][0]["distance"])
        print("Duration (seconds):", data["routes"][0]["duration"])
    else:
        print("OSRM returned no routes:", data)
except Exception as e:
    print("OSRM error:", e)
