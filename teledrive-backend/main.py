from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all routes
from routes import upload, files, folders, auth

app = FastAPI(title="TeleDrive API")

import asyncio
import datetime
from database import fetch_all, fetch_one, execute_db

@app.get("/health")
def health_check():
    return {"status": "ok"}

async def purge_expired_trash_loop():
    while True:
        try:
            from telegram_client import get_client
            # 24 hours ago
            cutoff = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat()
            
            # 1. Purge expired files
            expired_files = fetch_all("SELECT * FROM files WHERE deleted_at IS NOT NULL AND deleted_at < ?", (cutoff,))
            for file in expired_files:
                try:
                    user_id = file["user_id"]
                    msg_id = file["tg_message_id"]
                    user_record = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
                    channel_id = user_record.get("channel_id", "me") if user_record else "me"
                    if channel_id != "me":
                        channel_id = int(channel_id)
                        
                    client = get_client(user_id)
                    await client.connect()
                    await client.delete_messages(channel_id, [msg_id])
                except Exception as e:
                    print("Failed to delete expired file from Telegram:", e)
                    
            if expired_files:
                file_ids = [f["id"] for f in expired_files]
                placeholders = ",".join("?" for _ in file_ids)
                execute_db(f"DELETE FROM files WHERE id IN ({placeholders})", tuple(file_ids))
                
            # 2. Purge expired folders
            expired_folders = fetch_all("SELECT * FROM folders WHERE deleted_at IS NOT NULL AND deleted_at < ?", (cutoff,))
            if expired_folders:
                folder_ids = [f["id"] for f in expired_folders]
                placeholders = ",".join("?" for _ in folder_ids)
                execute_db(f"DELETE FROM folders WHERE id IN ({placeholders})", tuple(folder_ids))
                
        except Exception as err:
            print("Purge garbage collection loop error:", err)
            
        await asyncio.sleep(600) # Run every 10 minutes

@app.on_event("startup")
async def startup_event():
    import shutil
    import os
    if os.path.exists("local_cache"):
        shutil.rmtree("local_cache")
    os.makedirs("local_cache", exist_ok=True)
    asyncio.create_task(purge_expired_trash_loop())

@app.on_event("shutdown")
def shutdown_event():
    import shutil
    import os
    if os.path.exists("local_cache"):
        shutil.rmtree("local_cache")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routes
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(files.router)
app.include_router(folders.router)