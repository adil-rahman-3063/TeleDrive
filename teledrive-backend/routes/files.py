from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
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
        
    user_record = fetch_one("SELECT download_path FROM users WHERE phone = ?", (user_id,))
    custom_path = user_record.get("download_path") if user_record else None
    CACHE_DIR = custom_path if custom_path else "local_cache"
    
    for file in data:
        cache_filename = f"{file['id']}_{file['file_name']}"
        cache_path = os.path.join(CACHE_DIR, cache_filename)
        file["is_cached"] = os.path.exists(cache_path)
        
    return data

# 🔥 Download file using file_id (background caching)
async def bg_cache_download(user_id: str, channel_id, message_id, cache_path: str):
    tmp_path = cache_path + ".tmp"
    try:
        if os.path.exists(cache_path) or os.path.exists(tmp_path):
            return
        client = await get_client_and_connect(user_id)
        message = await client.get_messages(channel_id, ids=message_id)
        if message and message.media:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            await message.download_media(file=tmp_path)
            if os.path.exists(tmp_path):
                os.rename(tmp_path, cache_path)
    except Exception as e:
        print("BG Cache Download failed:", e)
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

# 🔥 Download file using file_id (Range-compliant streaming + background caching)
@router.get("/download/{user_id}/{file_id}")
async def download_file(user_id: str, file_id: str, request: Request, background_tasks: BackgroundTasks):
    record = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    user_record = fetch_one("SELECT download_path FROM users WHERE phone = ?", (user_id,))
    custom_path = user_record.get("download_path") if user_record else None
    CACHE_DIR = custom_path if custom_path else "local_cache"

    cache_filename = f"{file_id}_{record['file_name']}"
    cache_path = os.path.join(CACHE_DIR, cache_filename)

    if os.path.exists(cache_path):
        return FileResponse(cache_path)

    message_id = record["tg_message_id"]
    channel_id = record.get("channel_id")
    if not channel_id:
        user_record = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
        channel_id = user_record.get("channel_id", "me") if user_record else "me"
    
    if channel_id and channel_id != "me":
        try:
            channel_id = int(channel_id)
        except ValueError:
            pass

    # Start caching in background so future requests load instantly from disk
    background_tasks.add_task(bg_cache_download, user_id, channel_id, message_id, cache_path)

    client = await get_client_and_connect(user_id)
    message = await client.get_messages(channel_id, ids=message_id)
    if not message or not message.media:
        raise HTTPException(status_code=404, detail="Media not found on Telegram")

    range_header = request.headers.get("Range")
    start_byte = 0
    total_size = record["file_size"]
    end_byte = total_size - 1

    status_code = 200
    if range_header:
        try:
            range_val = range_header.replace("bytes=", "").strip()
            parts = range_val.split("-")
            if parts[0]:
                start_byte = int(parts[0])
            if parts[1]:
                end_byte = int(parts[1])
            status_code = 206
        except Exception:
            pass

    content_length = end_byte - start_byte + 1

    async def stream_generator():
        async for chunk in client.iter_download(
            message.media,
            offset=start_byte,
            request_size=512 * 1024, # 512KB chunks for direct streaming throughput
            limit=content_length
        ):
            yield chunk

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": record["mime_type"] or "application/octet-stream",
        "Content-Disposition": f'inline; filename="{record["file_name"]}"'
    }
    if range_header:
        headers["Content-Range"] = f"bytes {start_byte}-{end_byte}/{total_size}"

    return StreamingResponse(
        stream_generator(),
        status_code=status_code,
        headers=headers
    )


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
    client = await get_client_and_connect(user_id)
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


# 🔥 Sync files from Telegram channel into root folder
@router.post("/sync/{user_id}")
async def sync_telegram_channel(user_id: str):
    try:
        from telegram_client import normalize_phone
        user_id = normalize_phone(user_id)
        
        user_record = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
        if not user_record or not user_record.get("channel_id"):
            raise HTTPException(status_code=400, detail="No Telegram channel connected.")
            
        channel_id = user_record["channel_id"]
        if channel_id != "me":
            try:
                channel_id = int(channel_id)
            except ValueError:
                pass
                
        client = await get_client_and_connect(user_id)
        
        synced_count = 0
        async for message in client.iter_messages(channel_id):
            if message.media:
                # Check if message ID is already synced
                exists = fetch_one(
                    "SELECT id FROM files WHERE user_id = ? AND tg_message_id = ?",
                    (user_id, message.id)
                )
                if not exists:
                    # Use Telethon helper
                    file_helper = message.file
                    if file_helper:
                        file_name = file_helper.name
                        if not file_name:
                            if message.photo:
                                file_name = f"photo_{message.id}.jpg"
                            else:
                                file_name = f"file_{message.id}"
                                
                        file_size = file_helper.size or 0
                        mime_type = file_helper.mime_type or "application/octet-stream"
                        
                        # Insert into SQLite root folder (folder_id=None)
                        new_id = str(uuid.uuid4())
                        execute_db(
                            "INSERT INTO files (id, folder_id, tg_message_id, file_name, file_size, mime_type, user_id, deleted_at) VALUES (?, NULL, ?, ?, ?, ?, ?, NULL)",
                            (new_id, message.id, file_name, file_size, mime_type, user_id)
                        )
                        synced_count += 1
                        
        return {"status": "success", "synced_count": synced_count}
    except Exception as e:
        import traceback
        print("SYNC ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# 🔥 Get background caching progress of a file
@router.get("/download-progress/{file_id}")
def get_download_progress(file_id: str):
    try:
        record = fetch_one("SELECT * FROM files WHERE id = ?", (file_id,))
        if not record:
            raise HTTPException(status_code=404, detail="File not found")

        user_id = record["user_id"]
        user_record = fetch_one("SELECT download_path FROM users WHERE phone = ?", (user_id,))
        custom_path = user_record.get("download_path") if user_record else None
        CACHE_DIR = custom_path if custom_path else "local_cache"

        cache_filename = f"{file_id}_{record['file_name']}"
        cache_path = os.path.join(CACHE_DIR, cache_filename)
        tmp_path = cache_path + ".tmp"

        if os.path.exists(cache_path):
            return {"progress": 100, "status": "cached"}
            
        if os.path.exists(tmp_path):
            current_size = os.path.getsize(tmp_path)
            total_size = record["file_size"] or 1
            progress = min(99, int((current_size / total_size) * 100))
            return {"progress": progress, "status": "downloading"}
            
        return {"progress": 0, "status": "not_started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))