import sqlite3

conn = sqlite3.connect("teledrive.db")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables in DB:", cursor.fetchall())
conn.close()
