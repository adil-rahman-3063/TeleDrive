import React from 'react';
import { BACKEND_URL } from '@/services/api';

interface TrashViewProps {
  trashFolders: any[];
  trashFiles: any[];
  phoneNumber: string;
  grads: string[];
  onRestoreFolder: (id: number) => void;
  onRestoreFile: (id: string) => void;
  onPurgeFolder: (id: number, name: string) => void;
  onPurgeFile: (id: string, name: string) => void;
}

export default function TrashView({
  trashFolders,
  trashFiles,
  phoneNumber,
  grads,
  onRestoreFolder,
  onRestoreFile,
  onPurgeFolder,
  onPurgeFile
}: TrashViewProps) {
  return (
    <div className="fade-in">
      <div style={{ padding: "16px 20px", background: "rgba(220, 53, 69, 0.05)", border: "1px solid rgba(220, 53, 69, 0.15)", borderRadius: "12px", color: "#f58f9b", fontSize: "13px", marginBottom: "20px" }}>
        ✦ Deleted folders and files are temporarily stored here. They will be automatically and permanently purged from Telegram after 24 hours.
      </div>

      {/* Trash Folders */}
      <div className="section-head">
        <h4 style={{ color: "#f58f9b" }}>Deleted Collections</h4>
        <span>{trashFolders.length} folders</span>
      </div>
      {trashFolders.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "10px 0 24px 0" }}>No deleted folders</p>
      ) : (
        <div className="collections-grid" style={{ marginBottom: "24px" }}>
          {trashFolders.map((folder) => (
            <div key={folder.id} className="coll-card" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="coll-cover" style={{ background: "rgba(255, 255, 255, 0.03)" }}></div>
              <div className="coll-body">
                <h3>{folder.name}</h3>
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <button className="btn btn-primary" onClick={() => onRestoreFolder(folder.id)} style={{ margin: 0, padding: "4px 8px", fontSize: "11px", height: "auto" }}>
                    Restore
                  </button>
                  <button className="btn danger-btn" onClick={() => onPurgeFolder(folder.id, folder.name)} style={{ margin: 0, padding: "4px 8px", fontSize: "11px", height: "auto" }}>
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trash Files */}
      <div className="section-head" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
        <h4 style={{ color: "#f58f9b" }}>Deleted Files</h4>
        <span>{trashFiles.length} files</span>
      </div>
      {trashFiles.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "10px 0" }}>No deleted files</p>
      ) : (
        <div className="media-grid" style={{ marginTop: "12px" }}>
          {trashFiles.map((file, idx) => {
            const isImage = file.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.file_name);
            const fileUrl = `${BACKEND_URL}/download/${phoneNumber}/${file.id}`;
            return (
              <div 
                key={file.id} 
                className="media-grid-item" 
                style={{ 
                  background: grads[idx % grads.length], 
                  cursor: "default",
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {isImage && (
                  <img 
                    src={fileUrl} 
                    alt={file.file_name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} 
                    loading="lazy"
                  />
                )}
                <div className="media-hover" style={{ opacity: 1, background: "rgba(19, 19, 22, 0.8)", display: "flex", flexDirection: "column", gap: "6px", padding: "10px", zIndex: 3 }}>
                  <span style={{ fontSize: "11px", color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>
                    {file.file_name}
                  </span>
                  <div style={{ display: "flex", gap: "4px", width: "100%" }}>
                    <button className="btn btn-primary" onClick={() => onRestoreFile(file.id)} style={{ flex: 1, margin: 0, padding: "4px", fontSize: "10px", height: "auto" }}>
                      Restore
                    </button>
                    <button className="btn danger-btn" onClick={() => onPurgeFile(file.id, file.file_name)} style={{ flex: 1, margin: 0, padding: "4px", fontSize: "10px", height: "auto" }}>
                      Purge
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
