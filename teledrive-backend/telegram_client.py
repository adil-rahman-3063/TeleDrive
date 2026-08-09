from telethon import TelegramClient
from config import API_ID, API_HASH

_clients = {}

def normalize_phone(phone: str) -> str:
    cleaned = "".join(c for c in phone if c.isdigit())
    return "+" + cleaned

def get_client(user_id: str):
    user_id = normalize_phone(user_id)
    if user_id not in _clients:
        _clients[user_id] = TelegramClient(f"sessions/{user_id}", API_ID, API_HASH)
    return _clients[user_id]

async def get_client_and_connect(user_id: str):
    user_id = normalize_phone(user_id)
    client = get_client(user_id)
    if not client.is_connected():
        await client.connect()
    # Cache dialogs to ensure private channel IDs (e.g. -100...) can be resolved
    if await client.is_user_authorized():
        try:
            await client.get_dialogs()
        except Exception as e:
            print("Failed to cache dialogs:", e)
    return client

async def resolve_peer_entity(client, entity_id):
    # Try resolving directly first
    try:
        return await client.get_entity(entity_id)
    except Exception:
        pass

    # Try finding in dialogs by ID (matching int or string representation)
    try:
        dialogs = await client.get_dialogs()
        for d in dialogs:
            if d.id == entity_id:
                return d.entity
            # Also try string comparison of ID (e.g. comparing -1003570320306 to string representation)
            if str(d.id) == str(entity_id):
                return d.entity
    except Exception as e:
        print("Failed to iterate dialogs in resolve_peer_entity:", e)
        
    raise ValueError("Could not find the channel in dialogs. Make sure you have joined the channel.")