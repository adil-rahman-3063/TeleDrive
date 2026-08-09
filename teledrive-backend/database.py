import sqlite3
import os

DB_FILE = "teledrive.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            phone TEXT PRIMARY KEY,
            channel_id TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            user_id TEXT,
            deleted_at TEXT,
            FOREIGN KEY (parent_id) REFERENCES folders(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            folder_id INTEGER,
            tg_message_id INTEGER,
            file_name TEXT,
            file_size INTEGER,
            mime_type TEXT,
            user_id TEXT,
            deleted_at TEXT,
            FOREIGN KEY (folder_id) REFERENCES folders(id)
        )
    """)
    
    try:
        cursor.execute("ALTER TABLE folders ADD COLUMN deleted_at TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
        
    try:
        cursor.execute("ALTER TABLE files ADD COLUMN deleted_at TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN original_quality INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists

    conn.commit()
    conn.close()

# Auto-initialize database on startup
init_db()

# DB Helper functions
def fetch_all(query: str, params: tuple = ()) -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def fetch_one(query: str, params: tuple = ()) -> dict | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def execute_db(query: str, params: tuple = ()) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    conn.commit()
    rowcount = cursor.rowcount
    conn.close()
    return rowcount

def insert_db(query: str, params: tuple = ()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id