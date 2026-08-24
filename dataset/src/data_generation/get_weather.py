import requests
import csv
from pathlib import Path
from datetime import datetime


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

OUTPUT_FILE = PROJECT_ROOT / "dataset" / "data" / "weather_history.csv"


# --------------------------------------------------
# COIMBATORE LOCATION
# --------------------------------------------------

LATITUDE = 11.0168
LONGITUDE = 76.9558

TIMEZONE = "Asia/Kolkata"


# --------------------------------------------------
# DATE RANGE
# --------------------------------------------------

START_DATE = "2024-01-01"
END_DATE = "2025-12-31"


# --------------------------------------------------
# HOURS WE NEED
# 04:00 to 20:00 = 17 hours per day
# --------------------------------------------------

REQUIRED_HOURS = set(range(4, 21))


# --------------------------------------------------
# OPEN-METEO API
# --------------------------------------------------

API_URL = "https://archive-api.open-meteo.com/v1/archive"


def get_weather():

    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,

        "start_date": START_DATE,
        "end_date": END_DATE,

        "hourly": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "rain,"
            "weather_code"
        ),

        "timezone": TIMEZONE,

        "temperature_unit": "celsius",
        "precipitation_unit": "mm"
    }

    print("Requesting weather data from Open-Meteo...")

    response = requests.get(
        API_URL,
        params=params,
        timeout=60
    )

    response.raise_for_status()

    return response.json()


def save_weather(data):

    hourly = data["hourly"]

    rows = []

    for i, timestamp in enumerate(hourly["time"]):

        dt = datetime.fromisoformat(timestamp)

        # Keep only 04:00 to 20:00
        if dt.hour not in REQUIRED_HOURS:
            continue

        rows.append({
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M"),
            "temperature_c": hourly["temperature_2m"][i],
            "humidity": hourly["relative_humidity_2m"][i],
            "rain_mm": hourly["rain"][i],
            "weather_code": hourly["weather_code"][i]
        })

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "date",
                "time",
                "temperature_c",
                "humidity",
                "rain_mm",
                "weather_code"
            ]
        )

        writer.writeheader()
        writer.writerows(rows)

    print("--------------------------------")
    print("Weather data saved successfully!")
    print("--------------------------------")
    print(f"Records: {len(rows)}")
    print(f"File: {OUTPUT_FILE}")


def main():

    data = get_weather()

    save_weather(data)


if __name__ == "__main__":
    main()