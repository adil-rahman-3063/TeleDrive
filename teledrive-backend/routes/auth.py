from fastapi import APIRouter, HTTPException
from telegram_client import get_client, get_client_and_connect, resolve_peer_entity, normalize_phone
from database import fetch_one, execute_db

router = APIRouter()

# In-memory storage for phone code hashes to verify code in Step 2
_phone_code_hashes = {}

# 🔹 Check auth status (if already logged in to Telegram)
@router.get("/auth/status")
async def get_auth_status(user_id: str):
    try:
        user_id = normalize_phone(user_id)
        client = await get_client_and_connect(user_id)
        is_authorized = await client.is_user_authorized()
        
        # Get channel details
        existing_user = fetch_one("SELECT channel_id FROM users WHERE phone = ?", (user_id,))
        channel_id = existing_user.get("channel_id") if existing_user else None
        
        return {
            "is_logged_in": is_authorized,
            "channel_id": channel_id
        }
    except Exception as e:
        return {"is_logged_in": False, "detail": str(e)}

# 🔹 Step 1: Send OTP
@router.post("/auth/send-code")
async def send_code(user_id: str, phone: str):
    try:
        user_id = normalize_phone(user_id)
        client = get_client(user_id)

        await client.connect()
        sent_code = await client.send_code_request(phone)
        _phone_code_hashes[user_id] = sent_code.phone_code_hash

        return {"status": "code sent"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔹 Step 2: Verify OTP + Save user in DB
@router.post("/auth/verify-code")
async def verify_code(user_id: str, phone: str, code: str):
    try:
        user_id = normalize_phone(user_id)
        client = get_client(user_id)

        # Retrieve the phone code hash stored from Step 1
        phone_code_hash = _phone_code_hashes.get(user_id)
        if not phone_code_hash:
            raise HTTPException(
                status_code=400, 
                detail="No verification session found for this number. Please request a new OTP."
            )

        # 🔥 Sign in directly using code and hash (bypasses duplicate send_code_request from client.start())
        await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)

        # 🔥 Check if user already exists (using normalized user_id)
        existing_user = fetch_one("SELECT * FROM users WHERE phone = ?", (user_id,))

        channel_id = None
        if not existing_user:
            # 🔥 Insert new user
            execute_db("INSERT INTO users (phone, original_quality) VALUES (?, 1)", (user_id,))
        else:
            channel_id = existing_user.get("channel_id")

        return {
            "status": "logged in",
            "user_id": user_id,
            "phone": phone,
            "channel_id": channel_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🔹 Step 3: Set Storage Channel
@router.post("/auth/set-channel")
async def set_channel(user_id: str, channel_id: str):
    try:
        user_id = normalize_phone(user_id)
        # Validate that the channel can be resolved by the user's Telegram client session
        client = await get_client_and_connect(user_id)
        
        entity_id = channel_id
        if channel_id != "me":
            try:
                entity_id = int(channel_id)
            except ValueError:
                pass
        
        try:
            print(f"[TeleDrive] Verifying access for channel target: {entity_id}")
            entity = await resolve_peer_entity(client, entity_id)
            title = getattr(entity, "title", "Personal Cloud")
            print(f"[TeleDrive] Access verified successfully for: {title} ({entity_id})")
        except Exception as resolve_err:
            print(f"[TeleDrive] Access verification failed for: {entity_id}. Error: {resolve_err}")
            raise HTTPException(
                status_code=400,
                detail=f"Could not resolve or access Telegram channel. Verify if the ID/username is correct and the user/bot is a member: {str(resolve_err)}"
            )

        # Assuming user_id is the phone or primary key used for identifying the user
        execute_db("UPDATE users SET channel_id = ? WHERE phone = ?", (channel_id, user_id))
        print(f"[TeleDrive] Database updated channel_id to {channel_id} for user {user_id}")
        return {"status": "success", "channel_id": channel_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth/user-stats")
async def get_user_stats(user_id: str):
    try:
        user_id = normalize_phone(user_id)
        user_record = fetch_one("SELECT channel_id, original_quality, download_path FROM users WHERE phone = ?", (user_id,))
        channel_id = user_record.get("channel_id") if user_record else None
        original_quality = bool(user_record.get("original_quality", 0)) if user_record else False
        download_path = user_record.get("download_path") if user_record else None
        
        files_count_record = fetch_one("SELECT COUNT(*) as count FROM files WHERE user_id = ? AND deleted_at IS NULL", (user_id,))
        files_count = files_count_record["count"] if files_count_record else 0
        
        folders_count_record = fetch_one("SELECT COUNT(*) as count FROM folders WHERE user_id = ? AND deleted_at IS NULL", (user_id,))
        folders_count = folders_count_record["count"] if folders_count_record else 0
        
        size_record = fetch_one("SELECT SUM(file_size) as total_size FROM files WHERE user_id = ? AND deleted_at IS NULL", (user_id,))
        total_size = size_record["total_size"] if size_record and size_record["total_size"] else 0

        channel_title = "Personal Cloud Storage"
        channel_username = None

        if channel_id:
            try:
                client = get_client(user_id)
                if not client.is_connected():
                    await client.connect()
                
                entity_id = channel_id
                if channel_id != "me":
                    try:
                        entity_id = int(channel_id)
                    except ValueError:
                        pass
                
                print(f"[TeleDrive] Attempting to resolve channel entity for ID: {entity_id}")
                entity = await resolve_peer_entity(client, entity_id)
                channel_title = getattr(entity, "title", "Personal Cloud Storage")
                channel_username = getattr(entity, "username", None)
                print(f"[TeleDrive] Successfully resolved channel: {channel_title} (@{channel_username if channel_username else 'private'})")
            except Exception as tg_err:
                print(f"[TeleDrive] Failed to fetch Telegram entity stats for {entity_id}:", tg_err)

        return {
            "phone": user_id,
            "channel_id": channel_id,
            "channel_title": channel_title,
            "channel_username": channel_username,
            "files_count": files_count,
            "folders_count": folders_count,
            "total_size": total_size,
            "original_quality": original_quality,
            "download_path": download_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/set-original-quality")
async def set_original_quality(user_id: str, enabled: bool):
    try:
        user_id = normalize_phone(user_id)
        val = 1 if enabled else 0
        execute_db("UPDATE users SET original_quality = ? WHERE phone = ?", (val, user_id))
        return {"status": "success", "original_quality": enabled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/set-download-path")
async def set_download_path(user_id: str, path: str):
    try:
        user_id = normalize_phone(user_id)
        path = path.strip() if path else None
        execute_db("UPDATE users SET download_path = ? WHERE phone = ?", (path, user_id))
        return {"status": "success", "download_path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/select-directory")
def select_directory():
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        selected_path = filedialog.askdirectory(title="Select Download Folder")
        root.destroy()
        
        if selected_path:
            selected_path = os.path.abspath(selected_path)
            return {"status": "success", "path": selected_path}
        return {"status": "cancelled", "path": None}
    except Exception as e:
        print("Folder picker dialog failed:", e)
        raise HTTPException(status_code=500, detail=f"Failed to open native dialog: {str(e)}")