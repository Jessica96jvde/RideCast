import calendar
from datetime import date, timedelta
import streamlit as st


def render_system_calendar(selected_date: date) -> date:
    """
    Renders a full desktop/system monthly calendar matching Sketch 3:
    Shows the full month grid with only the next 7 days highlighted and selectable
    (Weather & transit demand prediction window).
    """
    today = date.today()
    allowed_dates = {today + timedelta(days=i) for i in range(7)}

    year = selected_date.year
    month = selected_date.month
    month_name = calendar.month_name[month]

    # Sleek System Calendar Header
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, rgba(52, 74, 85, 0.85) 0%, rgba(26, 28, 38, 0.95) 100%);
                border: 1px solid rgba(196, 229, 242, 0.2);
                border-bottom: 1px solid rgba(196, 229, 242, 0.1);
                border-radius: 16px 16px 0 0;
                padding: 0.9rem 1.4rem;
                display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);">
        <div>
            <div style="font-weight: 800; font-size: 1.15rem; letter-spacing: 2px;
                        color: #C4E5F2; text-transform: uppercase; font-family: 'Inter', sans-serif;">
                📅 {month_name} {year}
            </div>
            <div style="font-size: 0.72rem; color: #A6998A; margin-top: 2px;">
                Weather & Transit Prediction Window
            </div>
        </div>
        <div style="font-size: 0.7rem; background: rgba(242, 159, 5, 0.18);
                    color: #F29F05; padding: 4px 12px; border-radius: 20px; font-weight: 800;
                    border: 1px solid rgba(242, 159, 5, 0.4); letter-spacing: 0.8px;
                    display: flex; align-items: center; gap: 5px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#F29F05;box-shadow:0 0 8px #F29F05;"></span>
            NEXT 7 DAYS ACTIVE
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Weekday Headers: Mon Tue Wed Thu Fri Sat Sun
    day_headers = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    h_cols = st.columns(7)
    for idx, dh in enumerate(day_headers):
        with h_cols[idx]:
            is_weekend = (idx >= 5)
            h_color = "#F28705" if is_weekend else "rgba(196, 229, 242, 0.7)"
            st.markdown(
                f"<div style='text-align:center;font-weight:700;font-size:0.75rem;"
                f"color:{h_color};padding:8px 0;text-transform:uppercase;letter-spacing:1px;"
                f"background:rgba(26, 28, 38, 0.95);border-bottom:1px solid rgba(255,255,255,0.06);'>"
                f"{dh}</div>",
                unsafe_allow_html=True
            )

    cal = calendar.monthcalendar(year, month)
    chosen_date = selected_date

    for week in cal:
        w_cols = st.columns(7)
        for col_idx, day_num in enumerate(week):
            with w_cols[col_idx]:
                if day_num == 0:
                    st.markdown("<div style='height:38px;margin-bottom:4px;'></div>", unsafe_allow_html=True)
                else:
                    curr_d = date(year, month, day_num)
                    is_selectable = (curr_d in allowed_dates)
                    is_selected = (curr_d == chosen_date)
                    is_today = (curr_d == today)

                    if is_selectable:
                        btn_type = "primary" if is_selected else "secondary"
                        btn_label = f"★ {day_num}" if is_today else str(day_num)
                        if st.button(
                            btn_label,
                            key=f"cal_{curr_d.isoformat()}",
                            use_container_width=True,
                            type=btn_type,
                            help=f"Select {curr_d.strftime('%A, %d %B %Y')} (Weather & Crowd forecast available)"
                        ):
                            chosen_date = curr_d
                            st.session_state["selected_travel_date"] = curr_d
                            st.rerun()
                    else:
                        st.markdown(
                            f"<div style='height:38px;line-height:38px;text-align:center;"
                            f"font-size:0.82rem;color:rgba(166, 153, 138, 0.35);"
                            f"background:rgba(255, 255, 255, 0.015);border-radius:8px;"
                            f"margin-bottom:4px;border:1px dashed rgba(255, 255, 255, 0.04);"
                            f"cursor:not-allowed;' title='Forecasting limited to next 7 days'>{day_num}</div>",
                            unsafe_allow_html=True
                        )

    # Sleek Footer Bar
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, rgba(26, 28, 38, 0.95) 0%, rgba(52, 74, 85, 0.85) 100%);
                border: 1px solid rgba(196, 229, 242, 0.2);
                border-top: none;
                border-radius: 0 0 16px 16px;
                padding: 0.75rem 1.4rem;
                display: flex; justify-content: space-between; align-items: center;
                font-size: 0.82rem; margin-bottom: 1.4rem;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);">
        <span style="color: #A6998A;">
            Selected Journey Date: <strong style="color: #F29F05; font-size: 0.92rem;">{chosen_date.strftime('%A, %d %B %Y')}</strong>
        </span>
        <span style="color: #C4E5F2; font-size: 0.75rem; font-style: italic;">
            ⚡ Weather API & LSTM Sequence Synchronized
        </span>
    </div>
    """, unsafe_allow_html=True)

    return chosen_date
