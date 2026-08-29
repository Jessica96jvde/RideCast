import time
import streamlit as st
import pandas as pd
from datetime import date, timedelta
from pathlib import Path
from streamlit_folium import st_folium
from utils.predict import find_services, predict_demand
from utils.map_utils import public_map
from utils.feedback import save_feedback
from utils.calendar_component import render_system_calendar

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CAPACITY = 50

TIME_SLOTS = [
    ("06:00 – 08:00", ["06:00", "06:25", "05:25", "04:45", "05:45"]),
    ("08:00 – 10:00", ["08:00", "08:25", "08:55", "09:00", "09:25", "09:30", "09:55", "08:45", "09:15", "09:45"]),
    ("10:00 – 12:00", ["10:00", "10:25", "10:55", "10:30", "11:00", "10:15", "10:45", "11:15", "11:25"]),
    ("12:00 – 14:00", ["12:25", "13:00", "12:15", "13:15"]),
    ("14:00 – 16:00", ["13:25", "15:00", "14:25", "15:25", "14:15", "15:15"]),
    ("16:00 – 20:00", ["17:00", "17:10", "17:25", "17:30", "18:00", "17:15", "17:45", "18:15",
                       "18:25", "18:45", "18:55", "19:00", "19:15", "19:25", "19:45", "19:50", "20:15"]),
]

# 6 crowd colors for the 6 time slots (Paper Sketch 2)
SLOT_COLORS = [
    "#344A55",  # Slot 1: Early Morning
    "#F28705",  # Slot 2: Morning Peak
    "#F29F05",  # Slot 3: Late Morning
    "#A6998A",  # Slot 4: Midday
    "#C4E5F2",  # Slot 5: Afternoon
    "#BF5B04",  # Slot 6: Evening Peak
]


@st.cache_data
def _stop_options():
    df = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "stop_master.csv")
    return {row["stop_name"]: row["stop_id"] for _, row in df.iterrows()}


@st.cache_data
def _all_services():
    df = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "route_master.csv")
    return df["service_id"].tolist()


def _crowd_label(pct):
    if pct < 0.5:
        return "Low", "🟢", "badge-low"
    if pct < 0.8:
        return "Moderate", "🟡", "badge-mod"
    return "High", "🔴", "badge-high"


def _times_for_slot(slot_label, service_id):
    tt = pd.read_csv(PROJECT_ROOT / "dataset" / "data" / "route_timetable.csv")
    svc_times = tt[tt["service_id"] == service_id]["departure_time"].drop_duplicates().tolist()
    for label, times in TIME_SLOTS:
        if label == slot_label:
            matched = [t for t in times if t in svc_times]
            return matched if matched else times[:1]
    return ["08:25"]


def _predict_for_slot(service_id, from_id, to_id, travel_date, slot_label):
    times = _times_for_slot(slot_label, service_id)
    dep_time = times[0] if times else "08:25"
    r = predict_demand(service_id, from_id, to_id, pd.Timestamp(travel_date), dep_time)
    return r


