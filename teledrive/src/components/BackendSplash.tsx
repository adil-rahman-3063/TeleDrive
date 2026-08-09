"use client";

import { useAuth } from "@/hooks/useAuth";

export default function BackendSplash() {
  const { backendOnline, isLoggedIn } = useAuth();

  // Don't show splash on login page or when backend is online
  if (backendOnline === true || !isLoggedIn) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "rgba(22, 22, 26, 0.85)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "12px",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      zIndex: 999999,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      color: "#fff"
    }}>
      <div style={{
        width: "14px",
        height: "14px",
        border: "2.5px solid rgba(255,255,255,0.15)",
        borderTopColor: "#2aabee",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#fff" }}>Connecting to Backend...</span>
        <span style={{ fontSize: "10.5px", color: "#8a8a93" }}>TeleDrive offline</span>
      </div>
    </div>
  );
}
