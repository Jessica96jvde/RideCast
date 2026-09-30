"""
RideCast - Backend Configuration & Transit Network Constants
============================================================
This module defines centralized file paths, transit route metadata, 
geographical coordinates, and operational parameters used across the RideCast system.

Why this file exists:
- Provides a single source of truth for file paths (avoiding hardcoded strings).
- Defines transit routes across Coimbatore (origin, destination, default fleet).
- Configures 6 standardized commuter time-slots for hourly crowd forecasting.
"""

import os
from pathlib import Path

# ==============================================================================
# 1. DIRECTORY STRUCTURE & FILE PATHS
# ==============================================================================
# We use pathlib.Path to construct platform-independent absolute paths (works on Windows/Linux/macOS)
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "dataset" / "data"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = PROJECT_ROOT / "dataset" / "model"

# Pre-trained Machine Learning Model & Preprocessing Artifacts
MODEL_FILE = MODEL_DIR / "ridecast_lstm.keras"          # Saved TensorFlow/Keras LSTM neural network
SCALER_FILE = PROCESSED_DIR / "scaler.pkl"              # Scikit-learn MinMaxScaler for feature normalization
ENCODERS_FILE = PROCESSED_DIR / "encoders.pkl"          # LabelEncoders for categorical features (time, stops, day)
ENCODED_RIDERSHIP_FILE = PROCESSED_DIR / "encoded_ridership.csv" # Pre-encoded ridership reference dataset

# Raw & Dimension Dataset CSV Files
HISTORY_FILE = DATA_DIR / "historical_ridership.csv"    # Multi-year historical transit patronage log
HOLIDAY_FILE = DATA_DIR / "holiday_master.csv"          # Tamil Nadu public holidays & festivals calendar
WEATHER_FILE = DATA_DIR / "weather_history.csv"          # Historical meteorological records (temp, rain, humidity)
STOP_MASTER_FILE = DATA_DIR / "stop_master.csv"          # Master list of all 93 bus stops in Coimbatore
ROUTE_MASTER_FILE = DATA_DIR / "route_master.csv"        # Transit route definitions (endpoints, distances)
ROUTE_STOPS_FILE = DATA_DIR / "route_stops.csv"          # Stop sequences and orders for each route
ROUTE_TIMETABLE_FILE = DATA_DIR / "route_timetable.csv"  # Scheduled daily departure times per service
BUS_FILE = DATA_DIR / "bus_availability.csv"             # Depot fleet inventory (bus IDs, locations, capacities)

# SQLite Database Storage
DB_DIR = BACKEND_DIR / "db"
USERS_DB = DB_DIR / "users.db"                          # Authority credentials & active bus allocation log
FEEDBACK_DB = DB_DIR / "feedback.db"                    # Passenger usefulness feedback log

# Standard Bus Passenger Capacity (50 Seating + 20 Standing = 70 Total)
SEATING_CAPACITY = 50
STANDING_CAPACITY = 20
DEFAULT_CAPACITY = 70

