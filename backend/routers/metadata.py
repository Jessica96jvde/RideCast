from fastapi import APIRouter
import pandas as pd
from typing import List, Dict, Any

from backend.config import ROUTE_INFO, ROUTE_START_COORDS, TIME_SLOTS
from backend.services.model_service import (
    get_stop_master_df, get_route_master_df, get_route_stops_df,
    get_route_timetable_df, find_services
)
from utils.map_utils import STOP_COORDS, SERVICE_COLORS

router = APIRouter(prefix="/api", tags=["metadata"])


@router.get("/stops")
def get_stops():
    df = get_stop_master_df()
    stops = []
    for _, row in df.iterrows():
        sid = row["stop_id"]
        coords = STOP_COORDS.get(sid, [11.0168, 76.9558])
        stops.append({
            "stop_id": sid,
            "stop_name": row["stop_name"],
            "lat": coords[0],
            "lon": coords[1],
        })
    return stops


@router.get("/routes")
def get_routes():
    df = get_route_master_df()
    routes = []
    for _, row in df.iterrows():
        sid = row["service_id"]
        info = ROUTE_INFO.get(sid, {})
        routes.append({
            "service_id": sid,
            "service_name": row["service_name"],
            "start_stop_id": row["start_stop_id"],
            "end_stop_id": row["end_stop_id"],
            "route_name": info.get("name", f"Service {sid}"),
            "origin_name": info.get("origin_name", ""),
            "dest_name": info.get("dest_name", ""),
            "base_daily_normal": info.get("base_daily_normal", 1500),
            "color": SERVICE_COLORS.get(sid, "#38bdf8"),
        })
    return routes


@router.get("/services-between")
def get_services_between(from_stop: str, to_stop: str):
    services = find_services(from_stop, to_stop)
    return {"services": services}


@router.get("/timetable/{service_id}")
def get_timetable(service_id: str):
    tt = get_route_timetable_df()
    times = (
        tt[tt["service_id"] == service_id]["departure_time"]
        .drop_duplicates()
        .sort_values()
        .tolist()
    )
    return {"service_id": service_id, "departure_times": times}


@router.get("/time-slots")
def get_time_slots():
    return TIME_SLOTS


@router.get("/map/data")
def get_map_metadata():
    """Return stop coordinates and route colors for client-side rendering."""
    df_stops = get_stop_master_df()
    names = dict(zip(df_stops["stop_id"], df_stops["stop_name"]))

    rs = get_route_stops_df()
    routes_geometry = {}

    for sid, group in rs.groupby("service_id"):
        stops = group.sort_values("stop_order")["stop_id"].tolist()
        coords = [STOP_COORDS[s] for s in stops if s in STOP_COORDS]
        routes_geometry[sid] = {
            "service_id": sid,
            "color": SERVICE_COLORS.get(sid, "#38bdf8"),
            "stops": stops,
            "coordinates": coords
        }

    return {
        "stop_coords": STOP_COORDS,
        "stop_names": names,
        "service_colors": SERVICE_COLORS,
        "route_geometry": routes_geometry,
        "route_start_coords": ROUTE_START_COORDS,
        "center": [11.0168, 76.9558]
    }
