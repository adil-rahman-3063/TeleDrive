  "use client";

import React, { useEffect, useState } from "react";
import { getFileDownloadProgress } from "@/services/api";

interface MediaFile {
  id?: string;
  name: string;
  grad: string;
  video: boolean;
  size: string;
  url?: string;
}

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  files: MediaFile[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onDelete?: (idx: number) => void;
}

export default function MediaViewer({
  isOpen,
  onClose,
  files,
  currentIndex,
  onIndexChange,
  onDelete,
}: MediaViewerProps) {
  const [progressInfo, setProgressInfo] = useState<{ progress: number; status: string } | null>(null);

  const currentFile = files[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") {
        onIndexChange((currentIndex + 1) % files.length);
      } else if (e.key === "ArrowLeft") {
        onIndexChange((currentIndex - 1 + files.length) % files.length);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, files.length, onIndexChange, onClose]);

  useEffect(() => {
    setProgressInfo(null);
    if (!isOpen || !currentFile || !currentFile.video || !currentFile.id) return;

    let active = true;
    let timer: NodeJS.Timeout;

    const checkProgress = async () => {
      try {
        const res = await getFileDownloadProgress(currentFile.id!);
        if (!active) return;
        setProgressInfo({ progress: res.progress, status: res.status });
        
        if (res.status === "cached" || res.progress >= 100) {
          setTimeout(() => {
            if (active) setProgressInfo(null);
          }, 1500);
          return;
        }

        timer = setTimeout(checkProgress, 1000);
      } catch (err) {
        console.error("Failed to fetch download progress:", err);
      }
    };

    checkProgress();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, currentIndex, currentFile?.id]);

  if (!isOpen || files.length === 0) return null;

  const handleDownload = () => {
    if (currentFile.url) {
      window.open(currentFile.url, "_blank");
    }
  };

  return (
    <div className="viewer-overlay active animate-fade-in">
      <div className="viewer-top">
        <div className="vinfo">
          <b>{currentFile.name}</b>
          <span>
            {currentFile.size} · sent to Telegram Storage
          </span>
        </div>
        <div className="viewer-actions">
          {currentFile.url && (
            <div className="icon-btn" title="Download" onClick={handleDownload}>
              <svg viewBox="0 0 24 24">
                <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
              </svg>
            </div>
          )}
          {onDelete && (
            <div className="icon-btn" title="Delete" onClick={() => onDelete(currentIndex)}>
              <svg viewBox="0 0 24 24" style={{ stroke: "#dc3545" }}>
                <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
              </svg>
            </div>
          )}
          <div className="icon-btn" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </div>
        </div>
      </div>

      <div
        className="viewer-nav prev"
        onClick={() => onIndexChange((currentIndex - 1 + files.length) % files.length)}
      >
        <svg viewBox="0 0 24 24">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </div>
      
      <div className="viewer-stage">
        <div className="vf-corner tl"></div>
        <div className="vf-corner tr"></div>
        <div className="vf-corner bl"></div>
        <div className="vf-corner br"></div>
        <div className="viewer-media" style={{ background: currentFile.grad, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", width: "100%", height: "100%" }}>
          {currentFile.video ? (
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <video 
                src={currentFile.url} 
                controls 
                autoPlay 
                style={{ maxWidth: "100%", maxHeight: "100%", outline: "none", zIndex: 5 }} 
              />
              {progressInfo && progressInfo.status === "downloading" && (
                <div style={{ 
                  position: "absolute", 
                  bottom: "80px", 
                  left: "50%", 
                  transform: "translateX(-50%)", 
                  background: "rgba(10, 10, 12, 0.85)", 
                  padding: "10px 18px", 
                  borderRadius: "20px", 
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  zIndex: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
                }}>
                  <svg className="spin" viewBox="0 0 24 24" style={{ width: "16px", height: "16px", stroke: "#0a84ff", fill: "none" }}>
                    <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="30 10" />
                  </svg>
                  <span style={{ fontSize: "12.5px", color: "#fff", fontWeight: 500 }}>
                    Buffering from Telegram: {progressInfo.progress}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            currentFile.url && (
              <img 
                src={currentFile.url} 
                alt={currentFile.name} 
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", zIndex: 5 }} 
              />
            )
          )}
        </div>
      </div>

      <div
        className="viewer-nav next"
        onClick={() => onIndexChange((currentIndex + 1) % files.length)}
      >
        <svg viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="filmstrip" style={{ display: "flex", gap: "8px", justifyContent: "center", padding: "12px", zIndex: 10 }}>
        {files.map((ff, idx) => (
          <div
            key={idx}
            className={`film-thumb ${idx === currentIndex ? "active" : ""}`}
            style={{ 
              background: ff.grad, 
              width: "50px", 
              height: "50px", 
              borderRadius: "8px", 
              overflow: "hidden", 
              position: "relative",
              cursor: "pointer",
              border: idx === currentIndex ? "2px solid var(--tg)" : "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={() => onIndexChange(idx)}
          >
            {ff.video ? (
              <video 
                src={ff.url} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                muted 
                playsInline 
              />
            ) : (
              ff.url && (
                <img 
                  src={ff.url} 
                  alt="" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  loading="lazy"
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
