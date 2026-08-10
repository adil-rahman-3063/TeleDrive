import React from 'react';

interface DownloadItem {
  id: string;
  name: string;
  progress: number;
  status: string;
}

interface DownloadWidgetProps {
  showProgress: boolean;
  minimized: boolean;
  items: DownloadItem[];
  onClose: () => void;
  onMinimize: (val: boolean) => void;
  onClear: () => void;
}

export default function DownloadWidget({ showProgress, minimized, items, onClose, onMinimize, onClear }: DownloadWidgetProps) {
  if (!showProgress) return null;

  if (minimized) {
    return (
      <div 
        className="fade-in"
        onClick={() => onMinimize(false)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(18, 18, 22, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff"
        }}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        {items.some(i => i.status === "downloading" || i.progress < 100) && (
          <div style={{ position: "absolute", top: "12px", right: "12px", width: "10px", height: "10px", background: "var(--tg)", borderRadius: "50%", border: "2px solid rgba(18,18,22,1)" }}></div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="fade-in" 
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "360px",
        background: "rgba(18, 18, 22, 0.85)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Downloads
        </h3>
        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <button 
            onClick={onClear}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "13px", padding: 0 }}
          >
            Clear
          </button>
          <button 
            onClick={() => onMinimize(true)}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", padding: 0 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="12" x2="6" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", maxHeight: "350px", paddingRight: "6px" }}>
        {items.map((item) => (
          <div key={item.id} style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px", gap: "20px" }}>
              <span style={{ color: "#fff", fontWeight: 500, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ color: item.status === "cached" ? "#6fce7a" : "var(--tg)", fontWeight: 600, flexShrink: 0 }}>
                {item.status === "cached" ? "Done" : `${item.progress}%`}
              </span>
            </div>
            <div style={{ width: "100%", height: "4px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${item.progress}%`, height: "100%", background: item.status === "cached" ? "#6fce7a" : "var(--tg)", borderRadius: "2px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
