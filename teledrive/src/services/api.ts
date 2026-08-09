export const BACKEND_URL = "http://localhost:8000";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return data.status === "ok";
    }
    return false;
  } catch {
    return false;
  }
}

export function cleanPhoneInput(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  // Remove any leading zeroes if they pasted it with country code but no plus
  const digitsOnly = trimmed.replace(/\D/g, "");
  // Default to +91 for 10-digit backward compatibility
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

export async function sendOtpCode(phone: string): Promise<boolean> {
  try {
    const cleanPhone = cleanPhoneInput(phone);
    // Encode the leading + as %2B for query parameter safety
    const encodedPhone = encodeURIComponent(cleanPhone);
    const res = await fetch(`${BACKEND_URL}/auth/send-code?user_id=${encodedPhone}&phone=${encodedPhone}`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to send code");
    }
    return true;
  } catch (error) {
    console.error("API sendOtpCode error:", error);
    throw error;
  }
}

export async function verifyOtpCode(phone: string, code: string) {
  try {
    const cleanPhone = cleanPhoneInput(phone);
    const encodedPhone = encodeURIComponent(cleanPhone);
    const res = await fetch(`${BACKEND_URL}/auth/verify-code?user_id=${encodedPhone}&phone=${encodedPhone}&code=${code}`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to verify code");
    }
    return await res.json();
  } catch (error) {
    console.error("API verifyOtpCode error:", error);
    throw error;
  }
}

export async function checkAuthStatus(phone: string): Promise<boolean> {
  try {
    const cleanPhone = cleanPhoneInput(phone);
    const encodedPhone = encodeURIComponent(cleanPhone);
    const res = await fetch(`${BACKEND_URL}/auth/status?user_id=${encodedPhone}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return data.is_logged_in === true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function setChannel(phone: string, channelId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/set-channel?user_id=${encodeURIComponent(phone)}&channel_id=${channelId}`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to set channel");
    }
    return await res.json();
  } catch (error) {
    console.error("API setChannel error:", error);
    throw error;
  }
}

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  user_id: string;
}

export interface FileMetadata {
  id: string;
  folder_id: number | null;
  tg_message_id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  user_id: string;
}

export async function getFolders(phone: string, parentId?: number | null): Promise<Folder[]> {
  const url = parentId 
    ? `${BACKEND_URL}/folders/${phone}/${parentId}`
    : `${BACKEND_URL}/folders/${phone}`;
  const res = await fetch(url);
  return res.json();
}

export async function getFiles(phone: string, folderId: string | number): Promise<FileMetadata[]> {
  const res = await fetch(`${BACKEND_URL}/files/${phone}/${folderId}`);
  return res.json();
}

export async function createFolder(phone: string, name: string, parentId?: number | null): Promise<Folder[]> {
  const url = `${BACKEND_URL}/folders?user_id=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}` + (parentId ? `&parent_id=${parentId}` : '');
  const res = await fetch(url, { method: "POST" });
  return res.json();
}

export async function renameFolder(phone: string, folderId: number, newName: string) {
  const res = await fetch(`${BACKEND_URL}/folders/${phone}/${folderId}/rename?new_name=${encodeURIComponent(newName)}`, {
    method: "PUT"
  });
  return res.json();
}

export async function deleteFolder(phone: string, folderId: number) {
  const res = await fetch(`${BACKEND_URL}/folders/${phone}/${folderId}`, {
    method: "DELETE"
  });
  return res.json();
}

export async function deleteFile(phone: string, fileId: string) {
  const res = await fetch(`${BACKEND_URL}/files/${phone}/${fileId}`, {
    method: "DELETE"
  });
  return res.json();
}

export async function uploadFile(
  phone: string,
  folderId: string | null,
  file: File,
  onProgress?: (progress: number) => void
): Promise<any> {
  const formData = new FormData();
  formData.append("user_id", phone);
  if (folderId) {
    formData.append("folder_id", folderId);
  }
  formData.append("file", file);

  const res = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body stream reader available");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let lastResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      if (line.startsWith("progress:")) {
        const percent = parseFloat(line.substring(9));
        if (onProgress) {
          onProgress(percent);
        }
      } else if (line.startsWith("result:")) {
        lastResult = JSON.parse(line.substring(7));
      } else if (line.startsWith("error:")) {
        throw new Error(line.substring(6));
      }
    }
  }

  if (!lastResult) {
    throw new Error("Upload did not return metadata results");
  }
  return lastResult;
}

export interface TrashData {
  folders: Folder[];
  files: FileMetadata[];
}

export async function getTrash(phone: string): Promise<TrashData> {
  const res = await fetch(`${BACKEND_URL}/trash/${phone}`);
  return res.json();
}

export async function restoreFolder(phone: string, folderId: number) {
  const res = await fetch(`${BACKEND_URL}/folders/${phone}/${folderId}/restore`, {
    method: "POST"
  });
  return res.json();
}

export async function restoreFile(phone: string, fileId: string) {
  const res = await fetch(`${BACKEND_URL}/files/${phone}/${fileId}/restore`, {
    method: "POST"
  });
  return res.json();
}

export async function deleteFolderPermanent(phone: string, folderId: number) {
  const res = await fetch(`${BACKEND_URL}/folders/${phone}/${folderId}/permanent`, {
    method: "DELETE"
  });
  return res.json();
}

export async function deleteFilePermanent(phone: string, fileId: string) {
  const res = await fetch(`${BACKEND_URL}/files/${phone}/${fileId}/permanent`, {
    method: "DELETE"
  });
  return res.json();
}

export interface UserStats {
  phone: string;
  channel_id: string | null;
  channel_title: string;
  channel_username: string | null;
  files_count: number;
  folders_count: number;
  total_size: number;
  original_quality?: boolean;
}

export async function getUserStats(phone: string): Promise<UserStats> {
  const res = await fetch(`${BACKEND_URL}/auth/user-stats?user_id=${encodeURIComponent(phone)}`);
  return res.json();
}

export async function syncTelegramChannel(phone: string): Promise<{ synced_count: number }> {
  const res = await fetch(`${BACKEND_URL}/sync/${encodeURIComponent(phone)}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error("Failed to sync Telegram channel");
  }
  return res.json();
}
