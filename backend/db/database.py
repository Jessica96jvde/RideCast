import sqlite3
import hashlib
import datetime
import pandas as pd
from backend.config import USERS_DB, FEEDBACK_DB


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def init_db():
    USERS_DB.parent.mkdir(parents=True, exist_ok=True)
    
    # 1. Users & Allocations DB
    con = sqlite3.connect(USERS_DB)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'authority'
        )
    """)
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO users VALUES (?, ?, ?)",
            ("admin", _hash("admin123"), "authority")
        )

    cur.execute("""
        CREATE TABLE IF NOT EXISTS allocations (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            date         TEXT NOT NULL,
            service_id   TEXT NOT NULL,
            route_name   TEXT NOT NULL,
            bus_id       TEXT NOT NULL,
            bus_number   TEXT NOT NULL,
            source_depot TEXT NOT NULL,
            distance_km  REAL NOT NULL,
            reason       TEXT NOT NULL,
            allocated_by TEXT NOT NULL DEFAULT 'Ravi (Transport Authority)',
            timestamp    TEXT NOT NULL
        )
    """)

    cur.execute("SELECT COUNT(*) FROM allocations")
    if cur.fetchone()[0] == 0:
        initial_allocs = [
            ("2026-08-20", "S45", "45: Ukkadam ↔ Vellamadai", "BUS-205", "TN-38-N-2450", "Ukkadam Depot", 1.2, "Heavy morning commuter surge (08:00–10:00)", "Ravi (Transport Authority)", "2026-08-20 07:45:00"),
            ("2026-08-21", "S57", "57: Ukkadam ↔ Vellamadai", "BUS-108", "TN-38-N-1892", "Gandhipuram Depot", 3.4, "Rainfall surge and school reopening rush", "Ravi (Transport Authority)", "2026-08-21 08:10:00"),
            ("2026-08-22", "S33A", "33A: Gandhipuram ↔ Kinathukadavu", "BUS-301", "TN-38-N-3104", "Singanallur Depot", 2.1, "Evening weekend traffic peak (17:00–19:00)", "Ravi (Transport Authority)", "2026-08-22 16:30:00"),
            ("2026-08-23", "S48", "48: Gandhipuram ↔ Vanthavalam", "BUS-150", "TN-38-N-1505", "Ondipudur Depot", 2.8, "Sunday festival shopping crowd at Town Hall", "Ravi (Transport Authority)", "2026-08-23 11:15:00"),
            ("2026-08-24", "S45", "45: Ukkadam ↔ Vellamadai", "BUS-112", "TN-38-N-1120", "Saibaba Colony Stand", 1.8, "Monday morning office rush hour", "Ravi (Transport Authority)", "2026-08-24 07:50:00"),
            ("2026-08-25", "S57", "57: Ukkadam ↔ Vellamadai", "BUS-220", "TN-38-N-2201", "Town Hall Terminus", 2.0, "High passenger density on shared corridor", "Ravi (Transport Authority)", "2026-08-25 08:30:00"),
            ("2026-08-25", "S33A", "33A: Gandhipuram ↔ Kinathukadavu", "BUS-305", "TN-38-N-3058", "Ganapathy Stand", 4.2, "Evening office departure congestion", "Ravi (Transport Authority)", "2026-08-25 17:15:00"),
        ]
        cur.executemany("""
            INSERT INTO allocations (date, service_id, route_name, bus_id, bus_number, source_depot, distance_km, reason, allocated_by, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_allocs)

    con.commit()
    con.close()

    # 2. Feedback DB
    init_feedback_db()


def init_feedback_db():
    con = sqlite3.connect(FEEDBACK_DB)
    con.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            useful    TEXT NOT NULL,
            from_stop TEXT,
            to_stop   TEXT,
            time_slot TEXT,
            created   TEXT
        )
    """)
    con.commit()
    con.close()


def verify_user(username: str, password: str) -> bool:
    init_db()
    con = sqlite3.connect(USERS_DB)
    cur = con.cursor()
    cur.execute("SELECT password FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    con.close()
    return row is not None and row[0] == _hash(password)


def save_allocation(
    date_str: str,
    service_id: str,
    route_name: str,
    bus_id: str,
    bus_number: str,
    source_depot: str,
    distance_km: float,
    reason: str,
    allocated_by: str = "Officer Rajesh Kumar"
):
    init_db()
    con = sqlite3.connect(USERS_DB)
    cur = con.cursor()
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        INSERT INTO allocations (date, service_id, route_name, bus_id, bus_number, source_depot, distance_km, reason, allocated_by, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (date_str, service_id, route_name, bus_id, bus_number, source_depot, distance_km, reason, allocated_by, ts))
    con.commit()
    con.close()


def get_allocation_history() -> pd.DataFrame:
    init_db()
    con = sqlite3.connect(USERS_DB)
    df = pd.read_sql_query("SELECT * FROM allocations ORDER BY id DESC", con)
    con.close()
    return df


def get_allocations_for_date(date_str: str) -> pd.DataFrame:
    init_db()
    con = sqlite3.connect(USERS_DB)
    df = pd.read_sql_query("SELECT * FROM allocations WHERE date = ? ORDER BY id DESC", con, params=(date_str,))
    con.close()
    return df


def save_feedback(useful: bool, from_stop: str = "", to_stop: str = "", time_slot: str = ""):
    init_feedback_db()
    con = sqlite3.connect(FEEDBACK_DB)
    con.execute(
        "INSERT INTO feedback (useful, from_stop, to_stop, time_slot, created) VALUES (?,?,?,?,?)",
        ("Yes" if useful else "No", from_stop, to_stop, time_slot, datetime.datetime.now().isoformat())
    )
    con.commit()
    con.close()


def get_all_feedback() -> list[dict]:
    init_feedback_db()
    con = sqlite3.connect(FEEDBACK_DB)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("SELECT * FROM feedback ORDER BY id DESC")
    rows = [dict(row) for row in cur.fetchall()]
    con.close()
    return rows
