import streamlit as st

st.set_page_config(
    page_title="RideCast",
    page_icon="🚌",
    layout="wide",
    initial_sidebar_state="expanded",
)

from auth.login import show_login
from pages.public import show as show_public
from pages.dashboard import show as show_dashboard


def main():
    # ── sidebar nav ─────────────────────────────────────────────
    with st.sidebar:
        st.image("https://img.icons8.com/color/96/bus.png", width=60)
        st.title("RideCast")
        st.caption("AI Bus Demand Prediction\nCoimbatore")
        st.divider()
        view = st.radio(
            "Select View",
            ["🚌 Public Journey Planner", "🔐 Transport Authority"],
            label_visibility="collapsed",
        )

    # ── routing ──────────────────────────────────────────────────
    if view == "🚌 Public Journey Planner":
        show_public()

    elif view == "🔐 Transport Authority":
        if st.session_state.get("logged_in"):
            show_dashboard()
        else:
            show_login()


if __name__ == "__main__":
    main()
