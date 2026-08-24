import sqlite3
import hashlib
from pathlib import Path

DB_FILE = Path(__file__).resolve().parents[1] / "auth" / "users.db"


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'authority'
        )
    """)
    # seed default admin if table is empty
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO users VALUES (?, ?, ?)",
            ("admin", _hash("admin123"), "authority")
        )
    con.commit()
    con.close()


def verify_user(username: str, password: str) -> bool:
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT password FROM users WHERE username = ?", (username,)
    )
    row = cur.fetchone()
    con.close()
    return row is not None and row[0] == _hash(password)
