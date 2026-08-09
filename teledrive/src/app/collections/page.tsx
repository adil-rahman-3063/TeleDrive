"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import TopNav from "@/components/TopNav";
import CollectionCard from "@/components/CollectionCard";
import MediaViewer from "@/components/MediaViewer";
import Dropzone from "@/components/Dropzone";
import { 
  getFolders, 
  getFiles, 
  createFolder, 
  renameFolder, 
  deleteFolder, 
  deleteFile, 
  getTrash, 
  restoreFolder, 
  restoreFile, 
  deleteFolderPermanent, 
  deleteFilePermanent, 
  syncTelegramChannel,
  moveFile,
  Folder, 
  FileMetadata, 
  BACKEND_URL 
} from "@/services/api";

const grads = [
  "linear-gradient(140deg,#d9c6f3,#f7d5e8)",
  "linear-gradient(140deg,#c9d9f7,#d9c6f3)",
  "linear-gradient(140deg,#f7d5e8,#c9d9f7)",
  "linear-gradient(140deg,#e3d6f2,#f0d8e6)",
  "linear-gradient(140deg,#d9c6f3,#c9d9f7)",
  "linear-gradient(140deg,#f0d8e6,#e3d6f2)"
];

export default function CollectionsPage() {
  const { isLoggedIn, phoneNumber, loading, autoplayVideos, showFileNames, backendOnline } = useAuth();
  const router = useRouter();

  // Folders and Files states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);
  
  // Trash states
  const [trashFolders, setTrashFolders] = useState<Folder[]>([]);
  const [trashFiles, setTrashFiles] = useState<FileMetadata[]>([]);
  const [viewingTrash, setViewingTrash] = useState(false);

  // Navigation states
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  
  // Form input & modals
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const { showToast } = useToast();

  // Custom Delete Choice Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "file"; id: any; name: string } | null>(null);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncTelegram = async () => {
    if (!phoneNumber) return;
    setSyncing(true);
    setSyncStatus("Scanning Telegram channel for untracked media...");
    showToast("Scanning Telegram channel history...", "info");
    try {
      const res = await syncTelegramChannel(phoneNumber);
      if (res.synced_count > 0) {
        setSyncStatus(`Found and added ${res.synced_count} new files!`);
        showToast(`Sync complete! Indexed ${res.synced_count} untracked items to root.`, "success");
      } else {
        setSyncStatus("No new media found. All up to date!");
        showToast("Sync complete! No new media found.", "success");
      }
      loadData();
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (err: any) {
      setSyncStatus("Sync failed.");
      showToast(`Sync failed: ${err.message}`, "error");
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Multi-Select States
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [longPressTimeout, setLongPressTimeout] = useState<any>(null);
  const [wasLongPressed, setWasLongPressed] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);

  // Global mouseup listener to cancel press & drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown(false);
      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        setLongPressTimeout(null);
      }
      setTimeout(() => setWasLongPressed(false), 80);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [longPressTimeout]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleFileClick = (file: any, idx: number) => {
    if (wasLongPressed) return;
    if (selectedFileIds.length > 0) {
      toggleFileSelection(file.id);
    } else {
      setViewerIndex(idx);
      setViewerOpen(true);
    }
  };

  const handleFileMouseDown = (fileId: string) => {
    setIsMouseDown(true);
    setWasLongPressed(false);
    const timer = setTimeout(() => {
      setWasLongPressed(true);
      toggleFileSelection(fileId);
    }, 500);
    setLongPressTimeout(timer);
  };

  const handleFileMouseEnter = (fileId: string) => {
    if (isMouseDown && selectedFileIds.length > 0) {
      if (!selectedFileIds.includes(fileId)) {
        setSelectedFileIds(prev => [...prev, fileId]);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFileIds.length === 0) return;
    if (!confirm(`Are you sure you want to move the ${selectedFileIds.length} selected files to the trash bin?`)) return;

    try {
      showToast(`Moving ${selectedFileIds.length} files to trash...`, "info");
      await Promise.all(selectedFileIds.map(id => deleteFile(phoneNumber, id)));
      showToast("Files moved to trash", "success");
      setSelectedFileIds([]);
      loadData();
    } catch (err) {
      showToast("Failed to delete some files", "error");
    }
  };

  const executeBulkMove = async () => {
    try {
      showToast(`Moving ${selectedFileIds.length} files...`, "info");
      await Promise.all(selectedFileIds.map(id => moveFile(phoneNumber, id, moveTargetFolderId)));
      showToast("Files moved successfully", "success");
      setSelectedFileIds([]);
      setShowMoveModal(false);
      loadData();
    } catch (err) {
      showToast("Failed to move files", "error");
    }
  };

  // Permanent delete confirmation modal
  const [permDeleteTarget, setPermDeleteTarget] = useState<{ type: "folder" | "file"; id: any; name: string } | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [dataLoading, setDataLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "image" | "video" | "other">("all");

  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (fileTypeFilter === "all") return true;
    const mime = file.mime_type?.toLowerCase() || "";
    const name = file.file_name?.toLowerCase() || "";
    const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(name);
    const isVideo = mime.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/i.test(name);
    
    if (fileTypeFilter === "image") return isImage;
    if (fileTypeFilter === "video") return isVideo;
    if (fileTypeFilter === "other") return !isImage && !isVideo;
    return true;
  });

  // Fetch folders and files
  const loadData = async () => {
    if (!phoneNumber) return;
    setDataLoading(true);
    try {
      if (viewingTrash) {
        const trash = await getTrash(phoneNumber);
        setTrashFolders(trash.folders || []);
        setTrashFiles(trash.files || []);
      } else {
        const parentId = activeFolder ? activeFolder.id : null;
        const foldersList = await getFolders(phoneNumber, parentId);
        
        const currentFolderId = activeFolder ? activeFolder.id : "root";
        const filesList = await getFiles(phoneNumber, currentFolderId);
        
        setFolders(foldersList || []);
        setFiles(filesList || []);
      }
    } catch (err) {
      console.error("Error loading library data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (backendOnline === true) {
      loadData();
    }
  }, [isLoggedIn, phoneNumber, activeFolder, viewingTrash, loading, backendOnline]);

  // Periodic background sync every 60 seconds to index files uploaded directly to Telegram
  useEffect(() => {
    if (!phoneNumber || viewingTrash || loading || !isLoggedIn || !backendOnline) return;

    const interval = setInterval(async () => {
      try {
        const res = await syncTelegramChannel(phoneNumber);
        if (res.synced_count > 0) {
          showToast(`Background Sync: Found ${res.synced_count} new files in Telegram!`, "success");
          
          // Re-fetch directory structure
          const parentId = activeFolder ? activeFolder.id : null;
          const foldersList = await getFolders(phoneNumber, parentId);
          const currentFolderId = activeFolder ? activeFolder.id : "root";
          const filesList = await getFiles(phoneNumber, currentFolderId);
          
          setFolders(foldersList || []);
          setFiles(filesList || []);
        }
      } catch (err) {
        console.error("Background sync failed:", err);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [phoneNumber, viewingTrash, loading, isLoggedIn, backendOnline, activeFolder]);

  if (loading || !isLoggedIn) {
    return null;
  }

  // Create folder
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionTitle.trim()) return;

    try {
      const parentId = activeFolder ? activeFolder.id : null;
      await createFolder(phoneNumber, newCollectionTitle.trim(), parentId);
      setNewCollectionTitle("");
      setShowCreateInput(false);
      loadData();
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  // Rename folder
  const openRenameModal = () => {
    if (!activeFolder) return;
    setRenameValue(activeFolder.name);
    setShowRenameModal(true);
  };

  const handleRenameActiveFolder = async () => {
    if (!activeFolder) return;
    const newName = renameValue.trim();
    if (!newName) return;
    setShowRenameModal(false);

    try {
      await renameFolder(phoneNumber, activeFolder.id, newName);
      setActiveFolder({ ...activeFolder, name: newName });
      showToast("Collection renamed", "success");
      loadData();
    } catch (err) {
      showToast("Failed to rename collection", "error");
      console.error("Failed to rename folder:", err);
    }
  };

  // Trigger Delete flow
  const triggerDeleteFolder = () => {
    if (!activeFolder) return;
    setDeleteTarget({ type: "folder", id: activeFolder.id, name: activeFolder.name });
  };

  const triggerDeleteFile = (idx: number) => {
    const file = filteredFiles[idx];
    if (!file) return;
    setDeleteTarget({ type: "file", id: file.id, name: file.file_name });
  };

  // Execute Soft Delete (Move to Trash)
  const handleMoveToTrash = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "folder") {
        await deleteFolder(phoneNumber, deleteTarget.id);
        setActiveFolder(null);
      } else {
        await deleteFile(phoneNumber, deleteTarget.id);
        setViewerOpen(false);
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error("Soft delete failed:", err);
    }
  };

  // Execute Hard Delete (Delete Forever)
  const handleDeleteForever = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "folder") {
        await deleteFolderPermanent(phoneNumber, deleteTarget.id);
        setActiveFolder(null);
      } else {
        await deleteFilePermanent(phoneNumber, deleteTarget.id);
        setViewerOpen(false);
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error("Permanent delete failed:", err);
    }
  };

  // Restore from Trash
  const handleRestoreFolder = async (id: number) => {
    try {
      await restoreFolder(phoneNumber, id);
      loadData();
    } catch (err) {
      console.error("Restore folder failed:", err);
    }
  };

  const handleRestoreFile = async (id: string) => {
    try {
      await restoreFile(phoneNumber, id);
      loadData();
    } catch (err) {
      console.error("Restore file failed:", err);
    }
  };

  const handlePermanentDeleteTrashFolder = async (id: number, name: string) => {
    setPermDeleteTarget({ type: "folder", id, name });
  };

  const handlePermanentDeleteTrashFile = async (id: string, name: string) => {
    setPermDeleteTarget({ type: "file", id, name });
  };

  const executePermanentDelete = async () => {
    if (!permDeleteTarget) return;
    try {
      if (permDeleteTarget.type === "folder") {
        await deleteFolderPermanent(phoneNumber, permDeleteTarget.id);
      } else {
        await deleteFilePermanent(phoneNumber, permDeleteTarget.id);
      }
      showToast(`"${permDeleteTarget.name}" permanently deleted`, "success");
      loadData();
    } catch (err) {
      showToast("Permanent delete failed", "error");
      console.error("Permanent delete failed:", err);
    }
    setPermDeleteTarget(null);
  };

  // Setup viewer files
  const viewerFiles = filteredFiles.map((file, i) => {
    const isVideo = file.mime_type?.startsWith("video/") || file.file_name?.toLowerCase().endsWith(".mp4");
    
    // Format file size nicely
    const bytes = file.file_size || 0;
    let sizeStr = "0 Bytes";
    if (bytes > 0) {
      if (bytes < 1024) sizeStr = `${bytes} B`;
      else if (bytes < 1024 * 1024) sizeStr = `${(bytes / 1024).toFixed(1)} KB`;
      else sizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return {
      id: file.id,
      name: file.file_name,
      grad: grads[i % grads.length],
      video: isVideo,
      size: sizeStr,
      url: `${BACKEND_URL}/download/${phoneNumber}/${file.id}`
    };
  });

  const hasFolders = folders.length > 0;
  const hasFiles = files.length > 0;

  return (
    <>
      <TopNav />

      {/* ================= COLLECTIONS VIEW ================= */}
      <div className="view active" id="view-collections">
        <div className="crumbs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b onClick={() => { setActiveFolder(null); setViewingTrash(false); }} style={{ cursor: "pointer" }}>All collections</b>
            {viewingTrash && (
              <>
                <span className="sep">/</span>
                <span className="crumb-active" style={{ color: "#f58f9b" }}>Trash Bin</span>
              </>
            )}
            {activeFolder && !viewingTrash && (
              <>
                <span className="sep">/</span>
                <span className="crumb-active">{activeFolder.name}</span>
              </>
            )}
          </div>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {activeFolder && !viewingTrash && (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={openRenameModal}
                  style={{ margin: 0, padding: "8px 12px", fontSize: "12px", color: "var(--tg)" }}
                >
                  Rename
                </button>
                <button
                  className="btn danger-btn"
                  onClick={triggerDeleteFolder}
                  style={{ margin: 0, padding: "8px 12px", fontSize: "12px" }}
                >
                  Delete
                </button>
              </>
            )}

            {!viewingTrash && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {syncStatus && (
                  <span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap", animation: "fadeIn 0.2s ease" }}>
                    {syncStatus}
                  </span>
                )}
                <button
                  className={`btn btn-primary ${syncing ? "loading" : ""}`}
                  onClick={handleSyncTelegram}
                  disabled={syncing}
                  style={{ 
                    margin: 0, 
                    padding: "8px 14px", 
                    fontSize: "12.5px", 
                    background: "rgba(10, 132, 255, 0.15)",
                    color: "#0a84ff",
                    border: "1px solid rgba(10, 132, 255, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {syncing ? (
                    <>
                      <svg className="spin" viewBox="0 0 24 24" style={{ width: "14px", height: "14px", stroke: "currentColor", fill: "none" }}>
                        <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="30 10" />
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", stroke: "currentColor", fill: "none", strokeWidth: 2 }}>
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.56-.56" />
                      </svg>
                      Sync Telegram
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TRASH VIEW PANEL */}
        {viewingTrash ? (
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
                        <button className="btn btn-primary" onClick={() => handleRestoreFolder(folder.id)} style={{ margin: 0, padding: "4px 8px", fontSize: "11px", height: "auto" }}>
                          Restore
                        </button>
                        <button className="btn danger-btn" onClick={() => handlePermanentDeleteTrashFolder(folder.id, folder.name)} style={{ margin: 0, padding: "4px 8px", fontSize: "11px", height: "auto" }}>
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
                          <button className="btn btn-primary" onClick={() => handleRestoreFile(file.id)} style={{ flex: 1, margin: 0, padding: "4px", fontSize: "10px", height: "auto" }}>
                            Restore
                          </button>
                          <button className="btn danger-btn" onClick={() => handlePermanentDeleteTrashFile(file.id, file.file_name)} style={{ flex: 1, margin: 0, padding: "4px", fontSize: "10px", height: "auto" }}>
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
        ) : (
          /* STANDARD DIRECTORY LISTING */
          <div>
            {!dataLoading && (
              <div className="search-controls fade-in">
                <div className="search-input-wrapper">
                  <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search files and collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-chips">
                  <button
                    className={`filter-chip ${fileTypeFilter === "all" ? "active" : ""}`}
                    onClick={() => setFileTypeFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`filter-chip ${fileTypeFilter === "image" ? "active" : ""}`}
                    onClick={() => setFileTypeFilter("image")}
                  >
                    Photos
                  </button>
                  <button
                    className={`filter-chip ${fileTypeFilter === "video" ? "active" : ""}`}
                    onClick={() => setFileTypeFilter("video")}
                  >
                    Videos
                  </button>
                  <button
                    className={`filter-chip ${fileTypeFilter === "other" ? "active" : ""}`}
                    onClick={() => setFileTypeFilter("other")}
                  >
                    Documents
                  </button>
                </div>
              </div>
            )}

            {dataLoading ? (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <div className="collections-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="coll-card skeleton skeleton-card"></div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: "24px" }}>
                  <div className="section-head" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
                    <h4>Loading Files...</h4>
                  </div>
                  <div className="skeleton-grid" style={{ marginTop: "16px" }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="skeleton skeleton-thumb"></div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={activeFolder ? { display: "flex", gap: "24px", alignItems: "flex-start", width: "100%" } : {}}>
                <div style={activeFolder ? { flex: 1, minWidth: 0 } : {}}>
                {/* Folder Grid */}
                <div style={{ marginBottom: "24px" }}>
                  {!hasFolders && !activeFolder ? (
                    <div className="card soft fade-in" style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--shell-line)" }}>
                      <div className="plus-btn" style={{ borderColor: "rgba(255, 255, 255, 0.25)" }}>
                        <svg viewBox="0 0 24 24" style={{ stroke: "#e7e6ea" }}>
                          <path d="M3 7h6l2 2h10v10H3Z" />
                        </svg>
                      </div>
                      <h2 style={{ color: "#fff", fontSize: "20px", margin: 0 }}>No collections yet</h2>
                      <p className="desc" style={{ color: "var(--muted)", maxWidth: "340px", margin: 0 }}>
                        Create your first collection folder to start organizing your files backed by Telegram.
                      </p>
                      
                      {!showCreateInput ? (
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                          <button className="btn btn-primary" onClick={() => setShowCreateInput(true)}>
                            Create Collection
                          </button>
                          <button className="btn btn-ghost" onClick={() => setViewingTrash(true)} style={{ margin: 0, color: "#f58f9b" }}>
                            View Trash Bin
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleCreateCollection} style={{ marginTop: "12px", display: "flex", gap: "8px", width: "100%", maxWidth: "300px" }}>
                          <input
                            className="phone-input"
                            style={{ padding: "10px 14px", fontSize: "14px", borderRadius: "10px" }}
                            placeholder="e.g. Travel, Work"
                            value={newCollectionTitle}
                            onChange={(e) => setNewCollectionTitle(e.target.value)}
                            autoFocus
                          />
                          <button className="btn btn-primary" type="submit" style={{ padding: "10px 16px" }}>
                            Add
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="collections-grid fade-in">
                      {filteredFolders.map((folder) => (
                        <CollectionCard
                          key={folder.id}
                          title={folder.name}
                          subCount={0}
                          fileCount={0}
                          onClick={() => setActiveFolder(folder)}
                        />
                      ))}

                      {/* Trash Card inside root collections */}
                      {!activeFolder && (
                        <div className="coll-card" onClick={() => setViewingTrash(true)} style={{ border: "1px dashed rgba(220, 53, 69, 0.25)", background: "rgba(220, 53, 69, 0.03)" }}>
                          <div className="coll-cover" style={{ background: "rgba(220, 53, 69, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg viewBox="0 0 24 24" style={{ stroke: "#dc3545", width: "36px", height: "36px" }}>
                              <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                            </svg>
                          </div>
                          <div className="coll-body">
                            <h3 style={{ color: "#f58f9b" }}>Trash Bin</h3>
                            <div className="coll-meta">
                              <span>Auto-purges in 24h</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!showCreateInput ? (
                        <div className="add-coll" onClick={() => setShowCreateInput(true)}>
                          <div className="plus-btn">
                            <svg viewBox="0 0 24 24" style={{ stroke: "#e7e6ea" }}>
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 500 }}>New collection</span>
                        </div>
                      ) : (
                        <div className="add-coll" style={{ padding: "20px" }}>
                          <form onSubmit={handleCreateCollection} style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                            <input
                              className="phone-input"
                              style={{ padding: "10px 12px", fontSize: "13px", borderRadius: "8px", width: "100%" }}
                              placeholder="Collection Title"
                              value={newCollectionTitle}
                              onChange={(e) => setNewCollectionTitle(e.target.value)}
                              autoFocus
                            />
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button className="btn btn-primary" type="submit" style={{ flex: 1, padding: "8px", fontSize: "12px" }}>
                                Create
                              </button>
                              <button className="btn btn-ghost" type="button" onClick={() => setShowCreateInput(false)} style={{ flex: 1, padding: "8px", fontSize: "12px", margin: 0 }}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>



                {/* Active Files Grid */}
                {(activeFolder || hasFiles) && (
                  <div className="fade-in">
                    <div className="section-head" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
                      <h4>Files in {activeFolder ? activeFolder.name : "root"}</h4>
                      <span>{filteredFiles.length} items</span>
                    </div>

                    {!hasFiles ? (
                      <div className="card soft" style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--shell-line)", marginTop: "16px" }}>
                        <div className="plus-btn" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
                          <svg viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </div>
                        <h2 style={{ color: "#fff", fontSize: "18px", margin: 0 }}>No media files uploaded here yet</h2>
                        <p className="desc" style={{ color: "var(--muted)", maxWidth: "300px", margin: 0 }}>
                          Drag and drop files in the dropzone above to upload them into this collection folder.
                        </p>
                      </div>
                    ) : (
                  <div className="media-grid">
                    {filteredFiles.map((file, idx) => {
                      const isVideo = file.mime_type?.startsWith("video/") || file.file_name?.toLowerCase().endsWith(".mp4");
                      const isImage = file.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.file_name);
                      const fileUrl = `${BACKEND_URL}/download/${phoneNumber}/${file.id}`;
                      const isHovered = hoveredFileId === file.id;
                      const isSelected = selectedFileIds.includes(file.id);
                      return (
                        <div 
                          key={file.id} 
                          style={{ display: "flex", flexDirection: "column", gap: "6px" }}
                          onMouseEnter={() => {
                            setHoveredFileId(file.id);
                            handleFileMouseEnter(file.id);
                          }}
                          onMouseLeave={() => setHoveredFileId(null)}
                        >
                          <div
                            className="media-grid-item"
                            style={{ 
                              background: grads[idx % grads.length],
                              overflow: "hidden",
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              border: isSelected ? "3.5px solid #0a84ff" : "none",
                              boxShadow: isSelected ? "0 0 15px rgba(10, 132, 255, 0.35)" : "none",
                              transform: isSelected ? "scale(0.94)" : "scale(1)",
                              transition: "border 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                            }}
                            onMouseDown={() => handleFileMouseDown(file.id)}
                            onClick={() => handleFileClick(file, idx)}
                          >
                            {isSelected && (
                              <div style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                background: "#0a84ff",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 6,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                              }}>
                                <svg viewBox="0 0 24 24" style={{ width: "13px", height: "13px", stroke: "#fff", strokeWidth: 3, fill: "none" }}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            )}
                            {isImage && (
                              <img 
                                src={fileUrl} 
                                alt={file.file_name} 
                                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} 
                                loading="lazy"
                              />
                            )}
                            {isVideo && autoplayVideos && isHovered ? (
                              <video 
                                src={fileUrl} 
                                autoPlay 
                                muted 
                                loop 
                                playsInline 
                                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, zIndex: 2 }} 
                              />
                            ) : isVideo ? (
                              <video 
                                src={fileUrl} 
                                preload="metadata"
                                muted
                                playsInline
                                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} 
                              />
                            ) : null}
                            {isVideo && (
                              <div className="vid-badge" style={{ zIndex: 3 }}>
                                <svg viewBox="0 0 24 24">
                                  <path d="M4 5h16v14H4z" />
                                  <path d="M9 9l6 3-6 3Z" />
                                </svg>
                                <span>Video</span>
                              </div>
                            )}
                            <div className="media-hover" style={{ zIndex: 4 }}>
                              <span style={{ fontSize: "11px", color: "#fff", wordBreak: "break-all", textAlign: "center", padding: "0 8px" }}>
                                {file.file_name}
                              </span>
                            </div>
                          </div>
                          {showFileNames && (
                            <span 
                              style={{ 
                                fontSize: "12px", 
                                color: "var(--ink)", 
                                textOverflow: "ellipsis", 
                                overflow: "hidden", 
                                whiteSpace: "nowrap", 
                                display: "block", 
                                textAlign: "center", 
                                padding: "2px 4px 0 4px",
                                fontWeight: 500
                              }}
                              title={file.file_name}
                            >
                              {file.file_name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>
            {activeFolder && (
              <div style={{ flexShrink: 0, width: "280px", position: "sticky", top: "24px" }}>
                <Dropzone onUploadComplete={loadData} folderId={String(activeFolder.id)} square={true} />
              </div>
            )}
          </div>
        )}
      </div>
    )}
  </div>

      <MediaViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        files={viewerFiles}
        currentIndex={viewerIndex}
        onIndexChange={(idx) => setViewerIndex(idx)}
        onDelete={triggerDeleteFile}
      />

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="viewer-overlay active animate-fade-in" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card soft" style={{ maxWidth: "420px", padding: "30px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "#1b1b20", textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
            <h3 style={{ color: "#fff", fontSize: "19px", margin: 0 }}>Delete {deleteTarget.type}?</h3>
            <p style={{ color: "var(--muted-2)", fontSize: "14px", margin: 0, lineHeight: "1.5" }}>
              How do you want to delete <b>"{deleteTarget.name}"</b>?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              <button 
                className="btn btn-primary" 
                onClick={handleMoveToTrash}
                style={{ width: "100%", padding: "12px", background: "rgba(240, 161, 58, 0.15)", border: "1px solid rgba(240, 161, 58, 0.35)", color: "#f5c58f" }}
              >
                Move to Trash Bin (restorable for 24h)
              </button>
              <button 
                className="btn danger-btn" 
                onClick={handleDeleteForever}
                style={{ width: "100%", padding: "12px" }}
              >
                Delete Forever (cannot be undone)
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => setDeleteTarget(null)}
                style={{ width: "100%", padding: "12px", margin: 0 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Rename Collection</h3>
            <p>Enter a new name for this collection</p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Collection name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRenameActiveFolder()}
            />
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setShowRenameModal(false)}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleRenameActiveFolder}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permDeleteTarget && (
        <div className="modal-overlay" onClick={() => setPermDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Permanently Delete?</h3>
            <p>Are you sure you want to permanently delete &quot;{permDeleteTarget.name}&quot;? This will remove the file from Telegram and cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setPermDeleteTarget(null)}>Cancel</button>
              <button className="modal-btn-danger" onClick={executePermanentDelete}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BULK SELECTION ACTION BAR */}
      {selectedFileIds.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1b1b20",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          zIndex: 9999
        }}>
          <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#fff" }}>
            {selectedFileIds.length} files selected
          </span>
          <div style={{ width: "1px", height: "20px", background: "rgba(255, 255, 255, 0.1)" }} />
          <button 
            className="btn btn-ghost" 
            onClick={() => {
              setMoveTargetFolderId(null);
              setShowMoveModal(true);
            }}
            style={{ margin: 0, fontSize: "13px", padding: "8px 14px", color: "#0a84ff" }}
          >
            Move
          </button>
          <button 
            className="btn danger-btn" 
            onClick={handleBulkDelete}
            style={{ margin: 0, fontSize: "13px", padding: "8px 14px" }}
          >
            Delete
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={() => setSelectedFileIds([])}
            style={{ margin: 0, fontSize: "13px", padding: "8px 14px", color: "var(--muted)" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bulk Move Modal */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Move {selectedFileIds.length} Files</h3>
            <p>Select target collection folder:</p>
            <select
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                background: "#25252b",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: "14px",
                marginTop: "10px",
                outline: "none"
              }}
              value={moveTargetFolderId || "root"}
              onChange={(e) => setMoveTargetFolderId(e.target.value === "root" ? null : e.target.value)}
            >
              <option value="root">All collections (Root)</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button className="modal-btn-secondary" onClick={() => setShowMoveModal(false)}>Cancel</button>
              <button className="modal-btn-primary" onClick={executeBulkMove}>Move Files</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
