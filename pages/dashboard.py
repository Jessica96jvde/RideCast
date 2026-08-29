import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from streamlit_folium import st_folium
from datetime import date, datetime
from pathlib import Path

from auth.db import get_allocation_history, save_allocation
from utils.predict import predict_all_routes_authority, predict_route_authority
from utils.allocation_engine import get_fleet_df, recommend_buses, execute_allocation
from utils.map_utils import authority_route_map, authority_overview_map
from utils.pdf import generate_authority_comprehensive_pdf

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _inject_authority_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    /* Global Dark Canvas with Subtle Frosted Glow (Helios Style) */
    html, body,
    [data-testid="stApp"],
    [data-testid="stAppViewContainer"] {
        background-color: #0f1015 !important;
        background-image: 
            radial-gradient(at 0% 0%, rgba(52, 74, 85, 0.25) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(242, 135, 5, 0.1) 0px, transparent 50%) !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
        color: #F2FBFC !important;
    }

    #MainMenu, footer, header { visibility: hidden !important; }

    /* Hide Collapse Controls */
    [data-testid="stSidebarCollapseButton"],
    [data-testid="collapsedControl"],
    [data-testid="stSidebarHeader"] button {
        display: none !important;
        visibility: hidden !important;
    }

    /* ── PERMANENTLY VISIBLE & FIXED SIDEBAR ── */
    section[data-testid="stSidebar"],
    [data-testid="stSidebar"],
    [data-testid="stSidebar"][aria-expanded="false"],
    [data-testid="stSidebar"][aria-expanded="true"],
    [data-testid="stSidebar"] > div {
        display: block !important;
        visibility: visible !important;
        transform: none !important;
        margin-left: 0 !important;
        left: 0 !important;
        top: 0 !important;
        position: relative !important;
        min-width: 260px !important;
        max-width: 270px !important;
        width: 260px !important;
        background-color: #14161f !important;
        border-right: 1px solid rgba(196, 229, 242, 0.15) !important;
        height: 100vh !important;
        overflow: hidden !important;
        z-index: 100 !important;
        transition: none !important;
    }

    /* Ensure flex layout side-by-side */
    [data-testid="stAppViewContainer"] {
        display: flex !important;
        flex-direction: row !important;
        overflow-x: hidden !important;
    }

    [data-testid="stMain"] {
        flex: 1 !important;
        min-width: 0 !important;
        overflow-y: auto !important;
    }

    [data-testid="stSidebarUserContent"] {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        height: 100% !important;
        min-height: 100vh !important;
        overflow-y: auto !important;
        padding: 1.8rem 1.1rem !important;
    }
    [data-testid="stSidebar"] * { color: #F2FBFC !important; }

    .auth-brand {
        font-size: 1.65rem;
        font-weight: 900;
        letter-spacing: 3px;
        color: #C4E5F2 !important;
        text-shadow: 0 0 16px rgba(196, 229, 242, 0.4);
        padding: 0.2rem 0 0.1rem 0;
    }

    /* Officer Profile Card */
    .profile-card {
        background: linear-gradient(135deg, rgba(26, 28, 38, 0.95), rgba(52, 74, 85, 0.85)) !important;
        border-radius: 16px;
        padding: 1rem 1.1rem;
        margin: 0.8rem 0 1.2rem 0;
        border: 1px solid rgba(242, 159, 5, 0.35);
        box-shadow: 0 6px 18px rgba(0,0,0,0.3);
    }
    .profile-name {
        font-size: 0.95rem;
        font-weight: 800;
        color: #F2FBFC !important;
    }
    .profile-role {
        font-size: 0.72rem;
        color: #F29F05 !important;
        font-weight: 600;
    }

    /* Content Cards */
    .dashboard-card {
        background: rgba(24, 26, 36, 0.85) !important;
        backdrop-filter: blur(16px) !important;
        border-radius: 20px !important;
        padding: 1.8rem 2.2rem !important;
        border: 1px solid rgba(196, 229, 242, 0.12) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35) !important;
        margin-bottom: 1.6rem !important;
    }
    .card-title {
        font-size: 1.2rem;
        font-weight: 800;
        color: #F2FBFC;
        letter-spacing: 0.5px;
        margin-bottom: 1rem;
    }

    /* Metric Badges & Tiles */
    .metric-tile {
        background: #1e202d !important;
        border-radius: 14px;
        padding: 1.1rem 1.3rem;
        border-left: 4px solid #F29F05;
        border: 1px solid rgba(196, 229, 242, 0.1);
        border-left-width: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .metric-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: #A6998A;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .metric-val {
        font-size: 1.6rem;
        font-weight: 900;
        color: #F2FBFC;
        margin-top: 0.3rem;
    }

    /* Smart Allocation Highlight Box */
    .alloc-box {
        background: linear-gradient(135deg, rgba(35, 17, 0, 0.95), rgba(26, 28, 38, 0.95)) !important;
        border: 1px solid rgba(242, 135, 5, 0.6) !important;
        border-radius: 18px;
        padding: 1.6rem 1.8rem;
        margin: 1.4rem 0;
        box-shadow: 0 6px 25px rgba(242, 135, 5, 0.15);
    }
    .alloc-title {
        color: #F29F05;
        font-size: 1.25rem;
        font-weight: 900;
        margin-bottom: 0.5rem;
    }

    /* Table styling */
    .status-badge {
        display: inline-block;
        padding: 0.22rem 0.7rem;
        border-radius: 15px;
        font-size: 0.75rem;
        font-weight: 800;
    }
    .status-idle { background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.4); }
    .status-alloc { background: rgba(191, 91, 4, 0.25); color: #f87171; border: 1px solid rgba(191, 91, 4, 0.5); }

    /* Button Styling */
    .stButton > button[kind="primary"] {
        background: linear-gradient(90deg, #F29F05, #F28705) !important;
        color: #231100 !important;
        font-weight: 800 !important;
        font-size: 0.92rem !important;
        border-radius: 12px !important;
        border: none !important;
        padding: 0.65rem 1.4rem !important;
        box-shadow: 0 4px 14px rgba(242, 159, 5, 0.3) !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button[kind="primary"]:hover {
        background: linear-gradient(90deg, #F28705, #BF5B04) !important;
        color: #FEF8E7 !important;
        transform: translateY(-2px) !important;
    }
    .stButton > button[kind="secondary"] {
        background: #1e202d !important;
        border: 1px solid rgba(196, 229, 242, 0.15) !important;
        border-radius: 12px !important;
        color: #C4E5F2 !important;
        font-weight: 700 !important;
        font-size: 0.85rem !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button[kind="secondary"]:hover {
        background: #282a38 !important;
        border-color: #F29F05 !important;
        color: #F29F05 !important;
    }
    </style>
    """, unsafe_allow_html=True)


def show():
    _inject_authority_css()

    # Session State
    if "auth_tab" not in st.session_state:
        st.session_state["auth_tab"] = "Profile"
    if "forecast_date" not in st.session_state:
        st.session_state["forecast_date"] = date.today()
    if "active_forecasts" not in st.session_state:
        st.session_state["active_forecasts"] = None
    if "selected_route_tab" not in st.session_state:
        st.session_state["selected_route_tab"] = "S45"
    if "alloc_confirmed_msg" not in st.session_state:
        st.session_state["alloc_confirmed_msg"] = None

    # -- SIDEBAR --------------------------------------------------
    with st.sidebar:
        st.markdown('<div class="auth-brand">RIDECAST</div>', unsafe_allow_html=True)
        st.markdown('<div style="font-size:0.72rem;color:#A6998A;margin-bottom:0.5rem;letter-spacing:1px;text-transform:uppercase;">Authority Operations</div>', unsafe_allow_html=True)

        # Profile Section
        st.markdown("""
        <div class="profile-card">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-size:1.8rem;">👮</div>
                <div>
                    <div class="profile-name">Officer Rajesh Kumar</div>
                    <div class="profile-role">Senior Transport Controller</div>
                    <div style="font-size:0.68rem;color:#C4E5F2;">ID: CMD-TN-2024-884</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<div style='font-size:0.72rem;font-weight:800;color:#C4E5F2;margin-bottom:0.4rem;letter-spacing:1.5px;text-transform:uppercase;'>Navigation</div>", unsafe_allow_html=True)

        tabs = ["Profile", "Forecast", "Idle Buses", "Generate Report"]
        for tab in tabs:
            is_active = (st.session_state["auth_tab"] == tab)
            btn_label = f"📌 {tab}" if is_active else f"   {tab}"
            btn_type = "primary" if is_active else "secondary"
            if st.button(btn_label, key=f"nav_tab_{tab}", use_container_width=True, type=btn_type):
                st.session_state["auth_tab"] = tab
                st.session_state["alloc_confirmed_msg"] = None
                st.rerun()

        # If Forecast tab is active and forecasts are generated, show 4 route links in sidebar
        if st.session_state["auth_tab"] == "Forecast" and st.session_state["active_forecasts"]:
            st.markdown("<hr style='border:0;height:1px;background:rgba(196, 229, 242, 0.15);margin:0.8rem 0;'>", unsafe_allow_html=True)
            st.markdown("<div style='font-size:0.72rem;font-weight:800;color:#C4E5F2;margin-bottom:0.4rem;letter-spacing:1px;text-transform:uppercase;'>Major Routes</div>", unsafe_allow_html=True)
            for r_sid in ["S45", "S57", "S33A", "S48"]:
                r_info = st.session_state["active_forecasts"].get(r_sid, {})
                c_icon = r_info.get("crowd_icon", "🚌")
                is_r_sel = (st.session_state["selected_route_tab"] == r_sid)
                r_btn_label = f"{c_icon} Service {r_sid}"
                if st.button(r_btn_label, key=f"sb_route_{r_sid}", use_container_width=True):
                    st.session_state["selected_route_tab"] = r_sid
                    st.rerun()

        st.markdown("<hr style='border:0;height:1px;background:rgba(196, 229, 242, 0.15);margin:1.5rem 0 0.8rem 0;'>", unsafe_allow_html=True)
        if st.button("🚪 Logout", key="btn_logout", use_container_width=True):
            st.session_state["logged_in"] = False
            st.session_state["view"] = "public"
            st.rerun()

    # ------------------------------------------------------------
    # TAB 1: PROFILE PAGE (Default on login)
    # ------------------------------------------------------------
    if st.session_state["auth_tab"] == "Profile":
        st.markdown('<div style="font-size:1.85rem;font-weight:900;color:#F2FBFC;letter-spacing:2px;text-transform:uppercase;margin-bottom:0.25rem;">🏛️ Authority Command Center</div>', unsafe_allow_html=True)
        st.markdown('<div style="font-size:0.88rem;color:#A6998A;margin-bottom:1.6rem;">Coimbatore Metropolitan Transit Fleet & Demand Control Station</div>', unsafe_allow_html=True)

        # Authority Details Card
        st.markdown("""
        <div class="dashboard-card">
            <div class="card-title">👤 Officer Profile & Command Station</div>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:1.2rem;margin-top:0.6rem;">
                <div class="metric-tile">
                    <div class="metric-label">Authority Officer</div>
                    <div style="font-weight:800;color:#F2FBFC;font-size:1.05rem;margin-top:4px;">Rajesh Kumar</div>
                </div>
                <div class="metric-tile">
                    <div class="metric-label">Authority ID</div>
                    <div style="font-weight:800;color:#F2FBFC;font-size:1.05rem;margin-top:4px;">CMD-TN-2024-884</div>
                </div>
                <div class="metric-tile">
                    <div class="metric-label">Role / Division</div>
                    <div style="font-weight:800;color:#F29F05;font-size:1.05rem;margin-top:4px;">Metropolitan Fleet Controller</div>
                </div>
                <div class="metric-tile">
                    <div class="metric-label">Command Station</div>
                    <div style="font-weight:800;color:#C4E5F2;font-size:1.05rem;margin-top:4px;">Gandhipuram Central Hub</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Historical Graph: Extra Bus Allocations Across All Major Routes Over Time
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown('<div class="card-title">📊 Extra Bus Allocations Across All Major Routes Over Time</div>', unsafe_allow_html=True)

        alloc_df = get_allocation_history()
        if not alloc_df.empty:
            chart_df = alloc_df.groupby(["date", "service_id"]).size().reset_index(name="Allocations")
            chart_df = chart_df.sort_values("date")

            fig = px.bar(
                chart_df,
                x="date",
                y="Allocations",
                color="service_id",
                barmode="group",
                color_discrete_map={"S45": "#BF5B04", "S57": "#F28705", "S33A": "#C4E5F2", "S48": "#F29F05"},
                labels={"date": "Date", "Allocations": "Additional Buses Allocated", "service_id": "Route"}
            )
            fig.update_layout(
                plot_bgcolor="#181a24",
                paper_bgcolor="#181a24",
                font_color="#F2FBFC",
                height=320,
                margin=dict(l=20, r=20, t=20, b=20),
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No historical allocation records found.")
        st.markdown('</div>', unsafe_allow_html=True)

        # Bus Allocation History Table
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown('<div class="card-title">📋 Bus Allocation History Log</div>', unsafe_allow_html=True)

        if not alloc_df.empty:
            display_cols = ["date", "service_id", "route_name", "bus_id", "bus_number", "source_depot", "distance_km", "reason", "allocated_by"]
            renamed_df = alloc_df[display_cols].rename(columns={
                "date": "Date",
                "service_id": "Route ID",
                "route_name": "Route Name",
                "bus_id": "Bus ID",
                "bus_number": "Bus Number",
                "source_depot": "Allocation Source / Depot",
                "distance_km": "Distance (km)",
                "reason": "Trigger Reason",
                "allocated_by": "Authorized By"
            })
            st.dataframe(renamed_df, use_container_width=True, hide_index=True)
        else:
            st.write("No allocations logged yet.")
        st.markdown('</div>', unsafe_allow_html=True)

    # ------------------------------------------------------------
    # TAB 2: FORECAST PAGE & SMART ALLOCATION
    # ------------------------------------------------------------
    elif st.session_state["auth_tab"] == "Forecast":
        st.markdown('<div style="font-size:1.85rem;font-weight:900;color:#F2FBFC;letter-spacing:2px;text-transform:uppercase;margin-bottom:0.25rem;">📈 Multi-Route Demand Forecast</div>', unsafe_allow_html=True)
        st.markdown('<div style="font-size:0.88rem;color:#A6998A;margin-bottom:1.6rem;">Neural Network Corridor Forecasting & Intelligent Fleet Allocation</div>', unsafe_allow_html=True)

        # Notification banner if allocation was just made
        if st.session_state.get("alloc_confirmed_msg"):
            st.success(st.session_state["alloc_confirmed_msg"])

        # Date Picker & Generate Forecast Bar
        with st.container():
            st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
            c_fdate, c_fbtn = st.columns([4, 2])
            with c_fdate:
                sel_fdate = st.date_input(
                    "Select Forecast Target Date:",
                    value=st.session_state["forecast_date"],
                    min_value=date.today(),
                    key="authority_forecast_date_input"
                )
                st.session_state["forecast_date"] = sel_fdate
            with c_fbtn:
                st.markdown("<br>", unsafe_allow_html=True)
                if st.button("🚀 GENERATE FORECAST", type="primary", use_container_width=True, key="btn_gen_forecast"):
                    with st.spinner("Executing neural network batch forecast for all 4 major routes..."):
                        forecasts = predict_all_routes_authority(pd.Timestamp(sel_fdate))
                        st.session_state["active_forecasts"] = forecasts
                        st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        if not st.session_state["active_forecasts"]:
            st.info("💡 Please select a target date and click **GENERATE FORECAST** to evaluate all 4 major routes.")
            return

        forecasts = st.session_state["active_forecasts"]

        # Route Selector Tabs (S45, S57, S33A, S48)
        route_keys = ["S45", "S57", "S33A", "S48"]
        r_cols = st.columns(4)
        for i, sid in enumerate(route_keys):
            with r_cols[i]:
                f_data = forecasts.get(sid, {})
                c_icon = f_data.get("crowd_icon", "🚌")
                is_active = (st.session_state["selected_route_tab"] == sid)
                btn_type = "primary" if is_active else "secondary"
                if st.button(f"{c_icon} {sid} ({f_data.get('crowd_level', '')})", key=f"tab_btn_{sid}", use_container_width=True, type=btn_type):
                    st.session_state["selected_route_tab"] = sid
                    st.rerun()

        # Detailed View for the Selected Route
        active_sid = st.session_state["selected_route_tab"]
        route_f = forecasts[active_sid]

        st.markdown("<div style='margin-top:1rem;'></div>", unsafe_allow_html=True)

        # 1. Interactive Route Map
        st.markdown(f'<div class="dashboard-card"><div class="card-title">🗺️ Interactive Route Map — {route_f["route_name"]}</div>', unsafe_allow_html=True)
        m = authority_route_map(active_sid)
        st_folium(m, width=None, height=340, returned_objects=[], key=f"map_{active_sid}")
        st.markdown('</div>', unsafe_allow_html=True)

        # 2. Route Metrics Grid
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown(f'<div class="card-title">🧭 Forecast Diagnostics: {route_f["route_name"]}</div>', unsafe_allow_html=True)

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Scheduled Baseline Capacity", f"{route_f['normal_passengers']:,} passengers")
        m2.metric("Expected Passenger Demand", f"{route_f['expected_passengers']:,} passengers", delta=f"{route_f['expected_passengers'] - route_f['normal_passengers']} diff")
        m3.metric("Crowd Level Status", f"{route_f['crowd_icon']} {route_f['crowd_level']}")
        m4.metric("Model Confidence Score", f"{route_f['confidence_score']}%")

        st.markdown("<hr style='border:0;height:1px;background:rgba(196, 229, 242, 0.12);margin:1.2rem 0;'>", unsafe_allow_html=True)

        # Explainable AI: Reasons for Crowdness
        c_reas, c_last = st.columns([3, 2])
        with c_reas:
            st.markdown("<b style='color:#C4E5F2;font-size:0.92rem;text-transform:uppercase;letter-spacing:1px;'>🧠 AI Explainability Factors (Why this crowd level?):</b>", unsafe_allow_html=True)
            for reas in route_f.get("reasons", []):
                st.markdown(f"• <span style='font-size:0.9rem;color:#DCEEF5;'>{reas}</span>", unsafe_allow_html=True)

        with c_last:
            st.markdown("<b style='color:#C4E5F2;font-size:0.92rem;text-transform:uppercase;letter-spacing:1px;'>🕒 Last Bus Allocated on Record:</b>", unsafe_allow_html=True)
            st.markdown(f"<div style='background:#1e202d;padding:0.8rem 1.1rem;border-radius:12px;color:#F2FBFC;font-weight:700;margin-top:0.4rem;border:1px solid rgba(196,229,242,0.15);'>{route_f['last_allocated_bus']}</div>", unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

        # 3. Smart Bus Allocation Section
        buses_needed = route_f["buses_required"]
        if buses_needed > 0 or route_f["crowd_level"] in ["High", "Moderate"]:
            st.markdown("""
            <div class="alloc-box">
                <div class="alloc-title">⚡ Additional Buses Required — Smart Bus Allocation Engine</div>
                <p style="color:#DCEEF5;font-size:0.95rem;margin-bottom:1rem;line-height:1.5;">
                    Predicted demand exceeds optimal network capacity. The allocation engine has analyzed nearby idle fleets and calculated proximity distances.
                </p>
            </div>
            """, unsafe_allow_html=True)

            # Recommend nearest suitable idle buses
            target_date_str = route_f["target_date"]
            ranked_buses = recommend_buses(active_sid, target_date_str)

            if ranked_buses:
                st.markdown("<b style='color:#C4E5F2;font-size:0.95rem;text-transform:uppercase;letter-spacing:1px;'>Select Bus for Smart Deployment:</b>", unsafe_allow_html=True)
                
                # Options list
                bus_options = []
                for b in ranked_buses:
                    rec_tag = " [⭐ RECOMMENDED]" if b["is_recommended"] else ""
                    bus_options.append(f"{b['bus_id']} ({b['bus_number']}) — {b['depot_name']} ({b['distance_km']} km away, {b['capacity']} seats, {b['fuel_type']}){rec_tag}")

                chosen_bus_str = st.radio(
                    "Available Fleet Candidates Ranked by Proximity:",
                    bus_options,
                    index=0,
                    key=f"alloc_radio_{active_sid}"
                )

                # Extract chosen bus ID
                chosen_bus_id = chosen_bus_str.split(" ")[0]

                # Trigger Confirmation Modal / Action
                c_conf, _ = st.columns([2, 3])
                with c_conf:
                    if st.button(f"🚀 Confirm Allocation of {chosen_bus_id}", type="primary", use_container_width=True, key=f"btn_confirm_alloc_{active_sid}"):
                        reason_txt = f"Crowd demand surge ({route_f['crowd_level']}) on {route_f['route_name']}"
                        success = execute_allocation(
                            date_str=target_date_str,
                            service_id=active_sid,
                            bus_id=chosen_bus_id,
                            reason=reason_txt,
                            allocated_by="Officer Rajesh Kumar"
                        )
                        if success:
                            st.session_state["alloc_confirmed_msg"] = f"✅ Successfully allocated {chosen_bus_id} to {route_f['route_name']} on {target_date_str}!"
                            st.rerun()
            else:
                st.warning("⚠️ No idle buses are currently available for allocation on this date. Check the Idle Buses page.")
        else:
            st.success("✅ Normal passenger demand. Standard scheduled bus frequency is sufficient for this route.")

    # ------------------------------------------------------------
    # TAB 3: IDLE BUSES PAGE
    # ------------------------------------------------------------
    elif st.session_state["auth_tab"] == "Idle Buses":
        st.markdown('<div style="font-size:1.85rem;font-weight:900;color:#F2FBFC;letter-spacing:2px;text-transform:uppercase;margin-bottom:0.25rem;">🚌 Idle Bus Fleet Inventory</div>', unsafe_allow_html=True)
        st.markdown('<div style="font-size:0.88rem;color:#A6998A;margin-bottom:1.6rem;">Depot Resource Tracking & Standby Fleet Availability</div>', unsafe_allow_html=True)

        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        c_idledate, _ = st.columns([3, 3])
        with c_idledate:
            idle_target_date = st.date_input(
                "Filter Fleet by Operational Date:",
                value=st.session_state["forecast_date"],
                key="idle_buses_date_sel"
            )

        fleet_df = get_fleet_df(idle_target_date.strftime("%Y-%m-%d"))

        st.markdown(f'<div class="card-title" style="margin-top:1.2rem;">Depot Availability for {idle_target_date.strftime("%d %B %Y")}</div>', unsafe_allow_html=True)

        if not fleet_df.empty:
            st.dataframe(fleet_df[["bus_id", "bus_number", "depot_name", "capacity", "fuel_type", "status"]].rename(columns={
                "bus_id": "Bus ID",
                "bus_number": "Bus Number",
                "depot_name": "Current Location / Depot",
                "capacity": "Capacity (Seats)",
                "fuel_type": "Fuel Type",
                "status": "Operational Status"
            }), use_container_width=True, hide_index=True)
        else:
            st.info("No bus fleet records available.")
        st.markdown('</div>', unsafe_allow_html=True)

    # ------------------------------------------------------------
    # TAB 4: GENERATE REPORT
    # ------------------------------------------------------------
    elif st.session_state["auth_tab"] == "Generate Report":
        st.markdown('<div style="font-size:1.85rem;font-weight:900;color:#F2FBFC;letter-spacing:2px;text-transform:uppercase;margin-bottom:0.25rem;">📑 Generate Intelligence Report</div>', unsafe_allow_html=True)
        st.markdown('<div style="font-size:0.88rem;color:#A6998A;margin-bottom:1.6rem;">Export Official Operational Summaries & A4 PDF Briefings</div>', unsafe_allow_html=True)

        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown('<div class="card-title">Configure Report Scope & Export</div>', unsafe_allow_html=True)

        c_repdate, c_reprte = st.columns(2)
        with c_repdate:
            rep_date = st.date_input("Report Target Date:", value=st.session_state["forecast_date"], key="rep_target_date")
        with c_reprte:
            rep_route = st.selectbox("Route Scope:", ["All Routes", "S45", "S57", "S33A", "S48"], key="rep_route_sel")

        rep_date_str = rep_date.strftime("%Y-%m-%d")

        # Compile data for preview
        forecasts = predict_all_routes_authority(pd.Timestamp(rep_date))
        alloc_df = get_allocation_history()
        fleet_df = get_fleet_df(rep_date_str)

        st.markdown("<hr style='border:0;height:1px;background:rgba(196, 229, 242, 0.12);margin:1.2rem 0;'>", unsafe_allow_html=True)
        st.markdown("<b style='color:#C4E5F2;font-size:0.95rem;text-transform:uppercase;letter-spacing:1px;'>Report Preview Summary:</b>", unsafe_allow_html=True)

        # Quick preview table
        summary_rows = []
        for sid, rf in forecasts.items():
            if rep_route == "All Routes" or rep_route == sid:
                summary_rows.append({
                    "Service": sid,
                    "Route Name": rf["route_name"],
                    "Normal Capacity": rf["normal_passengers"],
                    "Forecasted Passengers": rf["expected_passengers"],
                    "Crowd Status": f"{rf['crowd_icon']} {rf['crowd_level']}",
                    "Smart Extra Buses": f"{rf['buses_required']} Bus(es)" if rf["buses_required"] > 0 else "None"
                })
        st.dataframe(pd.DataFrame(summary_rows), use_container_width=True, hide_index=True)

        st.markdown("<div style='margin-top:1.5rem;'></div>", unsafe_allow_html=True)

        # PDF Download Button
        pdf_bytes = generate_authority_comprehensive_pdf(
            forecast_data=forecasts,
            alloc_df=alloc_df,
            fleet_df=fleet_df,
            target_date_str=rep_date_str,
            selected_route=rep_route
        )

        st.download_button(
            label="📥 DOWNLOAD AS PDF",
            data=pdf_bytes,
            file_name=f"RideCast_Intelligence_Report_{rep_date_str}_{rep_route.replace(' ', '_')}.pdf",
            mime="application/pdf",
            type="primary",
            use_container_width=True
        )

        st.markdown('</div>', unsafe_allow_html=True)

