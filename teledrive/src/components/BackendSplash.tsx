"use client";

import { useAuth } from "@/hooks/useAuth";

export default function BackendSplash() {
  const { backendOnline, isLoggedIn } = useAuth();

  // Don't show splash on login page or when backend is online
  if (backendOnline === true || !isLoggedIn) return null;

  return (
    <div className="backend-splash">
      <div className="spinner" />
      <h2>Starting TeleDrive...</h2>
      <p>Waiting for the backend server to come online</p>
    </div>
  );
}
