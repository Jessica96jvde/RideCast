import math
import pandas as pd
from typing import List, Dict, Any, Optional

from backend.config import BUS_FILE, ROUTE_START_COORDS, ROUTE_INFO
from backend.db.database import get_allocations_for_date, save_allocation


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def get_fleet_df(date_str: str) -> pd.DataFrame:
    """Load fleet availability and merge with active allocations for the date."""
    df = pd.read_csv(BUS_FILE)
    alloc_df = get_allocations_for_date(date_str)
    allocated_bus_ids = set(alloc_df["bus_id"].tolist()) if not alloc_df.empty else set()

    df["status"] = df["bus_id"].apply(
        lambda bid: "Allocated" if bid in allocated_bus_ids else "Idle"
    )
    return df


def get_idle_buses(date_str: str) -> List[Dict[str, Any]]:
    df = get_fleet_df(date_str)
    idle = df[df["status"] == "Idle"].to_dict(orient="records")
    return idle


def recommend_buses(
    service_id: str,
    date_str: str,
    required_capacity: int = 50
) -> List[Dict[str, Any]]:
    """Rank idle buses by proximity to the route start point."""
    if service_id not in ROUTE_START_COORDS:
        start_lat, start_lon, start_name = (11.0018, 76.9674, "Gandhipuram")
    else:
        start_lat, start_lon, start_name = ROUTE_START_COORDS[service_id]

    idle_buses = get_idle_buses(date_str)
    if not idle_buses:
        return []

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

    ranked.sort(key=lambda x: (not x["suitable"], x["distance_km"]))
    if ranked:
        ranked[0]["is_recommended"] = True

    return ranked


def execute_allocation(
    date_str: str,
    service_id: str,
    bus_id: str,
    reason: str,
    allocated_by: str = "Ravi (Transport Authority)"
) -> bool:
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
