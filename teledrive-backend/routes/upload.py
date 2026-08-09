from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import uuid
import os
from database import fetch_one, execute_db
from telegram_client import get_client_and_connect

router = APIRouter()

@router.post("/upload")
async def upload_file(
    user_id: str = Form(...),
    folder_id: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        # Normalize folder_id
        if folder_id == "null" or folder_id == "" or folder_id == "root":
            folder_id = None

        # Check for duplicate file name in the same folder
        if folder_id:
            duplicate_check = fetch_one(
                "SELECT id FROM files WHERE user_id = ? AND folder_id = ? AND file_name = ?",
                (user_id, folder_id, file.filename)
            )
        else:
            duplicate_check = fetch_one(
                "SELECT id FROM files WHERE user_id = ? AND folder_id IS NULL AND file_name = ?",
                (user_id, file.filename)
            )
            
        # Get target channel_id and original_quality preference from users table
        user_data = fetch_one("SELECT channel_id, original_quality FROM users WHERE phone = ?", (user_id,))
        if not user_data or not user_data.get("channel_id"):
            raise HTTPException(
                status_code=400, 
                detail="No Telegram storage channel connected. Please link a channel first."
            )

        channel_id = user_data["channel_id"]
        original_quality = bool(user_data.get("original_quality", 0))

        # If it's a numeric ID string, convert it to int, otherwise keep as string (username)
        if channel_id and channel_id != "me":
            try:
                channel_id = int(channel_id)
            except ValueError:
                pass

        # Start and connect Telegram client for this user (with entity caching)
        client = await get_client_and_connect(user_id)

        # Save file temporarily to compute size and upload
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        file_size = os.path.getsize(temp_path)
        mime_type = file.content_type or "application/octet-stream"

        # Upload to Telegram with original quality preference toggling
        message = await client.send_file(channel_id, temp_path, force_document=original_quality)

        # Delete temp file
        os.remove(temp_path)

        # Save metadata in SQLite
        new_id = str(uuid.uuid4())
        execute_db(
            "INSERT INTO files (id, folder_id, tg_message_id, file_name, file_size, mime_type, user_id, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
            (new_id, folder_id, message.id, file.filename, file_size, mime_type, user_id)
        )

        return {
            "message_id": message.id,
            "file_name": file.filename,
            "folder_id": folder_id
        }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print("UPLOAD ERROR:", error_msg)
        raise HTTPException(status_code=500, detail=str(e))