def _inject_css():
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

    /* Hide Collapse Icons */
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
        min-width: 250px !important;
        max-width: 250px !important;
        width: 250px !important;
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

    /* Sidebar User Content structure: Flex column */
    [data-testid="stSidebarUserContent"] {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        height: 100% !important;
        min-height: 100vh !important;
        padding: 1.6rem 1.1rem !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
    }
    [data-testid="stSidebar"] * { color: #F2FBFC !important; }

    /* Brand Header in Sidebar */
    .sb-brand {
        text-align: center;
        padding-bottom: 0.8rem;
    }
    .sb-brand-title {
        font-size: 1.65rem;
        font-weight: 900;
        letter-spacing: 4px;
        color: #C4E5F2 !important;
        text-shadow: 0 0 16px rgba(196, 229, 242, 0.5);
    }
    .sb-brand-sub {
        font-size: 0.68rem;
        color: #A6998A;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-top: 3px;
    }

    /* Sidebar Slot Pill (Results Page) */
    .sb-slot-pill {
        display: block;
        width: 100%;
        padding: 0.45rem 0.6rem;
        margin-bottom: 0.35rem;
        border-radius: 10px;
        font-size: 0.78rem;
        font-weight: 700;
        text-align: center;
        border: 2px solid transparent;
        color: #231100 !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .sb-slot-pill.active {
        border: 2px solid #F2FBFC !important;
        box-shadow: 0 0 12px rgba(196, 229, 242, 0.8);
    }

    /* Pinned Bottom Login Button */
    .login-btn-container .stButton > button {
        background: linear-gradient(135deg, rgba(52, 74, 85, 0.9), rgba(35, 17, 0, 0.9)) !important;
        border: 1px solid rgba(242, 159, 5, 0.5) !important;
        color: #F29F05 !important;
        font-weight: 800 !important;
        letter-spacing: 1.5px !important;
        border-radius: 12px !important;
        padding: 0.65rem !important;
        width: 100% !important;
        font-size: 0.85rem !important;
        text-transform: uppercase !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.2s ease-in-out !important;
    }
    .login-btn-container .stButton > button:hover {
        background: linear-gradient(135deg, #F29F05, #F28705) !important;
        color: #231100 !important;
        border-color: #F2FBFC !important;
        box-shadow: 0 0 18px rgba(242, 159, 5, 0.6) !important;
        transform: translateY(-2px) !important;
    }

    /* ── MAIN CONTENT CONTAINER ── */
    [data-testid="stMain"] { background: transparent !important; }
    [data-testid="stMainBlockContainer"] {
        padding: 2.2rem 2.8rem !important;
        max-width: 980px !important;
    }

    /* Glassmorphic Search Card */
    .glass-card {
        background: rgba(24, 26, 36, 0.85) !important;
        backdrop-filter: blur(16px) !important;
        border-radius: 20px !important;
        padding: 2rem 2.4rem !important;
        border: 1px solid rgba(196, 229, 242, 0.12) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35) !important;
        margin-bottom: 1.8rem !important;
    }

    /* Header Typography */
    .page-title {
        font-size: 1.85rem;
        font-weight: 900;
        letter-spacing: 2px;
        color: #F2FBFC;
        text-transform: uppercase;
        margin-bottom: 0.25rem;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    .page-sub {
        font-size: 0.88rem;
        color: #A6998A;
        letter-spacing: 0.5px;
        margin-bottom: 1.6rem;
    }

    /* Inputs Styling */
    [data-testid="stSelectbox"] > div > div,
    [data-testid="stTextInput"] > div > div > input {
        background: #1e202d !important;
        border: 1px solid rgba(196, 229, 242, 0.18) !important;
        border-radius: 12px !important;
        color: #F2FBFC !important;
        font-size: 0.92rem !important;
        font-weight: 500 !important;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
    }
    [data-testid="stSelectbox"] > div > div:focus-within,
    [data-testid="stTextInput"] > div > div > input:focus {
        border-color: #F29F05 !important;
        box-shadow: 0 0 0 3px rgba(242, 159, 5, 0.25) !important;
    }
    [data-testid="stSelectbox"] label,
    [data-testid="stTextInput"] label {
        color: #C4E5F2 !important;
        font-size: 0.78rem !important;
        font-weight: 700 !important;
        letter-spacing: 1.2px !important;
        text-transform: uppercase !important;
    }
    [data-baseweb="popover"],
    [data-baseweb="menu"] {
        background: #1a1c26 !important;
        border: 1px solid rgba(196, 229, 242, 0.2) !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
    }
    [role="option"] {
        color: #F2FBFC !important;
        font-size: 0.88rem !important;
    }
    [role="option"]:hover, [aria-selected="true"] {
        background: rgba(242, 159, 5, 0.15) !important;
        color: #F29F05 !important;
    }

    /* Primary Predict CTA */
    [data-testid="stMainBlockContainer"] .stButton > button[kind="primary"] {
        background: linear-gradient(90deg, #F29F05, #F28705) !important;
        color: #231100 !important;
        font-weight: 800 !important;
        font-size: 1.05rem !important;
        border-radius: 14px !important;
        border: none !important;
        padding: 0.8rem 2rem !important;
        letter-spacing: 1.2px !important;
        text-transform: uppercase !important;
        box-shadow: 0 6px 20px rgba(242, 159, 5, 0.35) !important;
        transition: all 0.2s ease-in-out !important;
        width: 100% !important;
    }
    [data-testid="stMainBlockContainer"] .stButton > button[kind="primary"]:hover {
        background: linear-gradient(90deg, #F28705, #BF5B04) !important;
        color: #FEF8E7 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(242, 135, 5, 0.5) !important;
    }

    /* Secondary Action Buttons */
    [data-testid="stMainBlockContainer"] .stButton > button[kind="secondary"] {
        background: #1e202d !important;
        border: 1px solid rgba(196, 229, 242, 0.15) !important;
        border-radius: 12px !important;
        color: #C4E5F2 !important;
        font-size: 0.85rem !important;
        font-weight: 700 !important;
        transition: all 0.2s !important;
    }
    [data-testid="stMainBlockContainer"] .stButton > button[kind="secondary"]:hover {
        background: #282a38 !important;
        border-color: #F29F05 !important;
        color: #F29F05 !important;
    }

    /* Route Summary Bar (Results Page) */
    .route-summary-bar {
        background: linear-gradient(135deg, rgba(52, 74, 85, 0.95), rgba(26, 28, 38, 0.95)) !important;
        border: 1px solid rgba(196, 229, 242, 0.25) !important;
        border-radius: 16px !important;
        padding: 1rem 1.6rem !important;
        margin: 1.2rem 0 !important;
        font-size: 0.98rem !important;
        font-weight: 700 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
    }
    .route-summary-bar span.accent { color: #F29F05; font-weight: 800; }

    /* Available Services Cards (Sketch 2) */
    .svc-card {
        background: rgba(26, 28, 38, 0.9) !important;
        border: 1px solid rgba(196, 229, 242, 0.1) !important;
        border-radius: 14px !important;
        padding: 1rem 1.4rem !important;
        margin-bottom: 0.75rem !important;
        border-left: 5px solid #344A55 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        transition: all 0.2s ease !important;
    }
    .svc-card:hover {
        border-left-color: #F29F05 !important;
        transform: translateX(3px) !important;
    }
    .svc-grid {
        display: grid !important;
        grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr !important;
        align-items: center !important;
        font-size: 0.92rem !important;
        color: #DCEEF5 !important;
    }
    .svc-grid strong { color: #F2FBFC; font-size: 0.98rem; }

    /* Badges */
    .badge {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        padding: 0.28rem 0.85rem !important;
        border-radius: 20px !important;
        font-size: 0.8rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.5px !important;
    }
    .badge-low  { background: rgba(46, 204, 113, 0.15) !important; color: #2ecc71 !important; border: 1px solid rgba(46, 204, 113, 0.4) !important; }
    .badge-mod  { background: rgba(242, 159, 5, 0.15) !important; color: #F29F05 !important; border: 1px solid rgba(242, 159, 5, 0.4) !important; }
    .badge-high { background: rgba(191, 91, 4, 0.2) !important; color: #f87171 !important; border: 1px solid rgba(191, 91, 4, 0.5) !important; }
    .badge-yes  { background: rgba(191, 91, 4, 0.25) !important; color: #f87171 !important; border: 1px solid rgba(191, 91, 4, 0.5) !important; }
    .badge-no   { background: rgba(52, 74, 85, 0.4) !important; color: #C4E5F2 !important; border: 1px solid rgba(196, 229, 242, 0.2) !important; }

    /* Recommended Service Box (Sketch 2) */
    .rec-card {
        background: linear-gradient(135deg, rgba(52, 74, 85, 0.95), rgba(26, 28, 38, 0.95)) !important;
        border-radius: 18px !important;
        padding: 1.5rem 1.8rem !important;
        margin: 1.6rem 0 !important;
        border-left: 8px solid #F29F05 !important;
        border-top: 1px solid rgba(242, 159, 5, 0.3) !important;
        border-right: 1px solid rgba(242, 159, 5, 0.2) !important;
        border-bottom: 1px solid rgba(242, 159, 5, 0.2) !important;
        box-shadow: 0 6px 24px rgba(242, 159, 5, 0.15) !important;
    }
    .rec-card h3 { color: #F29F05 !important; margin: 0 0 0.6rem 0 !important; font-size: 1.2rem !important; font-weight: 900 !important; }
    .rec-card .svc-grid { color: #C4E5F2 !important; }
    .rec-card .svc-grid strong { color: #FEF8E7 !important; }
    .rec-note { font-size: 0.85rem !important; color: #A6998A !important; margin-top: 0.8rem !important; margin-bottom: 0 !important; }

    /* Modal Confirmation Box (Sketch 1) */
    .login-modal-box {
        background: #181a24 !important;
        border: 2px solid #F29F05 !important;
        border-radius: 20px !important;
        padding: 2.5rem 2.8rem !important;
        text-align: center !important;
        max-width: 520px !important;
        margin: 4rem auto !important;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(242, 159, 5, 0.2) !important;
    }
    .login-modal-box h2 { color: #F2FBFC !important; font-weight: 800 !important; margin-bottom: 0.8rem !important; font-size: 1.4rem !important; }
    .login-modal-box p { color: #DCEEF5 !important; font-size: 1.05rem !important; line-height: 1.6 !important; font-style: italic !important; margin-bottom: 1.8rem !important; }
    </style>
    """, unsafe_allow_html=True)


def show():
    _inject_css()

    # State Initializations
    for k, v in [
        ("show_popup", False), ("from_idx", 0), ("to_idx", 48),
        ("sel_slot", TIME_SLOTS[1][0]), ("selected_travel_date", date.today()),
        ("feedback_given", False), ("is_analyzing", False),
    ]:
        if k not in st.session_state:
            st.session_state[k] = v

    stops = _stop_options()
    stop_names = list(stops.keys())

    # ── FIXED LEFT SIDEBAR ───────────────────────────────────────
    with st.sidebar:
        # TOP: Title RIDECAST only
        st.markdown("""
        <div class="sb-brand">
            <div class="sb-brand-title">RIDECAST</div>
            <div class="sb-brand-sub">Coimbatore Urban Transit AI</div>
        </div>
        <hr style="border:0;height:1px;background:rgba(196, 229, 242, 0.15);margin:0.6rem 0 1.2rem 0;">
        """, unsafe_allow_html=True)

        # On RESULTS page: Render the 6 time slot color pills in the sidebar (Sketch 2)
        if "search" in st.session_state:
            st.markdown("<div style='font-size:0.75rem;font-weight:800;color:#C4E5F2;margin-bottom:0.6rem;letter-spacing:1.5px;text-transform:uppercase;'>Time Slots</div>", unsafe_allow_html=True)
            for i, (label, _) in enumerate(TIME_SLOTS):
                is_active = (label == st.session_state["sel_slot"])
                bg = SLOT_COLORS[i]
                active_cls = "active" if is_active else ""
                
                st.markdown(
                    f'<div class="sb-slot-pill {active_cls}" style="background:{bg};">'
                    f'{"⭐ " if is_active else ""}{label}'
                    f'</div>',
                    unsafe_allow_html=True
                )
                if st.button(f"Select {label}", key=f"btn_slot_{i}", use_container_width=True):
                    st.session_state["sel_slot"] = label
                    st.rerun()

        # BOTTOM: Login button only (Sketch 3 & Sketch 2)
        st.markdown("<div style='flex:1;'></div>", unsafe_allow_html=True)
        st.markdown("<hr style='border:0;height:1px;background:rgba(196, 229, 242, 0.15);margin:1.2rem 0 0.8rem 0;'>", unsafe_allow_html=True)
        st.markdown('<div class="login-btn-container">', unsafe_allow_html=True)
        if st.button("LOGIN", key="sb_login_btn", use_container_width=True):
            st.session_state["show_popup"] = True
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)

    # ── POPUP CONFIRMATION (Sketch 1) ────────────────────────────
    if st.session_state["show_popup"]:
        st.markdown("""
        <div class="login-modal-box">
            <h2>🔐 Transport Authority Portal</h2>
            <p>this login is intended for authorized transport authorities only. continue login?</p>
        </div>
        """, unsafe_allow_html=True)
        
        col_m1, col_yes, col_no, col_m2 = st.columns([1, 1.5, 1.5, 1])
        with col_yes:
            if st.button("yes", key="modal_yes", use_container_width=True, type="primary"):
                st.session_state["show_popup"] = False
                st.session_state["view"] = "authority"
                st.rerun()
        with col_no:
            if st.button("No", key="modal_no", use_container_width=True):
                st.session_state["show_popup"] = False
                st.rerun()
        return

    # ── ANALYSIS TRANSITION STATE ────────────────────────────────
    if st.session_state["is_analyzing"]:
        with st.container():
            st.markdown("""
            <div style="background:#181a24;border-radius:20px;padding:3.5rem 2rem;text-align:center;border:2px solid #F29F05;max-width:580px;margin:4rem auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="font-size:3.2rem;margin-bottom:1rem;">⚡</div>
                <h3 style="color:#F2FBFC;font-weight:900;margin-top:0.5rem;letter-spacing:1px;">Forecasting Journey Demand</h3>
                <p style="color:#F28705;font-weight:700;font-size:0.95rem;">• Analyzing selected corridor route...</p>
                <p style="color:#C4E5F2;font-size:0.9rem;">• Querying neural network LSTM sequence model...</p>
                <p style="color:#A6998A;font-size:0.88rem;">• Synchronizing weather and transit crowd forecasts...</p>
            </div>
            """, unsafe_allow_html=True)
            time.sleep(0.8)
            st.session_state["is_analyzing"] = False
            st.rerun()
        return

    # ════════════════════════════════════════════════════════════
    # VIEW 1: PASSENGER SEARCH PAGE (Paper Sketch 3)
    # ════════════════════════════════════════════════════════════
    if "search" not in st.session_state:
        st.markdown('<div class="page-title">SEARCH BUSES</div>', unsafe_allow_html=True)
        st.markdown('<div class="page-sub">Predict Your Journey Before You Ride • Bus Crowd Forecast</div>', unsafe_allow_html=True)

        with st.container():
            st.markdown('<div class="glass-card">', unsafe_allow_html=True)

            # System Monthly Calendar Grid (Only next 7 days highlighted & selectable)
            st.markdown("<b style='color:#C4E5F2;font-size:0.85rem;letter-spacing:1.5px;text-transform:uppercase;'>SELECT DATE:</b>", unsafe_allow_html=True)
            chosen_date = render_system_calendar(st.session_state["selected_travel_date"])
            st.session_state["selected_travel_date"] = chosen_date

            st.markdown("<div style='margin-top:1.4rem;'></div>", unsafe_allow_html=True)

            # FROM / SWAP / TO
            c_from, c_swap, c_to = st.columns([10, 1.6, 10])
            with c_from:
                from_name = st.selectbox(
                    "FROM:", stop_names,
                    index=min(st.session_state["from_idx"], len(stop_names) - 1),
                    key="from_select_box"
                )
            with c_swap:
                st.markdown("<br>", unsafe_allow_html=True)
                if st.button("⇅", key="swap_locations_btn", help="Swap locations (From ⇅ To)"):
                    cur_f = st.session_state["from_idx"]
                    cur_t = st.session_state["to_idx"]
                    st.session_state["from_idx"] = cur_t
                    st.session_state["to_idx"] = cur_f
                    st.rerun()
            with c_to:
                to_name = st.selectbox(
                    "TO:", stop_names,
                    index=min(st.session_state["to_idx"], len(stop_names) - 1),
                    key="to_select_box"
                )

            st.session_state["from_idx"] = stop_names.index(from_name)
            st.session_state["to_idx"] = stop_names.index(to_name)

            from_id = stops[from_name]
            to_id = stops[to_name]

            # Preferred Time Slot & Service Number (All Caps)
            c_slot, c_svc = st.columns(2)
            with c_slot:
                slot_labels = [s[0] for s in TIME_SLOTS]
                sel_slot = st.selectbox(
                    "Preferred time slot",
                    slot_labels,
                    index=slot_labels.index(st.session_state["sel_slot"]),
                    key="preferred_time_slot_sel"
                )
                st.session_state["sel_slot"] = sel_slot

            with c_svc:
                all_svcs = ["ANY"] + [s.upper() for s in _all_services()]
                filter_svc = st.selectbox(
                    "specify service number? (all caps)",
                    all_svcs,
                    key="specify_service_number_sel"
                )

            st.markdown("</div>", unsafe_allow_html=True)

            # Primary Predict Crowd CTA
            if st.button("🎯  PREDICT CROWD", type="primary", use_container_width=True, key="main_predict_crowd_btn"):
                if from_id == to_id:
                    st.error("⚠️ FROM and TO locations cannot be the same.")
                    return

                services = find_services(from_id, to_id)
                if filter_svc != "ANY":
                    services = [s for s in services if s.upper() == filter_svc]

                if not services:
                    st.error("🚫 No bus service found for this exact stop combination.")
                    st.info("💡 **Suggestion:** Try selecting major hubs (e.g. Ukkadam, Gandhipuram, Saibaba Colony, Singanallur, Ondipudur).")
                    return

                st.session_state["search"] = {
                    "from_id": from_id,
                    "to_id": to_id,
                    "from_name": from_name,
                    "to_name": to_name,
                    "travel_date": chosen_date,
                    "services": services,
                    "filter_svc": filter_svc
                }
                st.session_state["feedback_given"] = False
                st.session_state["is_analyzing"] = True
                st.rerun()

        return

    # ════════════════════════════════════════════════════════════
    # VIEW 2: PASSENGER RESULTS PAGE (Paper Sketch 2)
    # ════════════════════════════════════════════════════════════
    s = st.session_state["search"]
    from_id = s["from_id"]
    to_id = s["to_id"]
    from_name = s["from_name"]
    to_name = s["to_name"]
    travel_date = s["travel_date"]
    services = s["services"]
    active_slot = st.session_state["sel_slot"]

    # 1. Map focused on the route segment at the top (Sketch 2)
    m = public_map(from_id, to_id, services)
    st_folium(m, width=None, height=330, returned_objects=[])

    # 2. Compact Journey Summary Bar with Edit Journey button
    c_hdr, c_edit = st.columns([5, 1.2])
    with c_hdr:
        st.markdown(
            f'<div class="route-summary-bar">'
            f'<div>📍 <span class="accent">{from_name}</span> &nbsp;→&nbsp; <span class="accent">{to_name}</span>'
            f'&nbsp;&nbsp;|&nbsp;&nbsp; 📅 {travel_date.strftime("%d %b %Y")}'
            f'&nbsp;&nbsp;|&nbsp;&nbsp; 🕐 {active_slot}</div>'
            f'</div>',
            unsafe_allow_html=True
        )
    with c_edit:
        if st.button("✏️ Edit Journey", key="btn_edit_journey", use_container_width=True):
            del st.session_state["search"]
            st.rerun()

    # 3. Available Bus Services Table (Sketch 2)
    st.markdown("<div style='font-size:1.15rem;font-weight:800;color:#F2FBFC;margin:1.4rem 0 0.6rem 0;text-transform:uppercase;letter-spacing:0.8px;'>Available bus services:</div>", unsafe_allow_html=True)

    results = []
    with st.spinner("Calculating forecast..."):
        for svc in services:
            r = _predict_for_slot(svc, from_id, to_id, travel_date, active_slot)
            if r and "error" not in r:
                pct = r["outbound_pct"]
                label, icon, badge_cls = _crowd_label(pct)
                results.append({
                    "service_id": svc,
                    "route_desc": f"{from_name} → {to_name}",
                    "passengers": r["outbound"],
                    "crowd_label": label,
                    "crowd_icon": icon,
                    "badge_cls": badge_cls,
                    "add_bus": (pct >= 0.8),
                    "pct": pct,
                })

    if not results:
        st.warning("No forecast data available for this specific time slot. Please choose another slot from the sidebar.")
        return

    results.sort(key=lambda x: x["pct"])

    # Table Header
    st.markdown("""
    <div style="display:grid;grid-template-columns:2fr 1.2fr 1.2fr 1.2fr 1.2fr;padding:0.5rem 1.4rem;font-weight:800;color:#A6998A;font-size:0.75rem;text-transform:uppercase;letter-spacing:1.2px;border-bottom:1px solid rgba(196, 229, 242, 0.15);margin-bottom:0.5rem;">
        <div>Route</div>
        <div>Service</div>
        <div>Expected Passengers</div>
        <div>Crowd Level</div>
        <div>Additional Bus</div>
    </div>
    """, unsafe_allow_html=True)

    for r in results:
        bb = "badge-yes" if r["add_bus"] else "badge-no"
        add_text = "Allocated" if r["add_bus"] else "No"
        
        st.markdown(
            f'<div class="svc-card">'
            f'<div class="svc-grid">'
            f'<div><strong>{r["route_desc"]}</strong></div>'
            f'<div>🚌 <span style="color:#F29F05;font-weight:800;">{r["service_id"]}</span></div>'
            f'<div>👥 <strong>{r["passengers"]}</strong> pax</div>'
            f'<div><span class="badge {r["badge_cls"]}">{r["crowd_icon"]} {r["crowd_label"]}</span></div>'
            f'<div><span class="badge {bb}">{add_text}</span></div>'
            f'</div></div>',
            unsafe_allow_html=True
        )

    # 4. Recommended Service Box (Sketch 2)
    best = results[0]
    bb_best = "badge-yes" if best["add_bus"] else "badge-no"
    add_best_text = "Allocated" if best["add_bus"] else "No"

    st.markdown("<div style='font-size:1.15rem;font-weight:800;color:#F2FBFC;margin:1.6rem 0 0.5rem 0;text-transform:uppercase;letter-spacing:0.8px;'>Recommended service</div>", unsafe_allow_html=True)
    st.markdown(
        f'<div class="rec-card">'
        f'<h3>⭐ Recommended Service</h3>'
        f'<div class="svc-grid">'
        f'<div><strong>{best["route_desc"]}</strong></div>'
        f'<div>🚌 <span style="color:#F29F05;font-weight:900;">{best["service_id"]}</span></div>'
        f'<div>👥 Expected: <strong>{best["passengers"]}</strong> pax</div>'
        f'<div><span class="badge {best["badge_cls"]}">{best["crowd_icon"]} {best["crowd_label"]}</span></div>'
        f'<div>Additional Bus: <span class="badge {bb_best}">{add_best_text}</span></div>'
        f'</div>'
        f'<p class="rec-note">This service is recommended because it is forecasted to have a lower crowd level compared with other available services on this route corridor.</p>'
        f'</div>',
        unsafe_allow_html=True
    )

    # 5. Passenger Feedback Box
    st.markdown("""
    <div style="background:rgba(26, 28, 38, 0.7);border:1px solid rgba(196, 229, 242, 0.12);border-radius:14px;padding:1rem 1.4rem;text-align:center;margin-top:1.8rem;">
        <span style="font-weight:700;color:#F2FBFC;font-size:0.92rem;">Was this forecast useful for your journey planning?</span>
    </div>
    """, unsafe_allow_html=True)

    if not st.session_state["feedback_given"]:
        c_fb1, c_fb2, _ = st.columns([1, 1, 4])
        with c_fb1:
            if st.button("👍 Yes", key="btn_fb_yes", use_container_width=True):
                save_feedback(True, from_name, to_name, active_slot)
                st.session_state["feedback_given"] = True
                st.rerun()
        with c_fb2:
            if st.button("👎 No", key="btn_fb_no", use_container_width=True):
                save_feedback(False, from_name, to_name, active_slot)
                st.session_state["feedback_given"] = True
                st.rerun()
    else:
        st.success("🙏 Thank you for your feedback!")
