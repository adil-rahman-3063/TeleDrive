from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from fastapi import BackgroundTasks
import os
import uuid
import datetime
from database import fetch_all, fetch_one, execute_db, insert_db
from telegram_client import get_client, get_client_and_connect

router = APIRouter()

# 🔥 Get files inside a folder (active files only)
@router.get("/files/{user_id}/{folder_id}")
def get_files(user_id: str, folder_id: str):
    if folder_id == "root" or folder_id == "null":
        data = fetch_all(
            "SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL AND deleted_at IS NULL ORDER BY tg_message_id DESC", 
            (user_id,)
        )
    else:
        data = fetch_all(
            "SELECT * FROM files WHERE user_id = ? AND folder_id = ? AND deleted_at IS NULL ORDER BY tg_message_id DESC", 
            (user_id, folder_id)
        )
    return data

# 🔥 Download file using file_id
@router.get("/download/{user_id}/{file_id}")
async def download_file(user_id: str, file_id: str):
    record = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    CACHE_DIR = "local_cache"
    cache_filename = f"{file_id}_{record['file_name']}"
    cache_path = os.path.join(CACHE_DIR, cache_filename)

    if os.path.exists(cache_path):
        return FileResponse(cache_path)

    message_id = record["tg_message_id"]
    user_record = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
    channel_id = user_record.get("channel_id", "me") if user_record else "me"
    
    if channel_id and channel_id != "me":
        try:
            channel_id = int(channel_id)
        except ValueError:
            pass

    client = get_client(user_id)
    await client.start()

    message = await client.get_messages(channel_id, ids=message_id)
    # Download directly into local_cache path to serve instantly next time
    await message.download_media(file=cache_path)

    return FileResponse(cache_path)


# 🔥 Soft delete a file (move to trash)
@router.delete("/files/{user_id}/{file_id}")
def delete_file(user_id: str, file_id: str):
    now_str = datetime.datetime.utcnow().isoformat()
    rowcount = execute_db("UPDATE files SET deleted_at = ? WHERE id = ?", (now_str, file_id))
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="File not found")

    return {"status": "moved_to_trash"}


# 🔥 Restore a file from trash
@router.post("/files/{user_id}/{file_id}/restore")
def restore_file(user_id: str, file_id: str):
    rowcount = execute_db("UPDATE files SET deleted_at = NULL WHERE id = ?", (file_id,))
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="File not found")

    return {"status": "restored"}


# 🔥 Permanent delete file (immediate hard delete)
@router.delete("/files/{user_id}/{file_id}/permanent")
async def delete_file_permanent(user_id: str, file_id: str):
    record = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
        
    message_id = record["tg_message_id"]
    user_record = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
    channel_id = user_record.get("channel_id", "me") if user_record else "me"
    
    if channel_id and channel_id != "me":
        try:
            channel_id = int(channel_id)
        except ValueError:
            pass

    # Delete from Telegram
    client = get_client(user_id)
    await client.start()
    await client.delete_messages(channel_id, [message_id])

    # Delete from SQLite
    execute_db("DELETE FROM files WHERE id = ?", (file_id,))

    return {"status": "deleted_permanently"}


# 🔥 Move a file to another folder
@router.put("/files/{user_id}/{file_id}/move")
def move_file(user_id: str, file_id: str, new_folder_id: str):
    if new_folder_id == "null" or new_folder_id == "root":
        new_folder_id = None
        
    rowcount = execute_db("UPDATE files SET folder_id = ? WHERE id = ?", (new_folder_id, file_id))
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="File not found or failed to move")
        
    file = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
    return {"status": "moved", "file": file}


# 🔥 Copy a file to another folder
@router.post("/files/{user_id}/{file_id}/copy")
async def copy_file(user_id: str, file_id: str, new_folder_id: str):
    if new_folder_id == "null" or new_folder_id == "root":
        new_folder_id = None
        
    record = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
        
    message_id = record["tg_message_id"]
    user_record = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
    channel_id = user_record.get("channel_id", "me") if user_record else "me"
    
    if channel_id and channel_id != "me":
        try:
            channel_id = int(channel_id)
        except ValueError:
            pass

    client = await get_client_and_connect(user_id)
    message = await client.get_messages(channel_id, ids=message_id)

    if not message or not message.media:
        raise HTTPException(status_code=404, detail="Media not found on Telegram")

    new_message = await client.send_file(channel_id, message.media)

    new_id = str(uuid.uuid4())
    execute_db(
        "INSERT INTO files (id, folder_id, tg_message_id, file_name, file_size, mime_type, user_id, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
        (new_id, new_folder_id, new_message.id, record["file_name"], record["file_size"], record["mime_type"], user_id)
    )

    new_record = fetch_one("SELECT * FROM files WHERE id = ?", (new_id,))
    return {"status": "copied", "file": new_record}


# 🔥 Rename a file
@router.put("/files/{user_id}/{file_id}/rename")
def rename_file(user_id: str, file_id: str, new_name: str):
    rowcount = execute_db("UPDATE files SET file_name = ? WHERE id = ?", (new_name, file_id))
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="File not found or failed to rename")
        
    file = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
    return {"status": "renamed", "file": file}