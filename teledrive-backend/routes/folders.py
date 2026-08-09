from fastapi import APIRouter, HTTPException
from database import fetch_all, fetch_one, execute_db, insert_db
from telegram_client import get_client
import datetime

router = APIRouter()

# 🔥 Create folder (with optional parent)
@router.post("/folders")
def create_folder(user_id: str, name: str, parent_id: str = None):
    if parent_id == "null" or parent_id == "":
        parent_id = None
        
    last_id = insert_db(
        "INSERT INTO folders (name, parent_id, user_id, deleted_at) VALUES (?, ?, ?, NULL)",
        (name, parent_id, user_id)
    )
    
    folder = fetch_one("SELECT * FROM folders WHERE id = ?", (last_id,))
    if folder:
        folder["thumbnail_file_id"] = None
    return [folder] if folder else []


def get_folder_thumbnail(user_id: str, folder_id: int) -> str:
    img_record = fetch_one(
        """SELECT id FROM files 
           WHERE user_id = ? AND folder_id = ? AND deleted_at IS NULL 
           AND (mime_type LIKE 'image/%%' 
                OR file_name LIKE '%%.png' 
                OR file_name LIKE '%%.jpg' 
                OR file_name LIKE '%%.jpeg' 
                OR file_name LIKE '%%.webp' 
                OR file_name LIKE '%%.gif') 
           ORDER BY tg_message_id DESC LIMIT 1""",
        (user_id, folder_id)
    )
    return img_record["id"] if img_record else None


# 🔥 Get root folders (active only)
@router.get("/folders/{user_id}")
def get_root_folders(user_id: str):
    data = fetch_all("SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL AND deleted_at IS NULL", (user_id,))
    for folder in data:
        folder["thumbnail_file_id"] = get_folder_thumbnail(user_id, folder["id"])
    return data


# 🔥 Get subfolders (active only)
@router.get("/folders/{user_id}/{parent_id}")
def get_subfolders(user_id: str, parent_id: str):
    if parent_id == "null":
        data = fetch_all("SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL AND deleted_at IS NULL", (user_id,))
    else:
        data = fetch_all("SELECT * FROM folders WHERE user_id = ? AND parent_id = ? AND deleted_at IS NULL", (user_id, parent_id))
    for folder in data:
        folder["thumbnail_file_id"] = get_folder_thumbnail(user_id, folder["id"])
    return data


# 🔥 Rename a folder
@router.put("/folders/{user_id}/{folder_id}/rename")
def rename_folder(user_id: str, folder_id: str, new_name: str):
    rowcount = execute_db("UPDATE folders SET name = ? WHERE id = ?", (new_name, folder_id))
    
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="Folder not found or failed to rename")
        
    folder = fetch_one("SELECT * FROM folders WHERE id = ?", (folder_id,))
    return {"status": "renamed", "folder": folder}


def get_all_descendants(folder_id: str, include_deleted=True):
    """Helper to recursively find all subfolders and files inside a folder."""
    folders_to_process = [folder_id]
    all_folder_ids = []
    all_files = []

    while folders_to_process:
        current_folder = folders_to_process.pop()
        all_folder_ids.append(current_folder)
        
        # get subfolders
        query_folders = "SELECT id FROM folders WHERE parent_id = ?"
        if not include_deleted:
            query_folders += " AND deleted_at IS NULL"
        subfolders = fetch_all(query_folders, (current_folder,))
        for sub in subfolders:
            folders_to_process.append(sub["id"])
            
        # get files
        query_files = "SELECT * FROM files WHERE folder_id = ?"
        if not include_deleted:
            query_files += " AND deleted_at IS NULL"
        files = fetch_all(query_files, (current_folder,))
        all_files.extend(files)

    return all_folder_ids, all_files


# 🔥 Analyze a folder (count active contents)
@router.get("/folders/{user_id}/{folder_id}/analyze")
def analyze_folder(user_id: str, folder_id: str):
    all_folder_ids, all_files = get_all_descendants(folder_id, include_deleted=False)
    subfolder_count = len(all_folder_ids) - 1
    return {
        "folder_id": folder_id,
        "subfolders_count": subfolder_count,
        "files_count": len(all_files),
        "total_items": subfolder_count + len(all_files)
    }


