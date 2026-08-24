import streamlit as st
from auth.db import init_db, verify_user


def show_login():
    init_db()

    st.title("🔐 Transport Authority Login")
    st.caption("This portal is for authorised transport staff only.")

    with st.form("login_form"):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")

    if submitted:
        if verify_user(username, password):
            st.session_state["logged_in"] = True
            st.session_state["username"]  = username
            st.rerun()
        else:
            st.error("Invalid username or password.")


def logout():
    st.session_state["logged_in"] = False
    st.session_state["username"]  = ""
    st.rerun()
