import io
from datetime import datetime
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

W, H = A4
STYLES = getSampleStyleSheet()

HEADER_STYLE = ParagraphStyle(
    "header", parent=STYLES["Heading1"],
    fontSize=18, textColor=colors.HexColor("#2c3e50"), spaceAfter=4
)
SUB_STYLE = ParagraphStyle(
    "sub", parent=STYLES["Normal"],
    fontSize=10, textColor=colors.HexColor("#7f8c8d"), spaceAfter=12
)
SECTION_STYLE = ParagraphStyle(
    "section", parent=STYLES["Heading2"],
    fontSize=13, textColor=colors.HexColor("#2980b9"), spaceBefore=14, spaceAfter=6
)

TABLE_STYLE = TableStyle([
    ("BACKGROUND",  (0, 0), (-1, 0),  colors.HexColor("#2980b9")),
    ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
    ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
    ("FONTSIZE",    (0, 0), (-1, -1), 9),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#ecf0f1")]),
    ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#bdc3c7")),
    ("ALIGN",       (1, 1), (-1, -1), "CENTER"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING",(0, 0), (-1, -1), 6),
    ("TOPPADDING",  (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING",(0,0), (-1, -1), 4),
])


def _header_block(title: str, subtitle: str) -> list:
    return [
        Paragraph("RideCast — AI Bus Demand Prediction", HEADER_STYLE),
        Paragraph(title, STYLES["Heading2"]),
        Paragraph(subtitle, SUB_STYLE),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2980b9")),
        Spacer(1, 0.3 * cm),
    ]


def _df_to_table(df: pd.DataFrame, col_widths=None) -> Table:
    data = [list(df.columns)] + df.values.tolist()
    t = Table(data, colWidths=col_widths)
    t.setStyle(TABLE_STYLE)
    return t


def generate_summary_pdf(
    filtered: pd.DataFrame,
    route_demand: pd.DataFrame,
    alloc: pd.DataFrame,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    story = []

    generated = datetime.now().strftime("%d %b %Y, %H:%M")
    story += _header_block(
        "Full Summary Report",
        f"Generated: {generated}"
    )

    # ── KPIs ────────────────────────────────────────────────────
    story.append(Paragraph("Key Metrics", SECTION_STYLE))
    total   = int(filtered["total_passengers"].sum())
    daily   = filtered.groupby("date")["total_passengers"].sum()
    avg_day = int(daily.mean()) if len(daily) else 0
    kpi_data = [
        ["Metric", "Value"],
        ["Total Passengers",    f"{total:,}"],
        ["Average Daily Demand",f"{avg_day:,}"],
        ["Services Covered",    str(filtered["service_id"].nunique())],
        ["Date Range",          f"{filtered['date'].min().date()} → {filtered['date'].max().date()}"],
    ]
    story.append(Table(kpi_data, colWidths=[9*cm, 7*cm]))
    story[-1].setStyle(TABLE_STYLE)
    story.append(Spacer(1, 0.4*cm))

    # ── Demand by Route ──────────────────────────────────────────
    story.append(Paragraph("Demand by Route", SECTION_STYLE))
    story.append(_df_to_table(
        route_demand.rename(columns={"Service": "Service ID", "Passengers": "Total Passengers"}),
        col_widths=[9*cm, 7*cm]
    ))
    story.append(Spacer(1, 0.4*cm))

    # ── Bus Allocation ───────────────────────────────────────────
    story.append(Paragraph("Recommended Bus Allocation", SECTION_STYLE))
    alloc_table = alloc[["Service", "Passengers", "Buses Needed"]].copy()
    story.append(_df_to_table(alloc_table, col_widths=[6*cm, 6*cm, 5*cm]))

    doc.build(story)
    return buf.getvalue()


def generate_route_pdf(service_id: str, route_df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    story = []

    generated = datetime.now().strftime("%d %b %Y, %H:%M")
    story += _header_block(
        f"Route Report — Service {service_id}",
        f"Generated: {generated}"
    )

    # ── Route KPIs ───────────────────────────────────────────────
    story.append(Paragraph("Route Summary", SECTION_STYLE))
    total_in  = int(route_df["inbound_passenger_count"].sum())
    total_out = int(route_df["outbound_passenger_count"].sum())
    kpi_data = [
        ["Metric", "Value"],
        ["Total Inbound Passengers",  f"{total_in:,}"],
        ["Total Outbound Passengers", f"{total_out:,}"],
        ["Total Passengers",          f"{total_in + total_out:,}"],
        ["Date Range",
         f"{route_df['date'].min().date()} → {route_df['date'].max().date()}"],
    ]
    story.append(Table(kpi_data, colWidths=[9*cm, 7*cm]))
    story[-1].setStyle(TABLE_STYLE)
    story.append(Spacer(1, 0.4*cm))

    # ── Demand by Time Slot ──────────────────────────────────────
    story.append(Paragraph("Demand by Time Slot", SECTION_STYLE))
    slot = (
        route_df.groupby("time")[["inbound_passenger_count", "outbound_passenger_count"]]
        .sum().reset_index()
        .rename(columns={
            "time": "Time Slot",
            "inbound_passenger_count": "Inbound",
            "outbound_passenger_count": "Outbound",
        })
        .sort_values("Time Slot")
    )
    slot["Inbound"]  = slot["Inbound"].astype(int)
    slot["Outbound"] = slot["Outbound"].astype(int)
    story.append(_df_to_table(slot, col_widths=[6*cm, 6*cm, 5*cm]))

    doc.build(story)
    return buf.getvalue()
