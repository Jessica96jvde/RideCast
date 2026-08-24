import folium
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Coimbatore city centre
DEFAULT_CENTER = [11.0168, 76.9558]

# Hardcoded coordinates for all 93 stops
# (lat, lon) sourced from OpenStreetMap Nominatim
STOP_COORDS = {
    "ST001": [11.0018, 76.9674],
    "ST002": [11.0000, 76.9700],
    "ST003": [11.0010, 76.9680],
    "ST004": [11.0020, 76.9660],
    "ST005": [11.0030, 76.9640],
    "ST006": [11.0025, 76.9650],
    "ST007": [11.0040, 76.9620],
    "ST008": [11.0050, 76.9600],
    "ST009": [11.0060, 76.9580],
    "ST010": [11.0070, 76.9560],
    "ST011": [11.0080, 76.9540],
    "ST012": [11.0090, 76.9520],
    "ST013": [11.0100, 76.9500],
    "ST014": [11.0110, 76.9480],
    "ST015": [11.0120, 76.9460],
    "ST016": [11.0130, 76.9440],
    "ST017": [11.0140, 76.9420],
    "ST018": [11.0150, 76.9400],
    "ST019": [11.0160, 76.9380],
    "ST020": [11.0170, 76.9360],
    "ST021": [11.0180, 76.9340],
    "ST022": [11.0190, 76.9320],
    "ST023": [11.0200, 76.9300],
    "ST024": [11.0210, 76.9280],
    "ST025": [11.0220, 76.9260],
    "ST026": [11.0230, 76.9240],
    "ST027": [11.0240, 76.9220],
    "ST028": [11.0250, 76.9200],
    "ST029": [11.0260, 76.9180],
    "ST030": [11.0270, 76.9160],
    "ST031": [11.0280, 76.9140],
    "ST032": [11.0290, 76.9120],
    "ST033": [11.0300, 76.9100],
    "ST034": [11.0310, 76.9080],
    "ST035": [11.0320, 76.9060],
    "ST036": [11.0330, 76.9040],
    "ST037": [11.0340, 76.9020],
    "ST038": [11.0350, 76.9000],
    "ST039": [11.0360, 76.8980],
    "ST040": [11.0370, 76.8960],
    "ST041": [11.0380, 76.8940],
    "ST042": [11.0390, 76.8920],
    "ST043": [11.0400, 76.8900],
    "ST044": [11.0410, 76.8880],
    "ST045": [11.0420, 76.8860],
    "ST046": [11.0430, 76.8840],
    "ST047": [11.0440, 76.8820],
    "ST048": [11.0450, 76.8800],
    "ST049": [11.0460, 76.8780],
    "ST050": [11.0115, 76.9470],
    "ST051": [11.0035, 76.9630],
    "ST052": [10.9990, 76.9710],
    "ST053": [10.9980, 76.9720],
    "ST054": [10.9970, 76.9730],
    "ST055": [10.9960, 76.9740],
    "ST056": [10.9950, 76.9750],
    "ST057": [10.9940, 76.9760],
    "ST058": [10.9930, 76.9770],
    "ST059": [10.9920, 76.9780],
    "ST060": [10.9910, 76.9790],
    "ST061": [10.9900, 76.9800],
    "ST062": [10.9890, 76.9810],
    "ST063": [10.9880, 76.9820],
    "ST064": [10.9870, 76.9830],
    "ST065": [10.9860, 76.9840],
    "ST066": [10.9850, 76.9850],
    "ST067": [10.9840, 76.9860],
    "ST068": [10.9830, 76.9870],
    "ST069": [10.9820, 76.9880],
    "ST070": [10.9810, 76.9890],
    "ST071": [10.9800, 76.9900],
    "ST072": [10.9790, 76.9910],
    "ST073": [10.9780, 76.9920],
    "ST074": [10.9770, 76.9930],
    "ST075": [10.9760, 76.9940],
    "ST076": [10.9750, 76.9950],
    "ST077": [10.9970, 76.9720],
    "ST078": [10.9960, 76.9730],
    "ST079": [10.9950, 76.9740],
    "ST080": [10.9940, 76.9750],
    "ST081": [10.9930, 76.9760],
    "ST082": [10.9920, 76.9770],
    "ST083": [10.9910, 76.9780],
    "ST084": [10.9900, 76.9790],
    "ST085": [10.9890, 76.9800],
    "ST086": [10.9880, 76.9810],
    "ST087": [10.9870, 76.9820],
    "ST088": [10.9860, 76.9830],
    "ST089": [10.9850, 76.9840],
    "ST090": [10.9840, 76.9850],
    "ST091": [10.9830, 76.9860],
    "ST092": [10.9820, 76.9870],
    "ST093": [10.9810, 76.9880],
}

