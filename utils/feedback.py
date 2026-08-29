import sqlite3
from pathlib import Path
from datetime import datetime

DB_FILE = Path(__file__).resolve().parents[1] / "auth" / "feedback.db"


def init_feedback_db():
    con = sqlite3.connect(DB_FILE)
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


def save_feedback(useful: bool, from_stop: str, to_stop: str, time_slot: str):
    init_feedback_db()
    con = sqlite3.connect(DB_FILE)
    con.execute(
        "INSERT INTO feedback (useful, from_stop, to_stop, time_slot, created) VALUES (?,?,?,?,?)",
        ("Yes" if useful else "No", from_stop, to_stop, time_slot, datetime.now().isoformat())
    )
    con.commit()
    con.close()
