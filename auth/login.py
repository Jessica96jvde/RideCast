import streamlit as st
from auth.db import init_db, verify_user


def show_login():
    init_db()

    col_pad1, col_form, col_pad2 = st.columns([1, 1.6, 1])
    with col_form:
        st.markdown("""
        <div style="background:rgba(24, 26, 36, 0.9);border:1px solid rgba(196, 229, 242, 0.15);border-radius:22px;padding:2.2rem 2.4rem;box-shadow:0 10px 40px rgba(0,0,0,0.5);margin-top:2rem;text-align:center;">
            <div style="font-size:2.6rem;margin-bottom:0.4rem;">🔐</div>
            <div style="font-size:1.4rem;font-weight:900;letter-spacing:2px;color:#F2FBFC;text-transform:uppercase;">Authority Login</div>
            <div style="color:#A6998A;font-size:0.8rem;margin-top:4px;letter-spacing:0.5px;">Coimbatore Metropolitan Transport Department</div>
        </div>
        """, unsafe_allow_html=True)

        with st.form("login_form"):
            username = st.text_input("Username", placeholder="e.g. admin")
            password = st.text_input("Password", type="password", placeholder="••••••••")
            st.caption("🔑 **Demo Access:** `admin` / `admin123`")
            submitted = st.form_submit_button("Sign In to Operations Portal", type="primary", use_container_width=True)

        if submitted:
            if verify_user(username, password):
                st.session_state["logged_in"] = True
                st.session_state["username"] = username
                st.session_state["view"] = "authority"
                st.rerun()
            else:
                st.error("❌ Invalid username or password. Please verify credentials.")

        if st.button("← Return to Passenger Portal", key="btn_return_passenger", use_container_width=True):
            st.session_state["view"] = "public"
            st.rerun()


def logout():
    st.session_state["logged_in"] = False
    st.session_state["username"] = ""
    st.session_state["view"] = "public"
    st.rerun()

