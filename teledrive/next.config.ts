import type { NextConfig } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import net from "net";

let backendStarted = false;

function checkPortActive(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(150);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function ensureBackend() {
  if (backendStarted) return;

  // Prevent launching duplicate processes, but kill any existing one on port 8000 first so it restarts with stdio inherited
  let backendDir = path.resolve(process.cwd(), "../teledrive-backend");
  if (!fs.existsSync(backendDir)) {
    backendDir = path.resolve(process.cwd(), "../telestore-backend");
  }

  const isAlreadyRunning = await checkPortActive(8000);
  if (isAlreadyRunning) {
    try {
      const { execSync } = require("child_process");
      const isWin = process.platform === "win32";
      if (isWin) {
        const netstat = execSync("netstat -ano").toString();
        const lines = netstat.split("\n");
        for (const line of lines) {
          if (line.includes("127.0.0.1:8000") || line.includes("0.0.0.0:8000") || line.includes("[::]:8000")) {
            const cols = line.trim().split(/\s+/);
            const pid = cols[cols.length - 1];
            if (pid && pid !== "0") {
              console.log(`[TeleDrive] Killing existing backend process on PID ${pid} to bind stdio logs...`);
              execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }
      } else {
        // Mac/Linux: use lsof to find PID on port 8000
        try {
          const lsofOut = execSync("lsof -ti:8000").toString().trim();
          if (lsofOut) {
            console.log(`[TeleDrive] Killing existing backend process on PID ${lsofOut}...`);
            execSync(`kill -9 ${lsofOut}`, { stdio: "ignore" });
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch { /* no process on port */ }
      }
    } catch (e) {
      console.log("[TeleDrive] Failed to kill existing port 8000 process:", e);
    }
  }
  
  // Resolve python path — cross-platform (Windows vs Mac/Linux)
  let pythonPath = "python";
  const isWindows = process.platform === "win32";
  const binDir = isWindows ? "Scripts" : "bin";
  const pythonExe = isWindows ? "python.exe" : "python";
  const dotVenvPython = path.join(backendDir, ".venv", binDir, pythonExe);
  const venvPython = path.join(backendDir, "venv", binDir, pythonExe);

  if (fs.existsSync(dotVenvPython)) {
    pythonPath = dotVenvPython;
  } else if (fs.existsSync(venvPython)) {
    pythonPath = venvPython;
  }

  console.log(`[TeleDrive] Starting backend using: ${pythonPath}`);
  
  const backendProcess = spawn(pythonPath, ["-m", "uvicorn", "main:app", "--port", "8000"], {
    cwd: backendDir,
    detached: true,
    stdio: "inherit",
    windowsHide: true // 🔥 Completely hides the console window on Windows!
  });

  backendProcess.unref();
  backendStarted = true;
  console.log("[TeleDrive] Backend process launched successfully.");
}

// Call on startup (only in the main server process, not in compilation workers or Docker)
if (process.env.NEXT_PRIVATE_WORKER !== "true" && !process.env.TELEDRIVE_SKIP_BACKEND) {
  ensureBackend();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
