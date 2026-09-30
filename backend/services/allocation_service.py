"""
RideCast - Smart Fleet Allocation & Proximity Recommendation Engine
===================================================================
This module optimizes bus fleet distribution across Coimbatore.
When a route is forecast to experience heavy congestion, this engine finds
idle/standby buses parked at nearby depots and recommends the closest, most suitable
bus to minimize empty deadhead transit distance.

Key Concepts for Beginners:
---------------------------
1. What is Haversine Distance?
   - The Earth is curved. The standard Euclidean distance (sqrt(dx^2 + dy^2)) is inaccurate for GPS coordinates.
   - The Haversine formula calculates the true "great-circle" distance between two (latitude, longitude) points on a sphere.

2. Idle vs Allocated Fleet:
   - All buses stored in `bus_availability.csv` are cross-referenced with active allocations in SQLite.
   - If a bus is already dispatched for date `D`, its status is marked "Allocated"; otherwise, it is "Idle" and eligible for assignment.

3. Proximity Ranking:
   - Eligible idle buses with sufficient seating capacity (>= 50) are sorted in ascending order of their distance (km) to the route's starting terminal.
"""

import math
import pandas as pd
from typing import List, Dict, Any, Optional

from backend.config import BUS_FILE, ROUTE_START_COORDS, ROUTE_INFO
from backend.db.database import get_allocations_for_date, save_allocation


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two GPS coordinates in kilometers.
    
    Formula:
      a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
      c = 2 * atan2(√a, √(1−a))
      distance = R * c  (where R = 6,371 km is Earth's mean radius)
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 1)


def get_fleet_df(date_str: str) -> pd.DataFrame:
    """
    Loads depot bus inventory and dynamically annotates each bus as 'Idle' or 'Allocated'
    based on records in the SQLite allocation table for the specified date.
    """
    df = pd.read_csv(BUS_FILE)
    alloc_df = get_allocations_for_date(date_str)
    allocated_bus_ids = set(alloc_df["bus_id"].tolist()) if not alloc_df.empty else set()

    df["status"] = df["bus_id"].apply(
        lambda bid: "Allocated" if bid in allocated_bus_ids else "Idle"
    )
    return df


def get_idle_buses(date_str: str) -> List[Dict[str, Any]]:
    """Retrieves all currently idle/unassigned buses for a given date."""
    df = get_fleet_df(date_str)
    idle = df[df["status"] == "Idle"].to_dict(orient="records")
    return idle


def recommend_buses(
    service_id: str,
    date_str: str,
    required_capacity: int = 50
) -> List[Dict[str, Any]]:
    """
    Finds and ranks idle buses by proximity (shortest distance in km)
    to the starting terminal of `service_id`.
    
    Returns a list of candidate buses sorted with the closest, suitable bus first.
    """
    # 1. Determine the starting GPS coordinates for this transit route
    if service_id not in ROUTE_START_COORDS:
        start_lat, start_lon, start_name = (11.0018, 76.9674, "Gandhipuram")
    else:
        start_lat, start_lon, start_name = ROUTE_START_COORDS[service_id]

    # 2. Get list of all idle buses for the date
    idle_buses = get_idle_buses(date_str)
    if not idle_buses:
        return []

    # 3. Calculate distance from each idle bus depot to the route start point
    ranked = []
    for bus in idle_buses:
        b_lat = float(bus["current_lat"])
        b_lon = float(bus["current_lon"])
        dist = haversine_distance(start_lat, start_lon, b_lat, b_lon)
        suitable = bus["capacity"] >= required_capacity

        ranked.append({
            "bus_id": bus["bus_id"],
            "bus_number": bus["bus_number"],
            "depot_name": bus["depot_name"],
            "capacity": bus["capacity"],
            "fuel_type": bus["fuel_type"],
            "current_lat": b_lat,
            "current_lon": b_lon,
            "distance_km": dist,
            "suitable": suitable,
            "route_start_name": start_name,
            "is_recommended": False
        })

    # 4. Sort: Primary sort by suitability, secondary sort by shortest distance (km)
    ranked.sort(key=lambda x: (not x["suitable"], x["distance_km"]))
    
    # Mark the closest suitable bus as top recommendation
    if ranked:
        ranked[0]["is_recommended"] = True

    return ranked


def execute_allocation(
    date_str: str,
    service_id: str,
    bus_id: str,
    reason: str,
    allocated_by: str = "Ravi"
) -> bool:
    """
    Dispatches a selected bus to a route and saves the event in the SQLite database.
    """
    df = pd.read_csv(BUS_FILE)
    match = df[df["bus_id"] == bus_id]
    if match.empty:
        return False

    bus_row = match.iloc[0]
    bus_num = bus_row["bus_number"]
    depot = bus_row["depot_name"]
    b_lat, b_lon = float(bus_row["current_lat"]), float(bus_row["current_lon"])

    start_lat, start_lon, _ = ROUTE_START_COORDS.get(service_id, (11.0018, 76.9674, "Gandhipuram"))
    dist = haversine_distance(start_lat, start_lon, b_lat, b_lon)
    route_name = ROUTE_INFO.get(service_id, {}).get("name", f"Service {service_id}")

    # Persist allocation record to SQLite
    save_allocation(
        date_str=date_str,
        service_id=service_id,
        route_name=route_name,
        bus_id=bus_id,
        bus_number=bus_num,
        source_depot=depot,
        distance_km=dist,
        reason=reason,
        allocated_by=allocated_by
    )
    return True
