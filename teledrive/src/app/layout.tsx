import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeleDrive",
  description: "A private cloud storage application using Telegram as an unlimited backend.",
};

import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/components/Toast";
import BackendSplash from "@/components/BackendSplash";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <BackendSplash />
            <div className="shell">
              {children}
            </div>
            <div className="fixed bottom-4 right-4 bg-black/50 text-white/70 px-2 py-1 rounded-md text-xs font-mono backdrop-blur-sm z-50 border border-white/10 pointer-events-none">
              v1.1
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
