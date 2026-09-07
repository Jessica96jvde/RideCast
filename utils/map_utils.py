import folium
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Coimbatore city centre
DEFAULT_CENTER = [11.0168, 76.9558]

STOP_COORDS = {
    # ── Sathyamangalam Rd / Avinashi Rd Arterial Corridor (S45, S57) ──
    "ST001": [11.0168, 76.9672],  # Gandhipuram Town Bus Stand
    "ST002": [10.9904, 76.9608],  # Ukkadam Bus Terminal
    "ST003": [10.9942, 76.9615],  # Prakasam / Oppanakara St
    "ST004": [10.9965, 76.9625],  # Raja Street
    "ST005": [10.9982, 76.9642],  # Manikoondu / Town Hall
    "ST006": [10.9968, 76.9662],  # Five Corner
    "ST007": [10.9978, 76.9685],  # Coimbatore Junction Railway Station
    "ST008": [11.0015, 76.9688],  # Collector Office / State Bank Rd
    "ST009": [11.0048, 76.9698],  # D.S.P. Office / Huzur Rd
    "ST010": [11.0078, 76.9705],  # Oriental Insurance / Arts College
    "ST011": [11.0098, 76.9702],  # C.S.I. Immanuel Church / Avinashi Rd
    "ST012": [11.0118, 76.9690],  # C.S.I. School / Dr Nanjappa Rd
    "ST013": [11.0138, 76.9682],  # V.O.C. Park / Dr Nanjappa Rd
    "ST014": [11.0152, 76.9678],  # Park Gate / Dr Nanjappa Rd
    "ST015": [11.0168, 76.9672],  # Gandhipuram Central
    "ST016": [11.0210, 76.9695],  # G.P. Hospital / Sathyamangalam Rd
    "ST017": [11.0250, 76.9715],  # Lakshmipuram
    "ST018": [11.0290, 76.9735],  # Tex Tool / Velan Theatre
    "ST019": [11.0330, 76.9755],  # Ganapathy Bus Stop
    "ST020": [11.0370, 76.9775],  # Surya Hospital
    "ST021": [11.0410, 76.9795],  # C.M.S. School
    "ST022": [11.0450, 76.9815],  # Athipalayam Junction
    "ST023": [11.0490, 76.9835],  # Bharathi Nagar
    "ST024": [11.0530, 76.9855],  # Ramakrishna Mill
    "ST025": [11.0570, 76.9875],  # L.G.B. Nagar
    "ST026": [11.0610, 76.9895],  # Sivanandha Mills
    "ST027": [11.0650, 76.9915],  # Anandha Kumar Mills
    "ST028": [11.0690, 76.9935],  # S.R.P. Mills
    "ST029": [11.0730, 76.9955],  # Amman Kovil
    "ST030": [11.0770, 76.9975],  # G.K.S. Nagar
    "ST031": [11.0810, 76.9995],  # Kalapatti Pirivu
    "ST032": [11.0850, 77.0015],  # Saravanampatti Junction
    "ST033": [11.0900, 77.0040],  # Viswasapuram
    "ST034": [11.0950, 77.0065],  # Karattumedu
    "ST035": [11.1000, 77.0090],  # P.P.G. IT
    "ST036": [11.1050, 77.0115],  # S.N.S. College / Valiyampalayam
    "ST037": [11.1100, 77.0140],  # S.N.S. College
    "ST038": [11.1150, 77.0165],  # Sri Village Nagar
    "ST039": [11.1205, 77.0195],  # Kurumbapalayam
    "ST040": [11.1275, 77.0230],  # Kodia Park
    "ST041": [11.1345, 77.0265],  # Info Institute of Engineering
    "ST042": [11.1415, 77.0305],  # Kovilpalayam
    "ST043": [11.1465, 77.0335],  # S.S. Kulam
    "ST044": [11.1505, 77.0360],  # V.J. Nagar
    "ST045": [11.1545, 77.0385],  # Kottaipalayam
    "ST046": [11.1575, 77.0405],  # C.S.I. Colony
    "ST047": [11.1605, 77.0425],  # Agrahara Samakulam
    "ST048": [11.1635, 77.0445],  # Thottipalayam
    "ST049": [11.1665, 77.0465],  # Vellamadai / Saibaba Stand
    "ST050": [10.9855, 76.9630],  # Christ The King Church
    "ST051": [10.9982, 76.9642],  # Town Hall Central

    # ── Pollachi Rd / Eachanari / Kinathukadavu Corridor (S33A) ──
    "ST052": [10.9790, 76.9655],  # Karumbukadai
    "ST053": [10.9740, 76.9670],  # Athupalam
    "ST054": [10.9680, 76.9690],  # Kurichi Pirivu
    "ST055": [10.9630, 76.9705],  # Kurichi Housing Unit
    "ST056": [10.9580, 76.9720],  # Iyer Hospital
    "ST057": [10.9520, 76.9735],  # Sundarapuram
    "ST058": [10.9470, 76.9748],  # Gandhi Nagar
    "ST059": [10.9420, 76.9760],  # L.I.C. Colony
    "ST060": [10.9370, 76.9772],  # Sidco Industrial Estate
    "ST061": [10.9320, 76.9785],  # K.P.M. Matriculation School
    "ST062": [10.9270, 76.9800],  # Rathinam College
    "ST063": [10.9215, 76.9820],  # Eachanari Temple
    "ST064": [10.9160, 76.9840],  # Karpagam University
    "ST065": [10.9100, 76.9860],  # Ganesh Nagar
    "ST066": [10.9040, 76.9880],  # Malumichampatti Junction
    "ST067": [10.8980, 76.9900],  # Malumichampatti
    "ST068": [10.8920, 76.9920],  # Hindustan College
    "ST069": [10.8850, 76.9940],  # Othakal Mandapam
    "ST070": [10.8780, 76.9960],  # Karpagam Medical College
    "ST071": [10.8710, 76.9980],  # Premier Mills
    "ST072": [10.8640, 77.0000],  # Polytechnic College
    "ST073": [10.8570, 77.0020],  # Mailrapalayam
    "ST074": [10.8500, 77.0040],  # Kinathukadavu Check Post
    "ST075": [10.8430, 77.0060],  # Arulmigu Velayutha Swamy Temple
    "ST076": [10.8350, 77.0080],  # Kinathukadavu Bus Stand

    # ── Palakkad Rd / Kuniyamuthur / Madukkarai / KG Chavadi (S48) ──
    "ST077": [10.9650, 76.9520],  # Kuniyamuthur High School
    "ST078": [10.9600, 76.9490],  # Kuniyamuthur
    "ST079": [10.9550, 76.9460],  # Nehru College
    "ST080": [10.9500, 76.9430],  # Edayarpalayam Pirivu
    "ST081": [10.9450, 76.9400],  # Kuniyamuthur Police Station
    "ST082": [10.9400, 76.9370],  # B.K. Pudur
    "ST083": [10.9350, 76.9340],  # Kovaipudur Pirivu
    "ST084": [10.9280, 76.9300],  # Milekal
    "ST085": [10.9200, 76.9250],  # Madukkarai Police Station
    "ST086": [10.9120, 76.9200],  # Madukkarai Union Office
    "ST087": [10.9040, 76.9150],  # Marappalam
    "ST088": [10.8960, 76.9100],  # Chettipalayam Pirivu
    "ST089": [10.8880, 76.9050],  # Indian Bank
    "ST090": [10.8800, 76.9000],  # Thirumalayampalayam Pirivu
    "ST091": [10.8700, 76.8920],  # K.G. Chavadi
    "ST092": [10.8600, 76.8850],  # Pichanur
    "ST093": [10.8500, 76.8780],  # Vanthavalam
}

