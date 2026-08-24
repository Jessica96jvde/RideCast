import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from datetime import timedelta
import streamlit as st

PROJECT_ROOT  = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_ROOT / "dataset" / "data" / "processed"
MODEL_FILE    = PROJECT_ROOT / "dataset" / "model" / "ridecast_lstm.keras"
SCALER_FILE   = PROCESSED_DIR / "scaler.pkl"
ENCODERS_FILE = PROCESSED_DIR / "encoders.pkl"
HISTORY_FILE  = PROJECT_ROOT / "dataset" / "data" / "historical_ridership.csv"


@st.cache_resource
def load_model():
    from tensorflow.keras.models import load_model as keras_load
    return keras_load(MODEL_FILE)


@st.cache_resource
def load_artifacts():
    with open(SCALER_FILE, "rb") as f:
        scaler = pickle.load(f)
    with open(ENCODERS_FILE, "rb") as f:
        encoders = pickle.load(f)
    return scaler, encoders


@st.cache_data
def load_history():
    return pd.read_csv(HISTORY_FILE, parse_dates=["date"])


def _inverse_passengers(scaler, scaled):
    """Unscale 2-column (inbound, outbound) array."""
    dummy = np.zeros((len(scaled), 16))
    dummy[:, 12:14] = scaled
    return scaler.inverse_transform(dummy)[:, 12:14]


def find_services(from_stop_id: str, to_stop_id: str) -> list[str]:
    """Return list of service_ids that serve both stops in order."""
    route_stops = pd.read_csv(
        PROJECT_ROOT / "dataset" / "data" / "route_stops.csv"
    )
    services = []
    for sid, grp in route_stops.groupby("service_id"):
        grp = grp.sort_values("stop_order")
        stops = grp["stop_id"].tolist()
        if from_stop_id in stops and to_stop_id in stops:
            if stops.index(from_stop_id) < stops.index(to_stop_id):
                services.append(sid)
    return services


def get_time_slots(service_id: str) -> list[str]:
    """Return departure times for a service."""
    tt = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "route_timetable.csv")
    times = (
        tt[tt["service_id"] == service_id]["departure_time"]
        .drop_duplicates()
        .sort_values()
        .tolist()
    )
    return times


