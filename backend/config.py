import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "dataset" / "data"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = PROJECT_ROOT / "dataset" / "model"
AUTH_DIR = PROJECT_ROOT / "auth"

# Data file paths
MODEL_FILE = MODEL_DIR / "ridecast_lstm.keras"
SCALER_FILE = PROCESSED_DIR / "scaler.pkl"
ENCODERS_FILE = PROCESSED_DIR / "encoders.pkl"
ENCODED_RIDERSHIP_FILE = PROCESSED_DIR / "encoded_ridership.csv"

HISTORY_FILE = DATA_DIR / "historical_ridership.csv"
HOLIDAY_FILE = DATA_DIR / "holiday_master.csv"
WEATHER_FILE = DATA_DIR / "weather_history.csv"
STOP_MASTER_FILE = DATA_DIR / "stop_master.csv"
ROUTE_MASTER_FILE = DATA_DIR / "route_master.csv"
ROUTE_STOPS_FILE = DATA_DIR / "route_stops.csv"
ROUTE_TIMETABLE_FILE = DATA_DIR / "route_timetable.csv"
BUS_FILE = DATA_DIR / "bus_availability.csv"

# DB file paths
USERS_DB = AUTH_DIR / "users.db"
FEEDBACK_DB = AUTH_DIR / "feedback.db"

# Route & Network constants
ROUTE_INFO = {
    "S45": {
        "name": "45: Ukkadam ↔ Vellamadai (Sathy Rd / NH 209)",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Vellamadai",
        "base_daily_normal": 1600,
        "default_buses": 32,
    },
    "S57": {
        "name": "57: Ukkadam ↔ Vellamadai (Via Cross Cut / Ganapathy)",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Vellamadai",
        "base_daily_normal": 1550,
        "default_buses": 30,
    },
    "S33A": {
        "name": "33A: Gandhipuram ↔ Kinathukadavu (Pollachi Rd / NH 83)",
        "origin": "ST001",
        "dest": "ST076",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Kinathukadavu",
        "base_daily_normal": 1400,
        "default_buses": 28,
    },
    "S48": {
        "name": "48: Gandhipuram ↔ Vanthavalam (Palakkad Rd / NH 544)",
        "origin": "ST001",
        "dest": "ST093",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Vanthavalam",
        "base_daily_normal": 1450,
        "default_buses": 28,
    },
    "S52": {
        "name": "52: Ukkadam ↔ Vellamadai (Via Saravanampatti)",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Vellamadai",
        "base_daily_normal": 1350,
        "default_buses": 24,
    },
    "S95": {
        "name": "95: Gandhipuram ↔ Kinathukadavu (Via SIDCO / Eachanari)",
        "origin": "ST001",
        "dest": "ST076",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Kinathukadavu",
        "base_daily_normal": 1300,
        "default_buses": 22,
    },
    "S1A": {
        "name": "1A: Gandhipuram ↔ Vanthavalam (Via Kuniyamuthur)",
        "origin": "ST001",
        "dest": "ST093",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Vanthavalam",
        "base_daily_normal": 1250,
        "default_buses": 20,
    },
    "S109": {
        "name": "109: Ondipudur ↔ Gandhipuram ↔ Saibaba Colony",
        "origin": "ST001",
        "dest": "ST049",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1420,
        "default_buses": 26,
    },
    "S3B": {
        "name": "3B: Madukkarai ↔ Ukkadam ↔ Saibaba Colony",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1280,
        "default_buses": 22,
    },
    "S25": {
        "name": "25: Perur ↔ Town Hall ↔ Saibaba Colony",
        "origin": "ST005",
        "dest": "ST049",
        "origin_name": "Town Hall",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1250,
        "default_buses": 20,
    },
    "S91": {
        "name": "91: Kovaipudur ↔ Ukkadam ↔ Saibaba Colony",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1300,
        "default_buses": 22,
    },
    "S4B": {
        "name": "4B: Ukkadam ↔ Saibaba Colony ↔ Press Colony",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1320,
        "default_buses": 24,
    },
    "S13B": {
        "name": "13B: Ukkadam ↔ Saibaba Colony ↔ Thudiyalur",
        "origin": "ST002",
        "dest": "ST049",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Saibaba Colony",
        "base_daily_normal": 1340,
        "default_buses": 24,
    },
    "S75": {
        "name": "75: Gandhipuram ↔ Singanallur ↔ Irugur",
        "origin": "ST001",
        "dest": "ST076",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Singanallur",
        "base_daily_normal": 1290,
        "default_buses": 22,
    },
    "S64": {
        "name": "64: Ukkadam ↔ Singanallur ↔ Ondipudur",
        "origin": "ST002",
        "dest": "ST093",
        "origin_name": "Ukkadam Terminal",
        "dest_name": "Ondipudur",
        "base_daily_normal": 1360,
        "default_buses": 25,
    },
    "S1": {
        "name": "S1: Ondipudur ↔ Singanallur ↔ Maniakarampalayam",
        "origin": "ST001",
        "dest": "ST093",
        "origin_name": "Gandhipuram Town Stand",
        "dest_name": "Ondipudur",
        "base_daily_normal": 1260,
        "default_buses": 20,
    },
}

ROUTE_START_COORDS = {
    "S45": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S57": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S33A": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S48": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S52": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S95": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S1A": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S109": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S3B": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S25": (10.9982, 76.9642, "Town Hall"),
    "S91": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S4B": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S13B": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S75": (11.0018, 76.9674, "Gandhipuram Town Stand"),
    "S64": (11.0000, 76.9700, "Ukkadam Terminal"),
    "S1": (11.0018, 76.9674, "Gandhipuram Town Stand"),
}

TIME_SLOTS = [
    {"label": "06:00 – 08:00", "slot_id": "slot_1", "times": ["06:00", "06:25", "05:25", "04:45", "05:45"], "color": "#344A55"},
    {"label": "08:00 – 10:00", "slot_id": "slot_2", "times": ["08:00", "08:25", "08:55", "09:00", "09:25", "09:30", "09:55", "08:45", "09:15", "09:45"], "color": "#F28705"},
    {"label": "10:00 – 12:00", "slot_id": "slot_3", "times": ["10:00", "10:25", "10:55", "10:30", "11:00", "10:15", "10:45", "11:15", "11:25"], "color": "#F29F05"},
    {"label": "12:00 – 14:00", "slot_id": "slot_4", "times": ["12:25", "13:00", "12:15", "13:15"], "color": "#A6998A"},
    {"label": "14:00 – 16:00", "slot_id": "slot_5", "times": ["13:25", "15:00", "14:25", "15:25", "14:15", "15:15"], "color": "#C4E5F2"},
    {"label": "16:00 – 20:00", "slot_id": "slot_6", "times": ["17:00", "17:10", "17:25", "17:30", "18:00", "17:15", "17:45", "18:15", "18:25", "18:45", "18:55", "19:00", "19:15", "19:25", "19:45", "19:50", "20:15"], "color": "#BF5B04"},
]

DEFAULT_CAPACITY = 50
