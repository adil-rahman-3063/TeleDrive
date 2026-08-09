"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function TopNav() {
  const pathname = usePathname();
  const { backendOnline } = useAuth();

  return (
    <div className="topnav">
      <Link href="/" className="brand">
        <div className="mark"></div>
        <span>TeleDrive</span>
      </Link>
      
      <div className="navlinks">
        <Link href="/">
          <button className={pathname === "/" ? "active" : ""}>
            Home
          </button>
        </Link>
        <Link href="/collections">
          <button className={pathname.startsWith("/collections") ? "active" : ""}>
            Collections
          </button>
        </Link>
        <Link href="/settings">
          <button className={pathname.startsWith("/settings") ? "active" : ""}>
            Settings
          </button>
        </Link>
      </div>

      <div className="navright">
        {backendOnline === true && (
          <div className="status-pill">
            <span className="dot"></span> Backend Connected
          </div>
        )}
        {backendOnline === false && (
          <div className="status-pill" style={{ background: "rgba(220, 53, 69, 0.14)", borderColor: "rgba(220, 53, 69, 0.35)", color: "#f58f9b" }}>
            <span className="dot" style={{ background: "#dc3545", boxShadow: "none", animation: "none" }}></span> Backend Offline
          </div>
        )}
        {backendOnline === null && (
          <div className="status-pill" style={{ background: "rgba(138, 137, 144, 0.14)", borderColor: "rgba(138, 137, 144, 0.35)", color: "#c3c2c9" }}>
            <span className="dot" style={{ background: "var(--muted)", boxShadow: "none", animation: "none" }}></span> Checking Backend...
          </div>
        )}
        <Link href="/settings" className="avatar-btn" style={{ textDecoration: "none" }}>
          AR
        </Link>
      </div>
    </div>
  );
}
