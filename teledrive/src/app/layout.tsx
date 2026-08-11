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
import Script from "next/script";

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
          </ToastProvider>
        </AuthProvider>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-CDWJFLLVYP" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CDWJFLLVYP');
          `}
        </Script>
      </body>
    </html>
  );
}
