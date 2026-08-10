from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from typing import Optional
import uuid
import os
from database import fetch_one, fetch_all, execute_db
from telegram_client import get_client, get_client_and_connect, normalize_phone

router = APIRouter()

# 🔹 Background task to handle upload from local server to Telegram channel
async def bg_telegram_upload(upload_id: str, user_id: str, folder_id: Optional[str], file_name: str, temp_path: str, file_size: int, mime_type: str):
    try:
        user_id = normalize_phone(user_id)
        client = await get_client_and_connect(user_id)
        
        user_data = fetch_one("SELECT channel_id, original_quality FROM users WHERE phone = ?", (user_id,))
        if not user_data or not user_data.get("channel_id"):
            raise ValueError("No Telegram storage channel connected. Please link a channel first.")

        channel_id = user_data["channel_id"]
        original_quality = bool(user_data.get("original_quality", 0))

        if channel_id and channel_id != "me":
            try:
                channel_id = int(channel_id)
            except ValueError:
                pass

        # Progress tracking callback updating SQLite table
        async def progress_callback(current, total):
            percent = min(99, int((current / total) * 100))
            execute_db("UPDATE uploads SET progress = ? WHERE id = ?", (percent, upload_id))
            from routes.ws import manager
            await manager.broadcast_to_user(user_id, {
                "type": "upload_progress",
                "id": upload_id,
                "progress": percent,
                "status": "uploading"
            })

        try:
            msg = await client.send_file(
                channel_id, 
                temp_path, 
                force_document=original_quality,
                progress_callback=progress_callback
            )
        except Exception as upload_err:
            print(f"[TeleDrive] Standard upload failed, falling back to force_document=True: {upload_err}")
            msg = await client.send_file(
                channel_id, 
                temp_path, 
                force_document=True,
                progress_callback=progress_callback
            )

        # Successful upload! Save metadata to files table
        new_file_id = str(uuid.uuid4())
        execute_db(
            "INSERT INTO files (id, folder_id, tg_message_id, file_name, file_size, mime_type, user_id, deleted_at, channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)",
            (new_file_id, folder_id, msg.id, file_name, file_size, mime_type, user_id, str(channel_id))
        )

        # Update status to completed
        execute_db("UPDATE uploads SET progress = 100, status = 'completed' WHERE id = ?", (upload_id,))
        from routes.ws import manager
        await manager.broadcast_to_user(user_id, {
            "type": "upload_progress",
            "id": upload_id,
            "progress": 100,
            "status": "completed"
        })
    except Exception as err:
        print("BG Upload failed:", err)
        execute_db("UPDATE uploads SET status = 'failed' WHERE id = ?", (upload_id,))
        from routes.ws import manager
        try:
            await manager.broadcast_to_user(user_id, {
                "type": "upload_progress",
                "id": upload_id,
                "progress": 0,
                "status": "failed"
            })
        except Exception:
            pass
    finally:
        # Delete temporary file from local server
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    folder_id: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        user_id = normalize_phone(user_id)
        if folder_id == "null" or folder_id == "" or folder_id == "root":
            folder_id = None

        # Check for duplicate file name in target folder
        if folder_id:
            duplicate_check = fetch_one(
                "SELECT id FROM files WHERE user_id = ? AND folder_id = ? AND file_name = ? AND deleted_at IS NULL",
                (user_id, folder_id, file.filename)
            )
        else:
            duplicate_check = fetch_one(
                "SELECT id FROM files WHERE user_id = ? AND folder_id IS NULL AND file_name = ? AND deleted_at IS NULL",
                (user_id, file.filename)
            )

        if duplicate_check:
            raise HTTPException(status_code=400, detail="A file with this name already exists in this folder.")

        user_data = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
        if not user_data or not user_data.get("channel_id"):
            raise HTTPException(status_code=400, detail="No Telegram storage channel connected. Please link a channel first.")

        # Write uploaded file to temp_path immediately (fast local stream transfer)
        os.makedirs("pending_uploads", exist_ok=True)
        upload_id = str(uuid.uuid4())
        temp_path = os.path.join("pending_uploads", f"{upload_id}_{file.filename}")
        
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        file_size = os.path.getsize(temp_path)
        mime_type = file.content_type or "application/octet-stream"

        # Register upload in DB
        execute_db(
            "INSERT INTO uploads (id, file_name, file_size, folder_id, progress, status, user_id) VALUES (?, ?, ?, ?, 0, 'downloading', ?)",
            (upload_id, file.filename, file_size, folder_id, user_id)
        )

        # Dispatch background task for Telegram upload
        background_tasks.add_task(
            bg_telegram_upload, 
            upload_id, 
            user_id, 
            folder_id, 
            file.filename, 
            temp_path, 
            file_size, 
            mime_type
        )

        return {"upload_id": upload_id, "status": "started", "file_name": file.filename}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔹 Get upload progress of all active uploads
@router.get("/upload-progress/{user_id}")
def get_upload_progress(user_id: str):
    try:
        user_id = normalize_phone(user_id)
        data = fetch_all("SELECT * FROM uploads WHERE user_id = ? ORDER BY id DESC", (user_id,))
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔹 Clear completed/failed uploads from history
@router.post("/upload-progress/{user_id}/clear")
def clear_completed_uploads(user_id: str):
    try:
        user_id = normalize_phone(user_id)
        execute_db("DELETE FROM uploads WHERE user_id = ? AND (status = 'completed' OR status = 'failed')", (user_id,))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))