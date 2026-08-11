"use client";

import React from "react";

export default function Footer() {
  return (
    <footer style={{
      textAlign: "center",
      padding: "24px 16px",
      fontSize: "12px",
      color: "var(--muted)",
      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
      marginTop: "40px",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      background: "rgba(10, 10, 12, 0.2)"
    }}>
      <span>Developed by <b>Adil Rahiman</b></span>
      <span>
        Portfolio: <a href="https://adilrahman.cc" target="_blank" rel="noopener noreferrer" style={{ color: "#0a84ff", textDecoration: "none", fontWeight: 500 }}>adilrahman.cc</a>
      </span>
      <span style={{ marginTop: "8px", opacity: 0.5, fontFamily: "monospace" }}>v1.1</span>
    </footer>
  );
}
