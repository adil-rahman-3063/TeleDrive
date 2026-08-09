"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { sendOtpCode, verifyOtpCode, setChannel } from "@/services/api";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const { isLoggedIn, login, backendOnline } = useAuth();
  const router = useRouter();

  const [loginStep, setLoginStep] = useState<"phone" | "otp" | "channel">("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [channelIdInput, setChannelIdInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, router]);

  const handleSendCode = async () => {
    setErrorMsg("");
    if (!phoneNumber || phoneNumber.length < 6) {
      const el = document.querySelector(".phone-row");
      if (el) {
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 400);
      }
      setErrorMsg("Please enter a valid phone number.");
      return;
    }

    if (backendOnline === false) {
      setErrorMsg("Backend server is offline. Please start the Python backend.");
      return;
    }

    setIsSendingCode(true);
    try {
      const fullPhone = countryCode + phoneNumber;
      await sendOtpCode(fullPhone);
      setIsSendingCode(false);
      setLoginStep("otp");
    } catch (err: any) {
      setIsSendingCode(false);
      setErrorMsg(err.message || "Failed to send OTP code. Is your Telegram API configured?");
      const el = document.querySelector(".phone-row");
      if (el) {
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 400);
      }
    }
  };

  const handleVerify = async () => {
    setErrorMsg("");
    const code = otp.join("");
    if (code.length < 5) {
      const el = document.querySelector(".otp-row");
      if (el) {
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 400);
      }
      setErrorMsg("Please enter the complete 5-digit code.");
      return;
    }

    setIsVerifying(true);
    try {
      const fullPhone = countryCode + phoneNumber;
      const data = await verifyOtpCode(fullPhone, code);
      setIsVerifying(false);
      
      // Check if user already has a linked channel
      if (data && data.channel_id) {
        login(fullPhone);
        router.push("/");
      } else {
        setLoginStep("channel");
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMsg(err.message || "Invalid verification code.");
      const el = document.querySelector(".otp-row");
      if (el) {
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 400);
      }
    }
  };

  const handleLinkChannel = async () => {
    setErrorMsg("");
    if (!channelIdInput.trim()) {
      setErrorMsg("Please enter a Telegram Channel ID or Username.");
      return;
    }

    setIsLinking(true);
    try {
      const fullPhone = countryCode + phoneNumber;
      await setChannel(fullPhone, channelIdInput.trim());
      setIsLinking(false);
      login(fullPhone);
      router.push("/");
    } catch (err: any) {
      setIsLinking(false);
      setErrorMsg(err.message || "Failed to link storage channel. Make sure it exists.");
    }
  };

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="view active" id="view-login" style={{ width: "100%" }}>
      <div className="bento fade-in">
        <div className="card grad login-hero">
          <div>
            <div className="card-label">// self-hosted, runs on localhost</div>
            <h2>
              Your photos and videos,
              <br />
              kept safe inside your own
              <br />
              Telegram channels.
            </h2>
            <div className="tags">
              <span className="on">Unlimited storage</span>
              <span>·</span>
              <span>No third-party servers</span>
              <span>·</span>
              <span>Free forever</span>
            </div>
          </div>
          <div className="login-visual">
            <div className="chan-strip">
              <div className="chan-row">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 3 3 10l6 2 2 6 3-4 5 4Z" />
                  </svg>
                </div>
                <div className="name">teledrive-photos-01</div>
                <div className="meta mono">4.2K files</div>
              </div>
              <div className="chan-row">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 3 3 10l6 2 2 6 3-4 5 4Z" />
                  </svg>
                </div>
                <div className="name">teledrive-videos-01</div>
                <div className="meta mono">318 files</div>
              </div>
              <div className="chan-row">
                <div className="ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 3 3 10l6 2 2 6 3-4 5 4Z" />
                  </svg>
                </div>
                <div className="name">teledrive-archive</div>
                <div className="meta mono">syncing…</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card login-panel">
          {/* Step 1: Phone */}
          {loginStep === "phone" && (
            <div className="step active">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-label">Sign in</div>
                {backendOnline === true && (
                  <span className="chip ok" style={{ background: "rgba(111,206,122,0.15)", color: "#3f9a4d", fontSize: "10.5px" }}>Backend Online</span>
                )}
                {backendOnline === false && (
                  <span className="chip" style={{ background: "rgba(220,53,69,0.15)", color: "#dc3545", fontSize: "10.5px" }}>Backend Offline</span>
                )}
                {backendOnline === null && (
                  <span className="chip" style={{ background: "rgba(138,137,144,0.15)", color: "var(--muted)", fontSize: "10.5px" }}>Connecting...</span>
                )}
              </div>
              <h2 style={{ fontSize: "22px" }}>Enter your phone number</h2>
              <p className="desc">
                We'll message a 5-digit code to your Telegram app — that's it, no passwords.
              </p>
              
              {errorMsg && (
                <div style={{ padding: "10px 12px", background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.2)", borderRadius: "8px", color: "#f58f9b", fontSize: "12.5px", marginTop: "12px" }}>
                  {errorMsg}
                </div>
              )}

              <div className="field-label">Phone number</div>
              <div className="phone-row" style={{ display: "flex", alignItems: "center" }}>
                <input
                  placeholder="+91"
                  maxLength={5}
                  value={countryCode}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith("+") && val.length > 0) {
                      val = "+" + val.replace(/\D/g, "");
                    } else if (val.startsWith("+")) {
                      val = "+" + val.substring(1).replace(/\D/g, "");
                    }
                    setCountryCode(val);
                  }}
                  style={{
                    width: "65px",
                    background: "transparent",
                    border: "none",
                    borderRight: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "var(--ink)",
                    fontSize: "15px",
                    fontWeight: "600",
                    textAlign: "center",
                    outline: "none",
                    height: "100%",
                    padding: "0"
                  }}
                />
                <input
                  className="phone-input"
                  placeholder="98765 43210"
                  maxLength={12}
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  style={{ flex: 1, paddingLeft: "12px" }}
                />
              </div>
              <button
                className={`btn btn-primary ${isSendingCode ? "loading" : ""}`}
                onClick={handleSendCode}
                style={{ marginTop: "24px" }}
                disabled={backendOnline === false}
              >
                <span className="spin"></span>
                <span className="btn-text">Send code</span>
              </button>
            </div>
          )}

          {/* Step 2: OTP */}
          {loginStep === "otp" && (
            <div className="step active">
              <div className="card-label">Verify</div>
              <h2 style={{ fontSize: "22px" }}>Enter the code</h2>
              <p className="desc">
                Sent via Telegram to{" "}
                <b style={{ color: "var(--ink)" }}>+91 {phoneNumber}</b>
              </p>

              {errorMsg && (
                <div style={{ padding: "10px 12px", background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.2)", borderRadius: "8px", color: "#f58f9b", fontSize: "12.5px", marginTop: "12px" }}>
                  {errorMsg}
                </div>
              )}

              <div className="otp-row" style={{ marginTop: "18px" }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    className={`otp-box ${digit ? "filled" : ""}`}
                    maxLength={1}
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const nextOtp = [...otp];
                      nextOtp[idx] = val;
                      setOtp(nextOtp);
                      if (val && idx < 4) {
                        document.getElementById(`otp-${idx + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[idx] && idx > 0) {
                        document.getElementById(`otp-${idx - 1}`)?.focus();
                      }
                    }}
                  />
                ))}
              </div>
              <div className="resend-line">
                Didn't get it? <b onClick={() => {}}>Resend code</b> · 0:28
              </div>
              <button
                className={`btn btn-primary ${isVerifying ? "loading" : ""}`}
                onClick={handleVerify}
                style={{ marginTop: "24px" }}
              >
                <span className="spin"></span>
                <span className="btn-text">Verify & continue</span>
              </button>
              <button className="btn btn-ghost" onClick={() => { setLoginStep("phone"); setErrorMsg(""); }}>
                ← Use a different number
              </button>
            </div>
          )}

          {/* Step 3: Link Channel */}
          {loginStep === "channel" && (
            <div className="step active">
              <div className="card-label">Configure Storage</div>
              <h2 style={{ fontSize: "22px" }}>Link storage channel</h2>
              <p className="desc">
                Configure a Telegram channel to serve as your personal storage vault.
              </p>

              <div style={{ margin: "16px 0 20px 0", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--tg)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Option A: Public Channel</div>
                  <ol style={{ margin: 0, paddingLeft: "16px", color: "var(--muted-2)", fontSize: "12.5px", display: "flex", flexDirection: "column", gap: "4px", lineHeight: "1.4" }}>
                    <li>Create a channel and set it as <b>Public</b>.</li>
                    <li>Configure a username link (e.g. <code>@my_channel_name</code>) and enter it below.</li>
                  </ol>
                </div>
                
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--warn)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Option B: Private Channel (via @ShowJsonBot)</div>
                  <ol style={{ margin: 0, paddingLeft: "16px", color: "var(--muted-2)", fontSize: "12.5px", display: "flex", flexDirection: "column", gap: "4px", lineHeight: "1.4" }}>
                    <li>Create a <b>Private</b> channel.</li>
                    <li>Add bot <code>@ShowJsonBot</code> as an administrator to your channel.</li>
                    <li>Check the bot's chat window to retrieve your Channel ID (starts with <code>-100</code>).</li>
                    <li><b>Remove the bot</b> from the administrators list immediately for safety.</li>
                  </ol>
                </div>
              </div>

              {errorMsg && (
                <div style={{ padding: "10px 12px", background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.2)", borderRadius: "8px", color: "#f58f9b", fontSize: "12.5px", marginTop: "12px" }}>
                  {errorMsg}
                </div>
              )}

              <div className="field-label" style={{ marginTop: "18px" }}>Channel Username or ID</div>
              <div className="phone-row" style={{ paddingLeft: "14px" }}>
                <input
                  className="phone-input"
                  placeholder="@my_teledrive_channel or -100xxxxxxxx"
                  style={{ width: "100%", paddingLeft: 0 }}
                  value={channelIdInput}
                  onChange={(e) => setChannelIdInput(e.target.value)}
                />
              </div>
              <button
                className={`btn btn-primary ${isLinking ? "loading" : ""}`}
                onClick={handleLinkChannel}
                style={{ marginTop: "24px" }}
              >
                <span className="spin"></span>
                <span className="btn-text">Link Channel & Continue</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="login-footerbar">
        <div className="footerbar-pill">
          ✦ Runs entirely on your machine — nothing leaves localhost except your media, into your own channels
        </div>
      </div>
      <Footer />
    </div>
  );
}
