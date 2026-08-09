"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { checkBackendHealth, checkAuthStatus, getUploadProgress, clearCompletedUploads, BACKEND_URL } from "@/services/api";

interface AuthContextType {
  isLoggedIn: boolean;
  phoneNumber: string;
  login: (phone: string) => void;
  logout: () => void;
  backendOnline: boolean | null;
  loading: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
  autoplayVideos: boolean;
  toggleAutoplay: () => void;
  showFileNames: boolean;
  toggleShowFileNames: () => void;
  originalQuality: boolean;
  toggleOriginalQuality: () => void;
  accentColor: "blue" | "violet" | "orange";
  changeAccentColor: (color: "blue" | "violet" | "orange") => void;
  activeUploads: Array<{ id: string; file_name: string; progress: number; status: string }>;
  clearCompleted: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Frontend preference states
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [showFileNames, setShowFileNames] = useState(true);
  const [originalQuality, setOriginalQuality] = useState(false);
  const [accentColor, setAccentColor] = useState<"blue" | "violet" | "orange">("blue");

  const [activeUploads, setActiveUploads] = useState<Array<{ id: string; file_name: string; progress: number; status: string }>>([]);

  const clearCompleted = async () => {
    if (!phoneNumber) return;
    try {
      await clearCompletedUploads(phoneNumber);
      setActiveUploads(prev => prev.filter(up => up.status !== "completed" && up.status !== "failed"));
    } catch (err) {
      console.error("Failed to clear completed uploads:", err);
    }
  };

  // Poll upload progress globally with self-throttling
  useEffect(() => {
    if (!isLoggedIn || !phoneNumber || backendOnline !== true) {
      setActiveUploads([]);
      return;
    }

    let active = true;
    let timer: NodeJS.Timeout;

    const fetchUploadProgress = async () => {
      try {
        const data = await getUploadProgress(phoneNumber);
        if (!active) return;
        
        setActiveUploads(data);

        // If there are pending/running uploads, poll fast (2s). Otherwise, poll slow (15s).
        const hasActive = data.some(up => up.status === "pending" || up.status === "uploading");
        const nextDelay = hasActive ? 2000 : 15000;

        timer = setTimeout(fetchUploadProgress, nextDelay);
      } catch (err) {
        console.error("Failed to fetch global upload progress:", err);
        if (active) {
          timer = setTimeout(fetchUploadProgress, 15000);
        }
      }
    };

    fetchUploadProgress();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isLoggedIn, phoneNumber, backendOnline]);

  const changeAccentColor = (color: "blue" | "violet" | "orange") => {
    setAccentColor(color);
    localStorage.setItem("teledrive_accent", color);
    
    const root = document.documentElement;
    if (color === "blue") {
      root.style.setProperty("--tg", "#2aabee");
      root.style.setProperty("--tg-deep", "#1c8fc9");
    } else if (color === "violet") {
      root.style.setProperty("--tg", "#9b66f3");
      root.style.setProperty("--tg-deep", "#773cda");
    } else if (color === "orange") {
      root.style.setProperty("--tg", "#f0a13a");
      root.style.setProperty("--tg-deep", "#d9851c");
    }
  };