# 🔥 Soft delete a folder recursively (move to trash)
@router.delete("/folders/{user_id}/{folder_id}")
def delete_folder(user_id: str, folder_id: str):
    all_folder_ids, all_files = get_all_descendants(folder_id, include_deleted=False)
    now_str = datetime.datetime.utcnow().isoformat()

    # Soft delete all child files
    if all_files:
        file_ids = [file["id"] for file in all_files]
        placeholders = ",".join("?" for _ in file_ids)
        execute_db(f"UPDATE files SET deleted_at = ? WHERE id IN ({placeholders})", (now_str,) + tuple(file_ids))

    # Soft delete all folders
    if all_folder_ids:
        placeholders = ",".join("?" for _ in all_folder_ids)
        execute_db(f"UPDATE folders SET deleted_at = ? WHERE id IN ({placeholders})", (now_str,) + tuple(all_folder_ids))

    return {
        "status": "moved_to_trash",
        "folders_count": len(all_folder_ids),
        "files_count": len(all_files)
    }


# 🔥 Restore a folder recursively
@router.post("/folders/{user_id}/{folder_id}/restore")
def restore_folder(user_id: str, folder_id: str):
    all_folder_ids, all_files = get_all_descendants(folder_id)

    # Restore child files
    if all_files:
        file_ids = [file["id"] for file in all_files]
        placeholders = ",".join("?" for _ in file_ids)
        execute_db(f"UPDATE files SET deleted_at = NULL WHERE id IN ({placeholders})", tuple(file_ids))

    # Restore folders
    if all_folder_ids:
        placeholders = ",".join("?" for _ in all_folder_ids)
        execute_db(f"UPDATE folders SET deleted_at = NULL WHERE id IN ({placeholders})", tuple(all_folder_ids))

    return {
        "status": "restored",
        "folders_count": len(all_folder_ids),
        "files_count": len(all_files)
    }


# 🔥 Permanent delete folder recursively (immediate hard delete)
@router.delete("/folders/{user_id}/{folder_id}/permanent")
async def delete_folder_permanent(user_id: str, folder_id: str):
    all_folder_ids, all_files = get_all_descendants(folder_id)

    # 1. Delete all files from Telegram first (grouped by channel)
    if all_files:
        client = get_client(user_id)
        await client.start()
        
        messages_by_channel = {}
        for file in all_files:
            channel_id = file.get("channel_id", "me")
            if channel_id != "me":
                try:
                    channel_id = int(channel_id)
                except ValueError:
                    pass
                    
            if channel_id not in messages_by_channel:
                messages_by_channel[channel_id] = []
            
            tg_msg_id = file.get("tg_message_id")
            if tg_msg_id:
                messages_by_channel[channel_id].append(tg_msg_id)
            
        for channel_id, msg_ids in messages_by_channel.items():
            if msg_ids:
                await client.delete_messages(channel_id, msg_ids)

        # 2. Hard-delete files from SQLite
        file_ids = [file["id"] for file in all_files]
        if file_ids:
            placeholders = ",".join("?" for _ in file_ids)
            execute_db(f"DELETE FROM files WHERE id IN ({placeholders})", tuple(file_ids))

    # 3. Hard-delete folders from SQLite
    if all_folder_ids:
        placeholders = ",".join("?" for _ in all_folder_ids)
        execute_db(f"DELETE FROM folders WHERE id IN ({placeholders})", tuple(all_folder_ids))

    return {
        "status": "deleted_permanently",
        "deleted_folders": len(all_folder_ids),
        "deleted_files": len(all_files)
    }


# 🔥 Get all items currently in Trash (both folders and files)
@router.get("/trash/{user_id}")
def get_trash(user_id: str):
    deleted_folders = fetch_all("SELECT * FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL", (user_id,))
    deleted_files = fetch_all("SELECT * FROM files WHERE user_id = ? AND deleted_at IS NOT NULL", (user_id,))
    return {
        "folders": deleted_folders,
        "files": deleted_files
    }