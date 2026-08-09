"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/TopNav";
import Dropzone from "@/components/Dropzone";
import { getFolders, getFiles } from "@/services/api";
import Footer from "@/components/Footer";

export default function DashboardPage() {
  const { isLoggedIn, phoneNumber, loading, isDarkMode, toggleTheme, backendOnline } = useAuth();
  const router = useRouter();

  // Dynamic counts states
  const [folderCount, setFolderCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const loadStats = async () => {
      if (!phoneNumber) return;
      setStatsLoading(true);
      try {
        const foldersList = await getFolders(phoneNumber);
        const filesList = await getFiles(phoneNumber, "root");
        
        setFolderCount(foldersList ? foldersList.length : 0);
        
        if (filesList) {
          setFileCount(filesList.length);
          const images = filesList.filter(
            f => f.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|heic|webp)$/i.test(f.file_name)
          );
          const videos = filesList.filter(
            f => f.mime_type?.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/i.test(f.file_name)
          );
          setImageCount(images.length);
          setVideoCount(videos.length);
        }
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (backendOnline === true) {
      loadStats();
    }
  }, [isLoggedIn, phoneNumber, loading, backendOnline]);

  if (loading || !isLoggedIn) {
    return null;
  }

  return (
    <>
      <TopNav />

      {/* ================= HOME VIEW ================= */}
      <div className="view active" id="view-home">
        <div className="bento fade-in">
          <div className="card dark home-hero">
            <div className="dotcluster" style={{ filter: "invert(1)" }}>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div className="card-label" style={{ color: "#8a8990" }}>
              Welcome back
            </div>
            <h2 style={{ color: "#fff" }}>
              Your Telegram-backed
              <br />
              library, at a glance
            </h2>
            <div className="stat-row">
              <div className="stat" style={{ color: "#fff" }}>
                {statsLoading ? (
                  <div className="skeleton" style={{ width: "40px", height: "24px", borderRadius: "4px", marginBottom: "4px" }}></div>
                ) : (
                  <b>{imageCount}</b>
                )}
                <span>photos</span>
              </div>
              <div className="stat" style={{ color: "#fff" }}>
                {statsLoading ? (
                  <div className="skeleton" style={{ width: "40px", height: "24px", borderRadius: "4px", marginBottom: "4px" }}></div>
                ) : (
                  <b>{videoCount}</b>
                )}
                <span>videos</span>
              </div>
              <div className="stat" style={{ color: "#fff" }}>
                {statsLoading ? (
                  <div className="skeleton" style={{ width: "40px", height: "24px", borderRadius: "4px", marginBottom: "4px" }}></div>
                ) : (
                  <b>{folderCount}</b>
                )}
                <span>collections</span>
              </div>
            </div>
          </div>

          <Dropzone />

          <div className="card soft home-toggle">
            <div className="card-label">Appearance</div>
            <h2 style={{ fontSize: "19px" }}>Dark interface</h2>
            <p className="desc">
              TeleDrive matches your system by default, or pin it manually.
            </p>
            <div className="toggle-wrap">
              <div
                className={`switch ${isDarkMode ? "on" : ""}`}
                onClick={toggleTheme}
              >
                <div className="knob">
                  <svg viewBox="0 0 24 24" style={{ stroke: "#131316" }}>
                    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
                  </svg>
                </div>
              </div>
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                Follows system · currently {isDarkMode ? "dark" : "light"}
              </span>
            </div>
          </div>

          <div className="card soft home-actions">
            <div className="card-label">Quick actions</div>
            <h2 style={{ fontSize: "19px" }}>Manage your library</h2>
            <div className="action-grid">
              <div className="action-tile" onClick={() => router.push("/collections")}>
                <svg viewBox="0 0 24 24">
                  <path d="M3 7h6l2 2h10v10H3Z" />
                </svg>
                <span>Collections</span>
              </div>
              <div className="action-tile" onClick={() => router.push("/settings?tab=channels")}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                </svg>
                <span>Channels</span>
              </div>
              <div className="action-tile" onClick={() => router.push("/settings?tab=account")}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M4.5 20c1.6-3.6 4.4-5.4 7.5-5.4S17.9 16.4 19.5 20" />
                </svg>
                <span>Account</span>
              </div>
              <div className="action-tile" onClick={() => router.push("/settings?tab=creator")}>
                <svg viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>Creator</span>
              </div>
            </div>
          </div>

          <div className="card grad2 home-storage">
            <div className="card-label">Storage across channels</div>
            <h2 style={{ fontSize: "19px" }}>Effectively unlimited</h2>
            <div className="storage-bars">
              <i style={{ height: "30%" }}></i>
              <i style={{ height: "55%" }}></i>
              <i style={{ height: "40%" }}></i>
              <i style={{ height: "78%" }}></i>
              <i style={{ height: "60%" }}></i>
              <i style={{ height: "90%" }}></i>
              <i style={{ height: "48%" }}></i>
              <i style={{ height: "70%" }}></i>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
