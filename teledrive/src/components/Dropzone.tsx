"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile, getFolders, Folder } from "@/services/api";

export default function Dropzone({ 
  onUploadComplete, 
  folderId = null,
  square = false
}: { 
  onUploadComplete?: () => void;
  folderId?: string | null;
  square?: boolean;
}) {
  const { phoneNumber } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">("idle");
  const [currentFileText, setCurrentFileText] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  // Pending files & location selection
  const [pendingFiles, setPendingFiles] = useState<FileList | File[] | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [collectionsList, setCollectionsList] = useState<Folder[]>([]);
  const [targetLocation, setTargetLocation] = useState<"root" | "collection">("root");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

  // Load collections when location modal is opened
  useEffect(() => {
    if (showLocationModal && phoneNumber) {
      getFolders(phoneNumber).then((folders) => {
        setCollectionsList(folders || []);
        if (folders && folders.length > 0) {
          setSelectedCollectionId(String(folders[0].id));
        }
      }).catch(err => console.error("Failed to load folders:", err));
    }
  }, [showLocationModal, phoneNumber]);

  const processUpload = async (files: FileList | File[], folderId: string | null) => {
    setUploadState("uploading");
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        setCurrentFileText(`Uploading ${i + 1}/${totalFiles} — ${file.name}`);
        setProgressPercent(0);

        let progressInterval: any = null;
        let currentFakePercent = 0;

        // Upload single file and track progress
        await uploadFile(phoneNumber!, folderId, file, (percent) => {
          // Map client-to-local-server upload to 0% - 70%
          const mappedPercent = Math.round(percent * 0.7);
          setProgressPercent(mappedPercent);
          currentFakePercent = mappedPercent;

          // Once it hits 70%, start slowly incrementing to simulate backend->Telegram upload
          if (percent >= 99 && !progressInterval) {
            progressInterval = setInterval(() => {
              currentFakePercent = Math.min(99, currentFakePercent + 1);
              setProgressPercent(currentFakePercent);
            }, 1000);
          }
        });

        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setProgressPercent(100);
      }

      setUploadState("done");
      setCurrentFileText("All files uploaded successfully ✓");
      if (onUploadComplete) onUploadComplete();
      
      setTimeout(() => {
        setUploadState("idle");
        setCurrentFileText("");
        setProgressPercent(0);
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setUploadState("idle");
      setCurrentFileText(`Error: ${err.message || "Upload failed"}`);
      setTimeout(() => setCurrentFileText(""), 4000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !phoneNumber) return;
    if (folderId) {
      processUpload(files, folderId);
    } else {
      setPendingFiles(files);
      setShowLocationModal(true);
    }
  };

  const triggerBrowse = () => {
    if (uploadState === "uploading") return;
    fileInputRef.current?.click();
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState === "uploading" || !phoneNumber) return;
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (folderId) {
      processUpload(files, folderId);
    } else {
      setPendingFiles(files);
      setShowLocationModal(true);
    }
  };

  const handleConfirmLocation = () => {
    if (!pendingFiles) return;
    const destId = targetLocation === "root" ? null : selectedCollectionId;
    setShowLocationModal(false);
    processUpload(pendingFiles, destId);
    setPendingFiles(null);
  };

  const handleCancelLocation = () => {
    setShowLocationModal(false);
    setPendingFiles(null);
  };

  return (
    <div className={`card home-upload ${square ? "dropzone-square" : ""}`}>
      {!square && <div className="card-label">Add media</div>}
      {!square && <h2 style={{ fontSize: "19px" }}>Just drop a file</h2>}
      
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*,video/*"
      />

      <div
        className="dropzone"
        onClick={triggerBrowse}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ cursor: uploadState === "uploading" ? "not-allowed" : "pointer" }}
      >
        <div className="vf-corner tl"></div>
        <div className="vf-corner tr"></div>
        <div className="vf-corner bl"></div>
        <div className="vf-corner br"></div>
        <div className="plus-btn">
          <svg viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div className="dz-title">
          {uploadState === "idle" && (currentFileText || "Drop photos & videos")}
          {uploadState === "uploading" && (
            progressPercent >= 100
              ? `Saving to Telegram... (Do not close)`
              : `${currentFileText} (${progressPercent}%)`
          )}
          {uploadState === "done" && currentFileText}
        </div>
        <div className="dz-sub">
          or click to browse — sent straight to your Telegram channel
        </div>
      </div>
      
      <div className="upload-bar">
        {Array.from({ length: 10 }).map((_, idx) => {
          let cls = "";
          const activeSegment = Math.floor(progressPercent / 10);
          if (uploadState === "uploading") {
            if (idx < activeSegment) cls = "done";
            else if (idx === activeSegment) cls = "now";
          } else if (uploadState === "done") {
            cls = "done";
          } else {
            cls = idx < 3 ? "done" : "";
          }
          return <i key={idx} className={cls}></i>;
        })}
      </div>

      {/* LOCATION PREFERENCE SELECTION DIALOG */}
      {showLocationModal && (
        <div className="viewer-overlay active animate-fade-in" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card soft" style={{ maxWidth: "420px", padding: "30px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "#1b1b20", textAlign: "left", display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
            <h3 style={{ color: "#fff", fontSize: "19px", margin: 0 }}>Select Storage Location</h3>
            <p style={{ color: "var(--muted-2)", fontSize: "13.5px", margin: 0, lineHeight: "1.5" }}>
              Where would you like to upload your selected files?
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff", fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="location"
                  checked={targetLocation === "root"}
                  onChange={() => setTargetLocation("root")}
                  style={{ accentColor: "var(--tg)" }}
                />
                <span>Root Directory</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff", fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="location"
                  checked={targetLocation === "collection"}
                  onChange={() => setTargetLocation("collection")}
                  style={{ accentColor: "var(--tg)" }}
                />
                <span>Specific Collection</span>
              </label>

              {targetLocation === "collection" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginLeft: "24px" }}>
                  {collectionsList.length === 0 ? (
                    <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>No collections created yet.</span>
                  ) : (
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      style={{
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "13.5px",
                        outline: "none"
                      }}
                    >
                      {collectionsList.map((folder) => (
                        <option key={folder.id} value={folder.id} style={{ background: "#1b1b20", color: "#fff" }}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmLocation}
                disabled={targetLocation === "collection" && collectionsList.length === 0}
                style={{ flex: 1, padding: "12px", margin: 0 }}
              >
                Upload
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleCancelLocation}
                style={{ flex: 1, padding: "12px", margin: 0 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