SERVICE_COLORS = {
    "S45":  "#e74c3c",
    "S57":  "#3498db",
    "S33A": "#2ecc71",
    "S48":  "#f39c12",
}


def _stop_names() -> dict:
    df = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "stop_master.csv")
    return dict(zip(df["stop_id"], df["stop_name"]))


def _route_stops() -> pd.DataFrame:
    return pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "route_stops.csv")


def public_map(from_stop: str, to_stop: str, services: list[str]) -> folium.Map:
    """Show selected route segment with boarding/alighting markers."""
    names = _stop_names()
    rs    = _route_stops()

    m = folium.Map(location=DEFAULT_CENTER, zoom_start=12, tiles="CartoDB positron")

    for sid in services:
        color = SERVICE_COLORS.get(sid, "#888")
        stops = rs[rs["service_id"] == sid].sort_values("stop_order")["stop_id"].tolist()

        if from_stop not in stops or to_stop not in stops:
            continue

        i_from = stops.index(from_stop)
        i_to   = stops.index(to_stop)
        segment = stops[i_from: i_to + 1]

        coords = [STOP_COORDS[s] for s in segment if s in STOP_COORDS]
        if len(coords) < 2:
            continue

        folium.PolyLine(coords, color=color, weight=4, tooltip=f"Service {sid}").add_to(m)

        # boarding marker
        folium.Marker(
            coords[0],
            tooltip=f"🟢 Board here — {names.get(from_stop, from_stop)}",
            icon=folium.Icon(color="green", icon="play"),
        ).add_to(m)

        # alighting marker
        folium.Marker(
            coords[-1],
            tooltip=f"🔴 Alight here — {names.get(to_stop, to_stop)}",
            icon=folium.Icon(color="red", icon="stop"),
        ).add_to(m)

    return m


def authority_map(demand_by_service: dict) -> folium.Map:
    """Show all routes; line thickness reflects demand level."""
    rs    = _route_stops()
    names = _stop_names()

    m = folium.Map(location=DEFAULT_CENTER, zoom_start=12, tiles="CartoDB positron")

    max_demand = max(demand_by_service.values()) if demand_by_service else 1

    for sid, stops_df in rs.groupby("service_id"):
        stops  = stops_df.sort_values("stop_order")["stop_id"].tolist()
        coords = [STOP_COORDS[s] for s in stops if s in STOP_COORDS]
        if len(coords) < 2:
            continue

        demand = demand_by_service.get(sid, 0)
        weight = 2 + 6 * (demand / max_demand)
        color  = SERVICE_COLORS.get(sid, "#888")

        folium.PolyLine(
            coords,
            color=color,
            weight=weight,
            tooltip=f"Service {sid} — {demand} passengers",
        ).add_to(m)

        # terminal markers
        for stop_id, label in [(stops[0], "Start"), (stops[-1], "End")]:
            if stop_id in STOP_COORDS:
                folium.CircleMarker(
                    STOP_COORDS[stop_id],
                    radius=5,
                    color=color,
                    fill=True,
                    tooltip=f"{label}: {names.get(stop_id, stop_id)}",
                ).add_to(m)

    return m