SERVICE_COLORS = {
    "S45":  "#BF5B04",
    "S57":  "#F28705",
    "S33A": "#344A55",
    "S48":  "#F29F05",
    "S52":  "#38bdf8",
    "S95":  "#10b981",
    "S1A":  "#8b5cf6",
    "S109": "#ec4899",
    "S3B":  "#f97316",
    "S25":  "#06b6d4",
    "S91":  "#14b8a6",
    "S4B":  "#eab308",
    "S13B": "#a855f7",
    "S75":  "#6366f1",
    "S64":  "#ef4444",
    "S1":   "#84cc16",
}


def _stop_names() -> dict:
    df = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "stop_master.csv")
    return dict(zip(df["stop_id"], df["stop_name"]))


def _route_stops() -> pd.DataFrame:
    return pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "route_stops.csv")


def public_map(from_stop: str, to_stop: str, services: list[str]) -> folium.Map:
    names = _stop_names()
    rs = _route_stops()

    all_coords = []
    
    if from_stop in STOP_COORDS and to_stop in STOP_COORDS:
        c1, c2 = STOP_COORDS[from_stop], STOP_COORDS[to_stop]
        mid_center = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2]
    else:
        mid_center = DEFAULT_CENTER

    m = folium.Map(location=mid_center, zoom_start=13, tiles="CartoDB positron")

    for sid in services:
        color = SERVICE_COLORS.get(sid, "#BF5B04")
        stops = rs[rs["service_id"] == sid].sort_values("stop_order")["stop_id"].tolist()

        if from_stop not in stops or to_stop not in stops:
            continue

        i_from = stops.index(from_stop)
        i_to = stops.index(to_stop)
        segment = stops[i_from: i_to + 1]

        coords = [STOP_COORDS[s] for s in segment if s in STOP_COORDS]
        if len(coords) < 2:
            continue

        all_coords.extend(coords)

        # Route corridor line
        folium.PolyLine(
            coords,
            color=color,
            weight=6,
            opacity=0.85,
            tooltip=f"Service {sid} Transit Corridor"
        ).add_to(m)

        # Intermediate stop dots
        for s in segment[1:-1]:
            if s in STOP_COORDS:
                folium.CircleMarker(
                    STOP_COORDS[s],
                    radius=4,
                    color="#344A55",
                    fill=True,
                    fill_color="#C4E5F2",
                    fill_opacity=0.9,
                    tooltip=f"Stop: {names.get(s, s)}"
                ).add_to(m)

    # Boarding and Alighting Markers
    if from_stop in STOP_COORDS:
        folium.Marker(
            STOP_COORDS[from_stop],
            tooltip=f"Boarding Point: {names.get(from_stop, from_stop)}",
            popup=f"<b>FROM:</b> {names.get(from_stop, from_stop)}",
            icon=folium.Icon(color="green", icon="play")
        ).add_to(m)

    if to_stop in STOP_COORDS:
        folium.Marker(
            STOP_COORDS[to_stop],
            tooltip=f"Alighting Point: {names.get(to_stop, to_stop)}",
            popup=f"<b>TO:</b> {names.get(to_stop, to_stop)}",
            icon=folium.Icon(color="red", icon="stop")
        ).add_to(m)

    # Auto-fit bounds
    if all_coords:
        lats = [p[0] for p in all_coords]
        lons = [p[1] for p in all_coords]
        if min(lats) != max(lats) and min(lons) != max(lons):
            m.fit_bounds([[min(lats), min(lons)], [max(lats), max(lons)]], padding=(30, 30))

    return m