# ==============================================================================
# 2. TRANSIT ROUTE METADATA (COIMBATORE NETWORK)
# ==============================================================================
# Maps each Service ID (e.g. S45, S33A) to route descriptions, terminal stops,
# normal daily patronage baseline, and default active buses assigned per day.
ROUTE_INFO = {
    "S45": {
        "name": "Route 45: Ukkadam ↔ Vellamadai (Sathy Rd / NH 209)",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Vellamadai",
        "base_daily_normal": 2240,
        "default_buses": 32,
    },
    "S57": {
        "name": "Route 57: Ukkadam ↔ Vellamadai (Via Cross Cut / Ganapathy)",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Vellamadai",
        "base_daily_normal": 2170,
        "default_buses": 30,
    },
    "S33A": {
        "name": "Route 33A: Gandhipuram ↔ Kinathukadavu (Pollachi Rd / NH 83)",
        "origin": "ST001",
        "dest": "ST076",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Kinathukadavu",
        "base_daily_normal": 1960,
        "default_buses": 28,
    },
    "S48": {
        "name": "Route 48: Gandhipuram ↔ Vanthavalam (Palakkad Rd / NH 544)",
        "origin": "ST001",
        "dest": "ST093",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Vanthavalam",
        "base_daily_normal": 2030,
        "default_buses": 28,
    },
    "S52": {
        "name": "Route 52: Ukkadam ↔ Vellamadai (Via Saravanampatti)",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Vellamadai",
        "base_daily_normal": 1890,
        "default_buses": 24,
    },
    "S95": {
        "name": "Route 95: Gandhipuram ↔ Kinathukadavu (Via SIDCO / Eachanari)",
        "origin": "ST001",
        "dest": "ST076",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Kinathukadavu",
        "base_daily_normal": 1820,
        "default_buses": 22,
    },
    "S1A": {
        "name": "Route 1A: Gandhipuram ↔ Vanthavalam (Via Kuniyamuthur)",
        "origin": "ST001",
        "dest": "ST093",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Vanthavalam",
        "base_daily_normal": 1750,
        "default_buses": 20,
    },
    "S109": {
        "name": "Route 109: Ondipudur ↔ Gandhipuram ↔ Saibaba Colony",
        "origin": "ST001",
        "dest": "ST049",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1988,
        "default_buses": 26,
    },
    "S3B": {
        "name": "Route 3B: Madukkarai ↔ Ukkadam ↔ Saibaba Colony",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1792,
        "default_buses": 22,
    },
    "S25": {
        "name": "Route 25: Perur ↔ Town Hall ↔ Saibaba Colony",
        "origin": "ST005",
        "dest": "ST049",
        "origin_name": "Town Hall",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1750,
        "default_buses": 20,
    },
    "S91": {
        "name": "Route 91: Kovaipudur ↔ Ukkadam ↔ Saibaba Colony",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1820,
        "default_buses": 22,
    },
    "S4B": {
        "name": "Route 4B: Ukkadam ↔ Saibaba Colony ↔ Press Colony",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1848,
        "default_buses": 24,
    },
    "S13B": {
        "name": "Route 13B: Ukkadam ↔ Saibaba Colony ↔ Thudiyalur",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1876,
        "default_buses": 24,
    },
    "S75": {
        "name": "Route 75: Gandhipuram ↔ Singanallur ↔ Irugur",
        "origin": "ST001",
        "dest": "ST076",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Singanallur",
        "base_daily_normal": 1806,
        "default_buses": 22,
    },
    "S64": {
        "name": "Route 64: Ukkadam ↔ Singanallur ↔ Ondipudur",
        "origin": "ST002",
        "dest": "ST093",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Ondipudur",
        "base_daily_normal": 1904,
        "default_buses": 25,
    },
    "S1": {
        "name": "Route 1: Ondipudur ↔ Singanallur ↔ Maniakarampalayam",
        "origin": "ST001",
        "dest": "ST093",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Ondipudur",
        "base_daily_normal": 1764,
        "default_buses": 20,
    },
}