  // Sync settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("teledrive_theme");
    const dark = savedTheme !== "false"; // default to true
    setIsDarkMode(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

    setAutoplayVideos(localStorage.getItem("teledrive_autoplay") !== "false");
    setShowFileNames(localStorage.getItem("teledrive_filenames") !== "false");
    setOriginalQuality(localStorage.getItem("teledrive_origquality") === "true");

    const savedAccent = localStorage.getItem("teledrive_accent") as "blue" | "violet" | "orange";
    if (savedAccent) {
      changeAccentColor(savedAccent);
    }
  }, []);

  // Fetch stats to sync original quality on login/mount
  useEffect(() => {
    if (isLoggedIn && phoneNumber && backendOnline === true) {
      fetch(`${BACKEND_URL}/auth/user-stats?user_id=${phoneNumber}`)
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.original_quality === "boolean") {
            setOriginalQuality(data.original_quality);
            localStorage.setItem("teledrive_origquality", String(data.original_quality));
          }
        })
        .catch(err => console.error("Error loading original_quality settings:", err));
    }
  }, [isLoggedIn, phoneNumber, backendOnline]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem("teledrive_theme", String(nextMode));
    document.documentElement.setAttribute("data-theme", nextMode ? "dark" : "light");
  };

  const toggleAutoplay = () => {
    const nextVal = !autoplayVideos;
    setAutoplayVideos(nextVal);
    localStorage.setItem("teledrive_autoplay", String(nextVal));
  };

  const toggleShowFileNames = () => {
    const nextVal = !showFileNames;
    setShowFileNames(nextVal);
    localStorage.setItem("teledrive_filenames", String(nextVal));
  };

  const toggleOriginalQuality = async () => {
    const nextVal = !originalQuality;
    setOriginalQuality(nextVal);
    localStorage.setItem("teledrive_origquality", String(nextVal));

    if (phoneNumber) {
      try {
        await fetch(`${BACKEND_URL}/auth/set-original-quality?user_id=${phoneNumber}&enabled=${nextVal}`, {
          method: "POST"
        });
      } catch (err) {
        console.error("Failed to persist original_quality settings:", err);
      }
    }
  };

  // Poll backend health
  useEffect(() => {
    const verifyHealth = async () => {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const storedAuth = localStorage.getItem("teledrive_auth");
      const storedPhone = localStorage.getItem("teledrive_phone");
      
      if (storedAuth === "true" && storedPhone) {
        try {
          const isOnline = await checkBackendHealth();
          if (isOnline) {
            const isAuthorized = await checkAuthStatus(storedPhone);
            if (isAuthorized) {
              setIsLoggedIn(true);
              setPhoneNumber(storedPhone);
            } else {
              localStorage.removeItem("teledrive_auth");
              localStorage.removeItem("teledrive_phone");
              setIsLoggedIn(false);
              setPhoneNumber("");
            }
          } else {
            setIsLoggedIn(true);
            setPhoneNumber(storedPhone);
          }
        } catch {
          setIsLoggedIn(true);
          setPhoneNumber(storedPhone);
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = (phone: string) => {
    localStorage.setItem("teledrive_auth", "true");
    localStorage.setItem("teledrive_phone", phone);
    setIsLoggedIn(true);
    setPhoneNumber(phone);
  };

  const logout = () => {
    localStorage.removeItem("teledrive_auth");
    localStorage.removeItem("teledrive_phone");
    setIsLoggedIn(false);
    setPhoneNumber("");
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      phoneNumber,
      login,
      logout,
      backendOnline,
      loading,
      isDarkMode,
      toggleTheme,
      autoplayVideos,
      toggleAutoplay,
      showFileNames,
      toggleShowFileNames,
      originalQuality,
      toggleOriginalQuality,
      accentColor,
      changeAccentColor,
      activeUploads,
      clearCompleted
    }}>
      {children}

      {/* GLOBAL PERSISTENT UPLOADS PANEL */}
      {activeUploads.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "360px",
          background: "#1c1c24",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
              Uploading to Telegram
            </span>
            <button 
              onClick={clearCompleted}
              style={{
                fontSize: "11px",
                color: "var(--tg)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              Clear Completed
            </button>
          </div>

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "10px", 
            maxHeight: "260px", 
            overflowY: "auto",
            paddingRight: "4px"
          }}>
            {activeUploads.map(up => (
              <div key={up.id} style={{ 
                background: "rgba(255, 255, 255, 0.02)", 
                padding: "10px 12px", 
                borderRadius: "8px", 
                border: "1px solid rgba(255, 255, 255, 0.04)" 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "220px" }} title={up.file_name}>
                    {up.file_name}
                  </span>
                  <span style={{ color: up.status === "completed" ? "#6fce7a" : up.status === "failed" ? "#f85a6a" : "var(--tg)", fontWeight: 600 }}>
                    {up.status === "completed" ? "✓ Done" : up.status === "failed" ? "Failed" : `${up.progress}%`}
                  </span>
                </div>
                
                <div style={{ 
                  width: "100%", 
                  height: "4px", 
                  background: "rgba(255, 255, 255, 0.06)", 
                  borderRadius: "2px", 
                  overflow: "hidden" 
                }}>
                  <div style={{ 
                    width: `${up.progress}%`, 
                    height: "100%", 
                    background: up.status === "completed" ? "#6fce7a" : up.status === "failed" ? "#f85a6a" : "var(--tg)", 
                    borderRadius: "2px",
                    transition: "width 0.2s ease" 
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
