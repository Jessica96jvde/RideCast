import streamlit as st

st.set_page_config(
    page_title="RideCast — AI Bus Crowd Forecasting & Fleet Allocation",
    page_icon="🚌",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Global layout styling to guarantee sidebar is ALWAYS present and visible
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body,
[data-testid="stApp"],
[data-testid="stAppViewContainer"] {
    background-color: #0f1015 !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    color: #F2FBFC !important;
}

#MainMenu, footer, header { visibility: hidden !important; }

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

/* Hide collapse buttons so user or browser cannot collapse sidebar */
[data-testid="stSidebarCollapseButton"],
[data-testid="collapsedControl"],
[data-testid="stSidebarHeader"] button {
    display: none !important;
    visibility: hidden !important;
}
</style>
""", unsafe_allow_html=True)

from auth.login import show_login
from pages.public import show as show_public
from pages.dashboard import show as show_dashboard


def main():
    if "view" not in st.session_state:
        st.session_state["view"] = "public"

    view = st.session_state.get("view", "public")

    if view == "authority":
        if st.session_state.get("logged_in"):
            show_dashboard()
        else:
            with st.sidebar:
                st.markdown("""
                <div style="text-align:center;padding-bottom:0.8rem;">
                    <div style="font-size:1.65rem;font-weight:900;letter-spacing:3px;color:#C4E5F2;text-shadow:0 0 16px rgba(196, 229, 242, 0.5);">RIDECAST</div>
                    <div style="font-size:0.68rem;color:#A6998A;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px;">Authority Authentication</div>
                </div>
                <hr style="border:0;height:1px;background:rgba(196, 229, 242, 0.15);margin:0.6rem 0 1.2rem 0;">
                """, unsafe_allow_html=True)
                
                st.markdown("<div style='flex:1;'></div>", unsafe_allow_html=True)
                if st.button("← Back to Passenger Portal", use_container_width=True):
                    st.session_state["view"] = "public"
                    st.session_state["show_popup"] = False
                    st.rerun()
            show_login()
    else:
        show_public()


if __name__ == "__main__":
    main()