def predict_demand(
    service_id: str,
    from_stop_id: str,
    to_stop_id: str,
    target_date: "pd.Timestamp",
    time_slot: str,
) -> dict:
    """
    Build a 7-day sequence ending the day before target_date
    for the given zone + time slot, run LSTM, return results.
    """
    model    = load_model()
    scaler, encoders = load_artifacts()
    df       = load_history()

    # ── find the zone that covers this stop pair ────────────────
    # The model was trained on zone segments, not individual stops.
    # Find the zone whose from_stop_id <= from_stop and to_stop_id >= to_stop
    # by looking up actual (service_id, from_stop_id, to_stop_id) combos
    # that exist in the historical data for this service.
    route_stops = pd.read_csv(
        PROJECT_ROOT / "dataset" / "data" / "route_stops.csv"
    )
    svc_stops = (
        route_stops[route_stops["service_id"] == service_id]
        .sort_values("stop_order")["stop_id"].tolist()
    )

    if from_stop_id not in svc_stops or to_stop_id not in svc_stops:
        return {"error": f"Stops not found on service {service_id}."}

    from_idx = svc_stops.index(from_stop_id)
    to_idx   = svc_stops.index(to_stop_id)

    # Get all unique (from_stop_id, to_stop_id) zone pairs in history for this service
    available_zones = (
        df[df["service_id"] == service_id][["from_stop_id", "to_stop_id"]]
        .drop_duplicates()
    )

    # Find the zone that best contains the requested stop pair
    best_from, best_to = None, None
    for _, row in available_zones.iterrows():
        z_from, z_to = row["from_stop_id"], row["to_stop_id"]
        if z_from in svc_stops and z_to in svc_stops:
            zf_idx = svc_stops.index(z_from)
            zt_idx = svc_stops.index(z_to)
            if zf_idx <= from_idx and zt_idx >= to_idx:
                best_from, best_to = z_from, z_to
                break

    if best_from is None:
        # fallback: use the zone whose from_stop is closest
        best_from = from_stop_id
        best_to   = to_stop_id

    time_map = encoders["time"]
    if time_slot not in time_map:
        time_slot = min(time_map.keys(), key=lambda t: abs(
            pd.to_datetime(t, format="%H:%M") -
            pd.to_datetime(time_slot, format="%H:%M")
        ))

    # ── pull last 7 days of history for this zone + slot ───────
    mask = (
        (df["service_id"]   == service_id) &
        (df["from_stop_id"] == best_from) &
        (df["to_stop_id"]   == best_to) &
        (df["time"]         == time_slot) &
        (df["date"]         < target_date)
    )
    zone_df = df[mask].sort_values("date").tail(7).copy()

    if len(zone_df) < 7:
        return {"error": "Not enough historical data for this zone/slot (need 7 days)."}

    # ── encode the 7-day window using encoded_ridership lookup ──
    enc_df = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "processed" / "encoded_ridership.csv")
    enc_service = encoders["service_id"].transform([service_id])[0]
    enc_time    = time_map[time_slot]

    # Look up encoded stop IDs from the encoded dataset
    enc_match = enc_df[
        (enc_df["service_id"] == enc_service) &
        (enc_df["time"]       == enc_time)
    ].head(1)

    if enc_match.empty:
        return {"error": "Could not find encoded values for this service/time."}

    enc_from = enc_match["from_stop_id"].iloc[0]
    enc_to   = enc_match["to_stop_id"].iloc[0]

    zone_df["holiday_name"] = zone_df["holiday_name"].fillna("")
    zone_df["service_id"]   = enc_service
    zone_df["from_stop_id"] = enc_from
    zone_df["to_stop_id"]   = enc_to
    zone_df["day_of_week"]  = encoders["day_of_week"].transform(zone_df["day_of_week"])
    zone_df["holiday"]      = zone_df["holiday"].map({"Yes": 1, "No": 0})
    zone_df["time"]         = enc_time
    zone_df["month"]        = zone_df["date"].dt.month
    zone_df["day_of_year"]  = zone_df["date"].dt.dayofyear
    zone_df = zone_df.drop(columns=["date", "holiday_name"])

    # column order must match scaler
    col_order = [
        "time", "service_id", "from_stop_id", "to_stop_id",
        "temperature_c", "humidity", "rain_mm", "weather_code",
        "holiday", "day_of_week",
        "inbound_scheduled_trips_per_day", "outbound_scheduled_trips_per_day",
        "inbound_passenger_count", "outbound_passenger_count",
        "month", "day_of_year",
    ]
    zone_df = zone_df[col_order]

    scaled = scaler.transform(zone_df.values)
    X = scaled[np.newaxis, :, :]          # shape (1, 7, 16)

    # ── predict ─────────────────────────────────────────────────
    y_scaled = model.predict(X, verbose=0)          # (1, 2)
    y_real   = _inverse_passengers(scaler, y_scaled)[0]

    inbound  = max(0, round(float(y_real[0])))
    outbound = max(0, round(float(y_real[1])))
    capacity = 50

    def crowd_level(count):
        pct = count / capacity
        if pct < 0.5:  return "Low 🟢",  pct
        if pct < 0.8:  return "Moderate 🟡", pct
        return "High 🔴", pct

    in_label,  in_pct  = crowd_level(inbound)
    out_label, out_pct = crowd_level(outbound)

    return {
        "service_id":      service_id,
        "from_stop_id":    from_stop_id,
        "to_stop_id":      to_stop_id,
        "date":            target_date.strftime("%Y-%m-%d"),
        "time_slot":       time_slot,
        "inbound":         inbound,
        "outbound":        outbound,
        "inbound_crowd":   in_label,
        "outbound_crowd":  out_label,
        "inbound_pct":     in_pct,
        "outbound_pct":    out_pct,
        "capacity":        capacity,
    }
