import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from streamlit_folium import st_folium
from pathlib import Path
from utils.map_utils import authority_map
from utils.pdf import generate_summary_pdf, generate_route_pdf

PROJECT_ROOT = Path(__file__).resolve().parents[1]
HISTORY_FILE = PROJECT_ROOT / "dataset" / "data" / "historical_ridership.csv"


@st.cache_data
def load_data():
    df = pd.read_csv(HISTORY_FILE, parse_dates=["date"])
    df["total_passengers"] = df["inbound_passenger_count"] + df["outbound_passenger_count"]
    df["hour"] = pd.to_datetime(df["time"], format="%H:%M").dt.hour
    df["is_peak"] = df["hour"].apply(lambda h: "Peak" if (7 <= h <= 10 or 16 <= h <= 20) else "Off-Peak")
    return df


def show():
    st.title("📊 RideCast — Authority Dashboard")

    df = load_data()

    # ── sidebar filters ──────────────────────────────────────────
    with st.sidebar:
        st.header("Filters")
        services  = ["All"] + sorted(df["service_id"].unique().tolist())
        sel_svc   = st.selectbox("Service", services)
        date_from = st.date_input("From Date", df["date"].min())
        date_to   = st.date_input("To Date",   df["date"].max())
        st.divider()
        st.button("🚪 Logout", on_click=_logout)

    filtered = df[
        (df["date"] >= pd.Timestamp(date_from)) &
        (df["date"] <= pd.Timestamp(date_to))
    ]
    if sel_svc != "All":
        filtered = filtered[filtered["service_id"] == sel_svc]

    # ── KPI row ──────────────────────────────────────────────────
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total Passengers",  f"{int(filtered['total_passengers'].sum()):,}")
    k2.metric("Avg Daily Demand",  f"{int(filtered.groupby('date')['total_passengers'].sum().mean()):,}")
    k3.metric("Peak Hour Demand",  f"{int(filtered[filtered['is_peak']=='Peak']['total_passengers'].sum()):,}")
    k4.metric("Services Covered",  filtered["service_id"].nunique())

    st.divider()

    # ── Chart 1: Demand by Route ─────────────────────────────────
    st.subheader("Demand by Route")
    route_demand = (
        filtered.groupby("service_id")["total_passengers"]
        .sum().reset_index()
        .rename(columns={"service_id": "Service", "total_passengers": "Passengers"})
    )
    fig1 = px.bar(route_demand, x="Service", y="Passengers", color="Service",
                  color_discrete_map={"S45": "#e74c3c", "S57": "#3498db",
                                      "S33A": "#2ecc71", "S48": "#f39c12"})
    fig1.update_layout(showlegend=False, height=300)
    st.plotly_chart(fig1, use_container_width=True)

    # ── Chart 2: Demand by Time Slot ─────────────────────────────
    st.subheader("Demand by Time Slot")
    slot_demand = (
        filtered.groupby("time")["total_passengers"]
        .sum().reset_index()
        .rename(columns={"time": "Time Slot", "total_passengers": "Passengers"})
        .sort_values("Time Slot")
    )
    fig2 = px.bar(slot_demand, x="Time Slot", y="Passengers", color_discrete_sequence=["#3498db"])
    fig2.update_layout(height=300)
    st.plotly_chart(fig2, use_container_width=True)

    # ── Chart 3: Daily/Weekly Trend ──────────────────────────────
    st.subheader("Daily Demand Trend")
    daily = (
        filtered.groupby("date")["total_passengers"]
        .sum().reset_index()
        .rename(columns={"date": "Date", "total_passengers": "Passengers"})
    )
    fig3 = px.line(daily, x="Date", y="Passengers", color_discrete_sequence=["#2ecc71"])
    fig3.update_layout(height=300)
    st.plotly_chart(fig3, use_container_width=True)

    col_left, col_right = st.columns(2)

    # ── Chart 4: Top High-Demand Routes ──────────────────────────
    with col_left:
        st.subheader("Top High-Demand Zones")
        zone_demand = (
            filtered.groupby(["service_id", "from_stop_id", "to_stop_id"])["total_passengers"]
            .sum().reset_index()
        )
        zone_demand["Zone"] = (
            zone_demand["service_id"] + ": " +
            zone_demand["from_stop_id"] + "→" +
            zone_demand["to_stop_id"]
        )
        top10 = zone_demand.nlargest(10, "total_passengers")
        fig4 = px.bar(top10, x="total_passengers", y="Zone", orientation="h",
                      color_discrete_sequence=["#e74c3c"])
        fig4.update_layout(height=350, yaxis={"categoryorder": "total ascending"})
        st.plotly_chart(fig4, use_container_width=True)

    # ── Chart 5: Peak vs Off-Peak ─────────────────────────────────
    with col_right:
        st.subheader("Peak vs Off-Peak Demand")
        peak_data = (
            filtered.groupby(["service_id", "is_peak"])["total_passengers"]
            .sum().reset_index()
        )
        fig5 = px.bar(peak_data, x="service_id", y="total_passengers",
                      color="is_peak", barmode="group",
                      color_discrete_map={"Peak": "#e74c3c", "Off-Peak": "#95a5a6"},
                      labels={"service_id": "Service", "total_passengers": "Passengers",
                               "is_peak": "Period"})
        fig5.update_layout(height=350)
        st.plotly_chart(fig5, use_container_width=True)

    # ── Chart 6: Recommended Bus Allocation ──────────────────────
    st.subheader("Recommended Bus Allocation by Route")
    BUS_CAPACITY = 50
    alloc = route_demand.copy()
    alloc["Buses Needed"] = (alloc["Passengers"] / (BUS_CAPACITY * len(daily))).apply(
        lambda x: max(1, round(x))
    )
    fig6 = px.bar(alloc, x="Service", y="Buses Needed", color="Service",
                  color_discrete_map={"S45": "#e74c3c", "S57": "#3498db",
                                      "S33A": "#2ecc71", "S48": "#f39c12"},
                  text="Buses Needed")
    fig6.update_layout(showlegend=False, height=300)
    st.plotly_chart(fig6, use_container_width=True)

    # ── Map ───────────────────────────────────────────────────────
    st.divider()
    st.subheader("🗺️ Route Demand Map")
    demand_by_svc = dict(zip(route_demand["Service"], route_demand["Passengers"]))
    m = authority_map(demand_by_svc)
    st_folium(m, width=900, height=450)

    # ── PDF Export ────────────────────────────────────────────────
    st.divider()
    st.subheader("📄 Export Reports")

    col_pdf1, col_pdf2 = st.columns(2)

    with col_pdf1:
        if st.button("Download Full Summary PDF"):
            pdf_bytes = generate_summary_pdf(filtered, route_demand, alloc)
            st.download_button(
                "📥 Save Summary PDF",
                data=pdf_bytes,
                file_name="ridecast_summary.pdf",
                mime="application/pdf",
            )

    with col_pdf2:
        route_for_pdf = st.selectbox("Select Route for Per-Route PDF", route_demand["Service"].tolist())
        if st.button("Download Route PDF"):
            route_df  = filtered[filtered["service_id"] == route_for_pdf]
            pdf_bytes = generate_route_pdf(route_for_pdf, route_df)
            st.download_button(
                f"📥 Save {route_for_pdf} PDF",
                data=pdf_bytes,
                file_name=f"ridecast_{route_for_pdf}.pdf",
                mime="application/pdf",
            )


def _logout():
    st.session_state["logged_in"] = False
    st.session_state["username"]  = ""
