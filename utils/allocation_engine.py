import math
import pandas as pd
from pathlib import Path
from auth.db import get_allocations_for_date, save_allocation

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BUS_FILE = PROJECT_ROOT / "dataset" / "data" / "bus_availability.csv"
ROUTE_MASTER = PROJECT_ROOT / "dataset" / "data" / "route_master.csv"
STOP_MASTER = PROJECT_ROOT / "dataset" / "data" / "stop_master.csv"

# GPS Coordinates for Key Hubs / Depots / Terminals
ROUTE_START_COORDS = {
    "S45":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S57":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S33A": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S48":  (11.0018, 76.9674, "Gandhipuram Town Stand"),
}

ROUTE_NAMES = {
    "S45":  "45: Ukkadam ? Saibaba Colony",
    "S57":  "57: Ukkadam ? Saibaba Colony",
    "S33A": "33A: Gandhipuram ? Singanallur",
    "S48":  "48: Gandhipuram ? Ondipudur",
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points on Earth in km."""
    R = 6371.0  # Earth radius in kilometers
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
    
    # Mark status as Allocated if found in allocations for that date
    df["status"] = df["bus_id"].apply(
        lambda bid: "Allocated" if bid in allocated_bus_ids else "Idle"
    )
    return df


def get_idle_buses(date_str: str) -> list[dict]:
    """Return list of currently idle buses available for allocation on date_str."""
    df = get_fleet_df(date_str)
    idle = df[df["status"] == "Idle"].to_dict(orient="records")
    return idle


def recommend_buses(service_id: str, date_str: str, required_capacity: int = 50) -> list[dict]:
    """
    Find and rank available idle buses by proximity to the route start point.
    Considers bus capacity and availability.
    """
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
        
        # Suitable if capacity meets requirement
        suitable = bus["capacity"] >= required_capacity
        
        ranked.append({
            "bus_id": bus["bus_id"],
            "bus_number": bus["bus_number"],
            "depot_name": bus["depot_name"],
            "capacity": bus["capacity"],
            "fuel_type": bus["fuel_type"],
            "distance_km": dist,
            "suitable": suitable,
            "route_start_name": start_name,
            "is_recommended": False
        })

    # Sort primarily by proximity (distance) and suitability
    ranked.sort(key=lambda x: (not x["suitable"], x["distance_km"]))

    if ranked:
        ranked[0]["is_recommended"] = True

    return ranked


def execute_allocation(date_str: str, service_id: str, bus_id: str, reason: str, allocated_by: str = "Officer Rajesh Kumar") -> bool:
    """Commit bus allocation to database and update state."""
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
    route_name = ROUTE_NAMES.get(service_id, f"Service {service_id}")
    
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
