"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { checkBackendHealth, checkAuthStatus, BACKEND_URL } from "@/services/api";

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

  // Sync settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("teledrive_theme");
    const dark = savedTheme !== "false"; // default to true
    setIsDarkMode(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

    setAutoplayVideos(localStorage.getItem("teledrive_autoplay") !== "false");
    setShowFileNames(localStorage.getItem("teledrive_filenames") !== "false");
    setOriginalQuality(localStorage.getItem("teledrive_origquality") === "true");
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
      toggleOriginalQuality
    }}>
      {children}
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
