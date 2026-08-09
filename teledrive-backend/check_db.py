import sqlite3

def check():
    conn = sqlite3.connect("teledrive.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("--- FOLDERS ---")
    cursor.execute("SELECT * FROM folders")
    for r in cursor.fetchall():
        print(dict(r))
        
    print("\n--- FILES ---")
    cursor.execute("SELECT * FROM files")
    for r in cursor.fetchall():
        print(dict(r))
        
    conn.close()

if __name__ == "__main__":
    check()