def authority_route_map(service_id: str) -> folium.Map:
    names = _stop_names()
    rs = _route_stops()

    stops_df = rs[rs["service_id"] == service_id].sort_values("stop_order")
    stops = stops_df["stop_id"].tolist()
    coords = [STOP_COORDS[s] for s in stops if s in STOP_COORDS]

    if not coords:
        return folium.Map(location=DEFAULT_CENTER, zoom_start=12, tiles="CartoDB positron")

    mid_lat = sum(c[0] for c in coords) / len(coords)
    mid_lon = sum(c[1] for c in coords) / len(coords)

    m = folium.Map(location=[mid_lat, mid_lon], zoom_start=12, tiles="CartoDB positron")
    color = SERVICE_COLORS.get(service_id, "#344A55")

    folium.PolyLine(coords, color=color, weight=5, opacity=0.9, tooltip=f"Route {service_id}").add_to(m)

    for idx, s in enumerate(stops):
        if s in STOP_COORDS:
            is_term = (idx == 0 or idx == len(stops) - 1)
            radius = 6 if is_term else 3
            folium.CircleMarker(
                STOP_COORDS[s],
                radius=radius,
                color=color,
                fill=True,
                fill_color="#FEF8E7" if is_term else "#C4E5F2",
                fill_opacity=1.0,
                tooltip=f"Stop {idx+1}: {names.get(s, s)}"
            ).add_to(m)

    folium.Marker(
        coords[0],
        tooltip=f"Start: {names.get(stops[0], stops[0])}",
        icon=folium.Icon(color="green", icon="play")
    ).add_to(m)

    folium.Marker(
        coords[-1],
        tooltip=f"End: {names.get(stops[-1], stops[-1])}",
        icon=folium.Icon(color="red", icon="flag")
    ).add_to(m)

    lats = [c[0] for c in coords]
    lons = [c[1] for c in coords]
    if min(lats) != max(lats) and min(lons) != max(lons):
        m.fit_bounds([[min(lats), min(lons)], [max(lats), max(lons)]], padding=(20, 20))

    return m


def authority_overview_map(demand_by_service: dict) -> folium.Map:
    rs = _route_stops()
    names = _stop_names()

    m = folium.Map(location=DEFAULT_CENTER, zoom_start=12, tiles="CartoDB positron")
    max_demand = max(demand_by_service.values()) if demand_by_service else 1

    for sid, stops_df in rs.groupby("service_id"):
        stops = stops_df.sort_values("stop_order")["stop_id"].tolist()
        coords = [STOP_COORDS[s] for s in stops if s in STOP_COORDS]
        if len(coords) < 2:
            continue

        demand = demand_by_service.get(sid, 0)
        weight = 3 + 6 * (demand / max_demand)
        color = SERVICE_COLORS.get(sid, "#344A55")

        folium.PolyLine(
            coords,
            color=color,
            weight=weight,
            opacity=0.85,
            tooltip=f"Service {sid}: {demand:,} passengers"
        ).add_to(m)

        for stop_id, label in [(stops[0], "Origin"), (stops[-1], "Destination")]:
            if stop_id in STOP_COORDS:
                folium.CircleMarker(
                    STOP_COORDS[stop_id],
                    radius=5,
                    color=color,
                    fill=True,
                    fill_color="#FEF8E7",
                    tooltip=f"{label}: {names.get(stop_id, stop_id)}"
                ).add_to(m)

    return m
