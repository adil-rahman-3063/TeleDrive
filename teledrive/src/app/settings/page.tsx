"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import TopNav from "@/components/TopNav";
import { getUserStats, setChannel, UserStats } from "@/services/api";
import Footer from "@/components/Footer";

export default function SettingsPage() {
  const {
    isLoggedIn,
    phoneNumber,
    logout,
    loading,
    isDarkMode,
    toggleTheme,
    autoplayVideos,
    toggleAutoplay,
    showFileNames,
    toggleShowFileNames,
    originalQuality,
    toggleOriginalQuality,
    backendOnline
  } = useAuth();
  const router = useRouter();

  const { showToast } = useToast();
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<"content" | "channels" | "appearance" | "account" | "storage" | "creator">("content");

  // Modal state for channel input
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelModalValue, setChannelModalValue] = useState("");

  // Live user statistics
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    if (!phoneNumber) return;
    setStatsLoading(true);
    try {
      const s = await getUserStats(phoneNumber);
      setStats(s);
    } catch (err) {
      console.error("Failed to load user settings stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (backendOnline === true) {
      fetchStats();
    }
  }, [isLoggedIn, phoneNumber, loading, backendOnline]);

  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "channels") {
        setActiveSettingsPanel("channels");
      } else if (tab === "account") {
        setActiveSettingsPanel("account");
      }
    }
  }, [pathname, loading]);

  if (loading || !isLoggedIn) {
    return null;
  }

  // Handle changing connected storage channel ID
  const openChannelModal = () => {
    setChannelModalValue(stats?.channel_id || "");
    setShowChannelModal(true);
  };

  const handleUpdateChannel = async () => {
    if (!phoneNumber) return;
    const newChan = channelModalValue.trim();
    if (!newChan) return;
    setShowChannelModal(false);

    try {
      await setChannel(phoneNumber, newChan);
      showToast("Storage channel updated successfully!", "success");
      fetchStats();
    } catch (err: any) {
      showToast(`Error updating storage channel: ${err.message || err}`, "error");
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <TopNav />

      {/* ================= SETTINGS VIEW ================= */}
      <div className="view active" id="view-settings">
        <div className="bento fade-in">
          <div className="card soft">
            <div className="settings-nav">
              <button
                className={activeSettingsPanel === "content" ? "active" : ""}
                onClick={() => setActiveSettingsPanel("content")}
              >
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M3 15l4-4 3 3 5-5 6 6" />
                </svg>
                Content
              </button>
              <button
                className={activeSettingsPanel === "channels" ? "active" : ""}
                onClick={() => setActiveSettingsPanel("channels")}
              >
                <svg viewBox="0 0 24 24">
                  <circle cx="8" cy="8" r="4" />
                  <circle cx="15" cy="9" r="3.4" />
                  <circle cx="10.5" cy="15.5" r="3.8" />
                </svg>
                Telegram channels
              </button>
              <button
                className={activeSettingsPanel === "appearance" ? "active" : ""}
                onClick={() => setActiveSettingsPanel("appearance")}
              >
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                </svg>
                Appearance
              </button>
              <button
                className={activeSettingsPanel === "account" ? "active" : ""}
                onClick={() => setActiveSettingsPanel("account")}
              >
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M4.5 20c1.6-3.6 4.4-5.4 7.5-5.4S17.9 16.4 19.5 20" />
                </svg>
                Account
              </button>
              <button
                className={activeSettingsPanel === "storage" ? "active" : ""}
                onClick={() => setActiveSettingsPanel("storage")}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
                Storage & cache
              </button>
              <button
                className={activeSettingsPanel === "creator" ? "active" : ""}
                onClick={() => setActiveSettingsPanel("creator")}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                Creator & Support
              </button>
            </div>
          </div>

          <div className="card">
            {/* Content Panel */}
            {activeSettingsPanel === "content" && (
              <div className="settings-panel active">
                <div className="card-label">Content</div>
                <h2 style={{ fontSize: "20px" }}>How your media behaves</h2>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Autoplay videos</b>
                    <span>Play video previews on hover in grids</span>
                  </div>
                  <div className={`switch small ${autoplayVideos ? "on" : ""}`} onClick={toggleAutoplay}>
                    <div className="knob"></div>
                  </div>
                </div>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Original quality upload</b>
                    <span>Skip compression before sending to Telegram</span>
                  </div>
                  <div className={`switch small ${originalQuality ? "on" : ""}`} onClick={toggleOriginalQuality}>
                    <div className="knob"></div>
                  </div>
                </div>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Show file names</b>
                    <span>Display original filenames under thumbnails</span>
                  </div>
                  <div className={`switch small ${showFileNames ? "on" : ""}`} onClick={toggleShowFileNames}>
                    <div className="knob"></div>
                  </div>
                </div>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Thumbnail density</b>
                    <span>Number of columns in grid views</span>
                  </div>
                  <div className="seg" style={{ width: "180px" }}>
                    <button className="active">Cozy</button>
                    <button>Compact</button>
                  </div>
                </div>
              </div>
            )}

            {/* Channels Panel */}
            {activeSettingsPanel === "channels" && (
              <div className="settings-panel active">
                <div className="card-label">Telegram channels</div>
                <h2 style={{ fontSize: "20px" }}>Where your media is stored</h2>
                
                {statsLoading ? (
                  <div className="skeleton" style={{ height: "64px", width: "100%", borderRadius: "12px", margin: "10px 0" }}></div>
                ) : stats?.channel_id ? (
                  <div className="channel-item">
                    <div className="ic">
                      <svg viewBox="0 0 24 24">
                        <path d="M21 3 3 10l6 2 2 6 3-4 5 4Z" />
                      </svg>
                    </div>
                    <div className="ct">
                      <b>{stats.channel_title || "Personal Cloud Storage"}</b>
                      <span>
                        {stats.channel_username ? `@${stats.channel_username}` : `ID: ${stats.channel_id}`} · {stats.files_count} files stored
                      </span>
                    </div>
                    <span className="chip ok">Connected</span>
                  </div>
                ) : (
                  <div style={{ padding: "12px 14px", background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.18)", borderRadius: "8px", color: "#f58f9b", fontSize: "13px" }}>
                    No backup storage channel linked yet. Please configure below.
                  </div>
                )}

                <button className="btn btn-primary" onClick={openChannelModal} style={{ marginTop: "20px" }}>
                  <span className="btn-text">{stats?.channel_id ? "Change connected channel" : "Connect storage channel"}</span>
                </button>
              </div>
            )}

            {/* Appearance Panel */}
            {activeSettingsPanel === "appearance" && (
              <div className="settings-panel active">
                <div className="card-label">Appearance</div>
                <h2 style={{ fontSize: "20px" }}>Make it yours</h2>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Theme</b>
                    <span>Dark, light, or match system</span>
                  </div>
                  <div className="seg" style={{ width: "220px" }}>
                    <button onClick={() => { if (isDarkMode) toggleTheme(); }} className={!isDarkMode ? "active" : ""}>Light</button>
                    <button onClick={() => { if (!isDarkMode) toggleTheme(); }} className={isDarkMode ? "active" : ""}>Dark</button>
                    <button onClick={() => {}}>System</button>
                  </div>
                </div>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Reduce motion</b>
                    <span>Turn off card and viewer animations</span>
                  </div>
                  <div className="switch small">
                    <div className="knob"></div>
                  </div>
                </div>
                <div className="row-item">
                  <div className="ri-text">
                    <b>Accent color</b>
                    <span>Used for sync status and highlights</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#2aabee", border: "2px solid #131316", cursor: "pointer" }}></div>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#d9c6f3", cursor: "pointer" }}></div>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#f0a13a", cursor: "pointer" }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Panel */}
            {activeSettingsPanel === "account" && (
              <div className="settings-panel active">
                <div className="card-label">Account</div>
                <h2 style={{ fontSize: "20px" }}>Signed in with Telegram</h2>
                {statsLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px", width: "100%" }}>
                    <div className="skeleton" style={{ height: "48px", width: "100%" }}></div>
                    <div className="skeleton" style={{ height: "48px", width: "100%" }}></div>
                  </div>
                ) : (
                  <>
                    <div className="row-item">
                      <div className="ri-text">
                        <b>Phone number</b>
                        <span className="mono">{stats?.phone || phoneNumber}</span>
                      </div>
                    </div>
                    <div className="row-item">
                      <div className="ri-text">
                        <b>Display name</b>
                        <span>Personal User Account</span>
                      </div>
                    </div>
                    <div className="row-item">
                      <div className="ri-text">
                        <b>Local server</b>
                        <span className="mono">running on localhost:8000</span>
                      </div>
                      <span className="chip ok">Online</span>
                    </div>
                  </>
                )}
                <button
                  className="btn danger-btn"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  style={{ marginTop: "20px" }}
                >
                  <span className="btn-text">Sign out</span>
                </button>
              </div>
            )}

            {/* Storage Panel */}
            {activeSettingsPanel === "storage" && (
              <div className="settings-panel active">
                <div className="card-label">Storage & cache</div>
                <h2 style={{ fontSize: "20px" }}>Local cache on this device</h2>
                <p className="desc">
                  Full-resolution files always live in your Telegram channels — this only affects the local thumbnail cache.
                </p>
                {statsLoading ? (
                  <div className="skeleton" style={{ height: "130px", width: "100%", marginTop: "26px" }}></div>
                ) : (
                  <>
                    <div className="storage-bars" style={{ marginTop: "26px" }}>
                      <i style={{ height: "20%" }}></i>
                      <i style={{ height: "34%" }}></i>
                      <i style={{ height: "16%" }}></i>
                      <i style={{ height: "50%" }}></i>
                      <i style={{ height: "28%" }}></i>
                    </div>
                    <div className="row-item" style={{ marginTop: "10px" }}>
                      <div className="ri-text">
                        <b>Local database storage</b>
                        <span>{stats ? formatBytes(stats.total_size) : "0 Bytes"} total files capacity</span>
                      </div>
                      <button className="btn btn-ghost" style={{ margin: 0, color: "var(--ink)" }}>Clear cache</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Creator Panel */}
            {activeSettingsPanel === "creator" && (
              <div className="settings-panel active" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <div className="card-label">Creator</div>
                  <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Meet the developer</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <img 
                      src="/profile.jpg" 
                      alt="Adil Rahiman" 
                      style={{ 
                        width: "80px", 
                        height: "80px", 
                        borderRadius: "50%", 
                        objectFit: "cover",
                        border: "2px solid rgba(255, 255, 255, 0.1)"
                      }} 
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <b style={{ fontSize: "18px", color: "#fff" }}>Adil Rahiman</b>
                      <span style={{ fontSize: "13px", color: "var(--muted)" }}>Full Stack Developer & Open Source Creator</span>
                      <a 
                        href="https://adilrahman.cc" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          fontSize: "13px", 
                          color: "#0a84ff", 
                          textDecoration: "none", 
                          fontWeight: 500,
                          marginTop: "4px"
                        }}
                      >
                        portfolio: adilrahman.cc
                      </a>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "20px" }}>
                  <div className="card-label">Support Project</div>
                  <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Donate & Support</h2>
                  <p className="desc" style={{ color: "var(--muted)", marginBottom: "16px" }}>
                    If TeleDrive is helping you save storage and backup your files, consider supporting the development!
                  </p>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "30px", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", background: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <img 
                        src="/GooglePay_QR.png" 
                        alt="UPI Payment QR Code" 
                        style={{ width: "160px", height: "160px", borderRadius: "8px", objectFit: "contain" }} 
                      />
                      <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>UPI QR Code (Google Pay)</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>PayPal Email</span>
                        <b style={{ color: "#fff", fontSize: "15px" }}>adilrahman3063@gmail.com</b>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Creator Portfolio</span>
                        <a 
                          href="https://adilrahman.cc" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: "#0a84ff", textDecoration: "none", fontWeight: 500, fontSize: "15px" }}
                        >
                          adilrahman.cc
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showChannelModal && (
        <div className="modal-overlay" onClick={() => setShowChannelModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Connect Storage Channel</h3>
            <p>Enter your Telegram channel username or numeric ID (e.g. @my_channel or -100xxxxxxxxxx)</p>
            <input
              type="text"
              value={channelModalValue}
              onChange={(e) => setChannelModalValue(e.target.value)}
              placeholder="@channel_username or -100..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdateChannel()}
            />
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setShowChannelModal(false)}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleUpdateChannel}>Connect</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
