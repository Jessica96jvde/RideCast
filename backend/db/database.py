"""
RideCast - SQLite Database & Persistence Layer
==============================================
This module manages all local relational data storage using Python's built-in `sqlite3` library.
It handles user authentication credentials, fleet allocation audit logs, and passenger feedback.

Database Tables:
1. `users`        - Stores authorized officer credentials (passwords hashed via SHA-256).
2. `allocations`  - Records every smart bus dispatch executed by the Transport Authority.
3. `feedback`     - Collects commuter accuracy ratings and travel satisfaction votes.
"""

import sqlite3
import hashlib
import datetime
import pandas as pd
from typing import List, Dict, Any, Optional

from backend.config import USERS_DB, FEEDBACK_DB


def _hash(password: str) -> str:
    """
    Computes a cryptographic SHA-256 hex digest for passwords.
    Never store plaintext passwords in a database!
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def init_db():
    """
    Initializes the SQLite database tables if they do not exist.
    Also seeds the default admin user and initial historical allocation records.
    """
    # Ensure parent directory (auth/) exists
    USERS_DB.parent.mkdir(parents=True, exist_ok=True)
    
    # --------------------------------------------------------------------------
    # 1. Users & Fleet Allocations Database (auth/users.db)
    # --------------------------------------------------------------------------
    con = sqlite3.connect(USERS_DB)
    cur = con.cursor()

    # Create Users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'authority'
        )
    """)

    # Seed default admin user (admin / admin123) if table is empty
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            ("admin", _hash("admin123"), "authority")
        )

    # Create Allocations Audit Log table
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
            allocated_by TEXT NOT NULL DEFAULT 'Ravi',
            timestamp    TEXT NOT NULL
        )
    """)

    # Seed sample realistic allocations if table is empty
    cur.execute("SELECT COUNT(*) FROM allocations")
    if cur.fetchone()[0] == 0:
        initial_allocs = [
            ("2026-08-20", "S45", "45: Ukkadam ↔ Vellamadai", "BUS-205", "TN-38-N-2450", "Ukkadam Depot", 1.2, "Predicted morning peak overcrowding", "Ravi", "2026-08-20 07:45:00"),
            ("2026-08-21", "S57", "57: Ukkadam ↔ Vellamadai", "BUS-108", "TN-38-N-1892", "Marudhamalai Depot", 3.4, "Peak-hour commuter surge demand", "Ravi", "2026-08-21 08:10:00"),
            ("2026-08-22", "S33A", "33A: Gandhipuram ↔ Kinathukadavu", "BUS-301", "TN-38-N-3104", "Sungam Depot", 2.1, "Evening weekend traffic peak demand", "Ravi", "2026-08-22 16:30:00"),
            ("2026-08-23", "S48", "48: Gandhipuram ↔ Vanthavalam", "BUS-150", "TN-38-N-1505", "Ondipudur Depot", 2.8, "Special event festival crowd demand", "Ravi", "2026-08-23 11:15:00"),
            ("2026-08-24", "S45", "45: Ukkadam ↔ Vellamadai", "BUS-206", "TN-38-N-2481", "Ukkadam Depot", 1.8, "Predicted morning peak overcrowding", "Ravi", "2026-08-24 07:50:00"),
            ("2026-08-25", "S57", "57: Ukkadam ↔ Vellamadai", "BUS-220", "TN-38-N-2201", "Uppilipalayam Depot", 2.0, "High passenger density on shared corridor", "Ravi", "2026-08-25 08:30:00"),
            ("2026-08-25", "S33A", "33A: Gandhipuram ↔ Kinathukadavu", "BUS-302", "TN-38-N-3120", "Sungam Depot", 2.5, "Evening office departure congestion", "Ravi", "2026-08-25 17:15:00"),
        ]
        cur.executemany("""
            INSERT INTO allocations (date, service_id, route_name, bus_id, bus_number, source_depot, distance_km, reason, allocated_by, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_allocs)

    con.commit()
    con.close()

    # --------------------------------------------------------------------------
    # 2. Feedback Database (auth/feedback.db)
    # --------------------------------------------------------------------------
    init_feedback_db()


def init_feedback_db():
    """Initializes the feedback table for collecting commuter ratings."""
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
    """
    Validates authority officer login credentials against the hashed password in SQLite.
    Returns True if valid, False otherwise.
    """
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
    allocated_by: str = "Ravi"
):
    """
    Persists a new smart bus allocation record into the SQLite database.
    """
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
    """
    Retrieves all recorded bus allocations as a pandas DataFrame, sorted by newest first.
    """
    init_db()
    con = sqlite3.connect(USERS_DB)
    df = pd.read_sql_query("SELECT * FROM allocations ORDER BY id DESC", con)
    con.close()
    return df


def get_allocations_for_date(date_str: str) -> pd.DataFrame:
    """
    Retrieves bus allocations specifically for a given target date (YYYY-MM-DD).
    """
    init_db()
    con = sqlite3.connect(USERS_DB)
    df = pd.read_sql_query(
        "SELECT * FROM allocations WHERE date = ? ORDER BY id DESC",
        con,
        params=(date_str,)
    )
    con.close()
    return df


def save_feedback(useful: bool, from_stop: str = "", to_stop: str = "", time_slot: str = ""):
    """
    Saves a commuter feedback vote to auth/feedback.db.
    """
    init_feedback_db()
    con = sqlite3.connect(FEEDBACK_DB)
    con.execute(
        "INSERT INTO feedback (useful, from_stop, to_stop, time_slot, created) VALUES (?,?,?,?,?)",
        ("Yes" if useful else "No", from_stop, to_stop, time_slot, datetime.datetime.now().isoformat())
    )
    con.commit()
    con.close()


def get_all_feedback() -> List[Dict[str, Any]]:
    """
    Retrieves all commuter feedback records as a list of dictionaries.
    """
    init_feedback_db()
    con = sqlite3.connect(FEEDBACK_DB)
    con.row_factory = sqlite3.Row  # Enables column-name indexing on rows
    cur = con.cursor()
    cur.execute("SELECT * FROM feedback ORDER BY id DESC")
    rows = [dict(row) for row in cur.fetchall()]
    con.close()
    return rows
