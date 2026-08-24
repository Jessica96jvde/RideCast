import streamlit as st
import pandas as pd
from streamlit_folium import st_folium
from pathlib import Path
from utils.predict import find_services, get_time_slots, predict_demand
from utils.map_utils import public_map

PROJECT_ROOT = Path(__file__).resolve().parents[1]


@st.cache_data
def _stop_options():
    df = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "stop_master.csv")
    return {row["stop_name"]: row["stop_id"] for _, row in df.iterrows()}


def show():
    st.title("🚌 RideCast — Journey Planner")
    st.caption("Check predicted crowd levels before you travel.")

    stops = _stop_options()
    stop_names = list(stops.keys())

    col1, col2 = st.columns(2)
    with col1:
        from_name = st.selectbox("From Stop", stop_names, index=0)
    with col2:
        to_name = st.selectbox("To Stop", stop_names, index=1)

    from_id = stops[from_name]
    to_id   = stops[to_name]

    travel_date = st.date_input("Travel Date")

    # find matching services
    services = find_services(from_id, to_id)

    if not services:
        st.warning("No direct service found between these stops.")
        return

    service_id = st.selectbox("Select Service", services)

    time_slots = get_time_slots(service_id)
    time_slot  = st.selectbox("Departure Time", time_slots)

    if st.button("🔍 Predict Demand", type="primary"):
        with st.spinner("Running prediction..."):
            result = predict_demand(
                service_id, from_id, to_id,
                pd.Timestamp(travel_date), time_slot
            )

        if "error" in result:
            st.error(result["error"])
            return

        st.divider()
        st.subheader("Prediction Results")

        c1, c2, c3 = st.columns(3)
        c1.metric("Service", result["service_id"])
        c2.metric("Date", result["date"])
        c3.metric("Time Slot", result["time_slot"])

        st.divider()

        col_in, col_out = st.columns(2)

        with col_in:
            st.markdown("#### ⬅️ Inbound")
            st.metric("Passengers", result["inbound"])
            st.metric("Crowd Level", result["inbound_crowd"])
            st.progress(min(result["inbound_pct"], 1.0))

        with col_out:
            st.markdown("#### ➡️ Outbound")
            st.metric("Passengers", result["outbound"])
            st.metric("Crowd Level", result["outbound_crowd"])
            st.progress(min(result["outbound_pct"], 1.0))

        st.caption(f"Bus capacity: {result['capacity']} seats")

        # recommendation
        st.divider()
        in_pct  = result["inbound_pct"]
        out_pct = result["outbound_pct"]

        if in_pct < 0.5 and out_pct < 0.5:
            st.success("✅ Good time to travel — low crowd expected on both directions.")
        elif in_pct >= 0.8 or out_pct >= 0.8:
            st.error("⚠️ High crowd expected. Consider travelling 1–2 hours earlier or later.")
        else:
            st.warning("🟡 Moderate crowd expected. Arrive a few minutes early to get a seat.")

        # map
        st.divider()
        st.subheader("🗺️ Route Map")
        m = public_map(from_id, to_id, [service_id])
        st_folium(m, width=700, height=400)