# ==============================================================================
# 3. ROUTE DISPATCH START COORDINATES (GPS LAT/LON)
# ==============================================================================
# Used by the Smart Fleet Allocation algorithm to calculate the Haversine distance
# from available idle bus depots to the starting terminus of a congested route.
ROUTE_START_COORDS = {
    "S45":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S57":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S33A": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S48":  (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S52":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S95":  (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S1A":  (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S109": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S3B":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S25":  (10.9982, 76.9642, "Town Hall"),
    "S91":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S4B":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S13B": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S75":  (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S64":  (11.0000, 76.9700, "Ukkadam Terminal"),
    "S1":   (11.0018, 76.9674, "Gandhipuram Town Stand"),
}

# ==============================================================================
# 4. STANDARDIZED COMMUTER TIME SLOTS (6 DAILY WINDOWS)
# ==============================================================================
# 4. STANDARDIZED COMMUTER TIME SLOTS (24-HOUR TRANSIT WINDOWS)
# ==============================================================================
# Covers the full 24-hour cycle including morning peaks, midday, evening, and
# overnight depot standby / night feeder service.
TIME_SLOTS = [
    {
        "label": "06:00 AM – 08:00 AM",
        "slot_id": "slot_1",
        "times": ["06:25", "06:00", "06:45", "07:15", "07:30", "07:45"],
        "color": "#344A55",
        "title": "Early Morning"
    },
    {
        "label": "08:00 AM – 10:00 AM",
        "slot_id": "slot_2",
        "times": ["08:25", "08:00", "08:55", "09:00", "09:25", "09:30", "09:55", "08:45", "09:15", "09:45"],
        "color": "#F28705",
        "title": "Morning Peak"
    },
    {
        "label": "10:00 AM – 12:00 PM",
        "slot_id": "slot_3",
        "times": ["10:25", "10:00", "10:55", "10:30", "11:00", "10:15", "10:45", "11:15", "11:25"],
        "color": "#F29F05",
        "title": "Late Morning"
    },
    {
        "label": "12:00 PM – 02:00 PM",
        "slot_id": "slot_4",
        "times": ["12:25", "13:00", "12:15", "13:15", "13:25", "13:45"],
        "color": "#A6998A",
        "title": "Midday Transit"
    },
    {
        "label": "02:00 PM – 05:00 PM",
        "slot_id": "slot_5",
        "times": ["14:25", "15:00", "15:25", "14:15", "15:15", "16:00", "16:30", "16:45"],
        "color": "#C4E5F2",
        "title": "Afternoon Window"
    },
    {
        "label": "05:00 PM – 08:00 PM",
        "slot_id": "slot_6",
        "times": ["17:10", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30"],
        "color": "#BF5B04",
        "title": "Evening Peak"
    },
    {
        "label": "08:00 PM – 06:00 AM",
        "slot_id": "slot_7",
        "times": ["20:15", "20:30", "21:00", "21:30", "22:00", "04:45", "05:25"],
        "color": "#242930",
        "title": "Night Service"
    },
]

# ==============================================================================
# 5. MASTER GPS STOP COORDINATES (93 BUS STOPS ACROSS GREATER COIMBATORE)
# ==============================================================================
STOP_COORDS = {
    # ── Sathyamangalam Rd / Avinashi Rd Arterial Corridor (S45, S57) ──
    "ST001": [11.0168, 76.9672],  # Gandhipuram Town Bus Stand
    "ST002": [10.9904, 76.9608],  # Ukkadam Bus Terminal
    "ST003": [10.9942, 76.9615],  # Prakasam / Oppanakara St
    "ST004": [10.9965, 76.9625],  # Raja Street
    "ST005": [10.9982, 76.9642],  # Manikoondu / Town Hall
    "ST006": [10.9968, 76.9662],  # Five Corner
    "ST007": [10.9978, 76.9685],  # Coimbatore Junction Railway Station
    "ST008": [11.0015, 76.9688],  # Collector Office / State Bank Rd
    "ST009": [11.0048, 76.9698],  # D.S.P. Office / Huzur Rd
    "ST010": [11.0078, 76.9705],  # Oriental Insurance / Arts College
    "ST011": [11.0098, 76.9702],  # C.S.I. Immanuel Church / Avinashi Rd
    "ST012": [11.0118, 76.9690],  # C.S.I. School / Dr Nanjappa Rd
    "ST013": [11.0138, 76.9682],  # V.O.C. Park / Dr Nanjappa Rd
    "ST014": [11.0152, 76.9678],  # Park Gate / Dr Nanjappa Rd
    "ST015": [11.0168, 76.9672],  # Gandhipuram Central
    "ST016": [11.0210, 76.9695],  # G.P. Hospital / Sathyamangalam Rd
    "ST017": [11.0250, 76.9715],  # Lakshmipuram
    "ST018": [11.0290, 76.9735],  # Tex Tool / Velan Theatre
    "ST019": [11.0330, 76.9755],  # Ganapathy Bus Stop
    "ST020": [11.0370, 76.9775],  # Surya Hospital
    "ST021": [11.0410, 76.9795],  # C.M.S. School
    "ST022": [11.0450, 76.9815],  # Athipalayam Junction
    "ST023": [11.0490, 76.9835],  # Bharathi Nagar
    "ST024": [11.0530, 76.9855],  # Ramakrishna Mill
    "ST025": [11.0570, 76.9875],  # L.G.B. Nagar
    "ST026": [11.0610, 76.9895],  # Sivanandha Mills
    "ST027": [11.0650, 76.9915],  # Anandha Kumar Mills
    "ST028": [11.0690, 76.9935],  # S.R.P. Mills
    "ST029": [11.0730, 76.9955],  # Amman Kovil
    "ST030": [11.0770, 76.9975],  # G.K.S. Nagar
    "ST031": [11.0810, 76.9995],  # Kalapatti Pirivu
    "ST032": [11.0850, 77.0015],  # Saravanampatti Junction
    "ST033": [11.0900, 77.0040],  # Viswasapuram
    "ST034": [11.0950, 77.0065],  # Karattumedu
    "ST035": [11.1000, 77.0090],  # P.P.G. IT
    "ST036": [11.1050, 77.0115],  # S.N.S. College / Valiyampalayam
    "ST037": [11.1100, 77.0140],  # S.N.S. College
    "ST038": [11.1150, 77.0165],  # Sri Village Nagar
    "ST039": [11.1205, 77.0195],  # Kurumbapalayam
    "ST040": [11.1275, 77.0230],  # Kodia Park
    "ST041": [11.1345, 77.0265],  # Info Institute of Engineering
    "ST042": [11.1415, 77.0305],  # Kovilpalayam
    "ST043": [11.1465, 77.0335],  # S.S. Kulam
    "ST044": [11.1505, 77.0360],  # V.J. Nagar
    "ST045": [11.1545, 77.0385],  # Kottaipalayam
    "ST046": [11.1575, 77.0405],  # C.S.I. Colony
    "ST047": [11.1605, 77.0425],  # Agrahara Samakulam
    "ST048": [11.1635, 77.0445],  # Thottipalayam
    "ST049": [11.1665, 77.0465],  # Vellamadai / Saibaba Stand
    "ST050": [10.9855, 76.9630],  # Christ The King Church
    "ST051": [10.9982, 76.9642],  # Town Hall Central

    # ── Pollachi Rd / Eachanari / Kinathukadavu Corridor (S33A) ──
    "ST052": [10.9790, 76.9655],  # Karumbukadai
    "ST053": [10.9740, 76.9670],  # Athupalam
    "ST054": [10.9680, 76.9690],  # Kurichi Pirivu
    "ST055": [10.9630, 76.9705],  # Kurichi Housing Unit
    "ST056": [10.9580, 76.9720],  # Iyer Hospital
    "ST057": [10.9520, 76.9735],  # Sundarapuram
    "ST058": [10.9470, 76.9748],  # Gandhi Nagar
    "ST059": [10.9420, 76.9760],  # L.I.C. Colony
    "ST060": [10.9370, 76.9772],  # Sidco Industrial Estate
    "ST061": [10.9320, 76.9785],  # K.P.M. Matriculation School
    "ST062": [10.9270, 76.9800],  # Rathinam College
    "ST063": [10.9215, 76.9820],  # Eachanari Temple
    "ST064": [10.9160, 76.9840],  # Karpagam University
    "ST065": [10.9100, 76.9860],  # Ganesh Nagar
    "ST066": [10.9040, 76.9880],  # Malumichampatti Junction
    "ST067": [10.8980, 76.9900],  # Malumichampatti
    "ST068": [10.8920, 76.9920],  # Hindustan College
    "ST069": [10.8850, 76.9940],  # Othakal Mandapam
    "ST070": [10.8780, 76.9960],  # Karpagam Medical College
    "ST071": [10.8710, 76.9980],  # Premier Mills
    "ST072": [10.8640, 77.0000],  # Polytechnic College
    "ST073": [10.8570, 77.0020],  # Mailrapalayam
    "ST074": [10.8500, 77.0040],  # Kinathukadavu Check Post
    "ST075": [10.8430, 77.0060],  # Arulmigu Velayutha Swamy Temple
    "ST076": [10.8350, 77.0080],  # Kinathukadavu Bus Stand

    # ── Palakkad Rd / Kuniyamuthur / Madukkarai / KG Chavadi (S48) ──
    "ST077": [10.9650, 76.9520],  # Kuniyamuthur High School
    "ST078": [10.9600, 76.9490],  # Kuniyamuthur
    "ST079": [10.9550, 76.9460],  # Nehru College
    "ST080": [10.9500, 76.9430],  # Edayarpalayam Pirivu
    "ST081": [10.9450, 76.9400],  # Kuniyamuthur Police Station
    "ST082": [10.9400, 76.9370],  # B.K. Pudur
    "ST083": [10.9350, 76.9340],  # Kovaipudur Pirivu
    "ST084": [10.9280, 76.9300],  # Milekal
    "ST085": [10.9200, 76.9250],  # Madukkarai Police Station
    "ST086": [10.9120, 76.9200],  # Madukkarai Union Office
    "ST087": [10.9040, 76.9150],  # Marappalam
    "ST088": [10.8960, 76.9100],  # Chettipalayam Pirivu
    "ST089": [10.8880, 76.9050],  # Indian Bank
    "ST090": [10.8800, 76.9000],  # Thirumalayampalayam Pirivu
    "ST091": [10.8700, 76.8920],  # K.G. Chavadi
    "ST092": [10.8600, 76.8850],  # Pichanur
    "ST093": [10.8500, 76.8780],  # Vanthavalam
}

# ==============================================================================
# 6. DISTINCT UI BRAND HEX COLORS ASSIGNED TO EACH BUS ROUTE
# ==============================================================================
SERVICE_COLORS = {
    "S45":  "#BF5B04",  # Ochre Brown
    "S57":  "#F28705",  # Vibrant Orange
    "S33A": "#344A55",  # Deep Slate Teal
    "S48":  "#F29F05",  # Warm Amber
    "S52":  "#38bdf8",  # Sky Blue
    "S95":  "#10b981",  # Emerald Green
    "S1A":  "#8b5cf6",  # Violet
    "S109": "#ec4899",  # Pink
    "S3B":  "#f97316",  # Bright Orange
    "S25":  "#06b6d4",  # Cyan
    "S91":  "#14b8a6",  # Teal
    "S4B":  "#eab308",  # Yellow
    "S13B": "#a855f7",  # Purple
    "S75":  "#6366f1",  # Indigo
    "S64":  "#ef4444",  # Crimson Red
    "S1":   "#84cc16",  # Lime Green
}

