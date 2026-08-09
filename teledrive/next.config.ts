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

  // Kill any orphaned process on port 8000 first so we can bind successfully
  try {
    const { execSync } = require("child_process");
    if (process.platform === "win32") {
      const output = execSync("netstat -ano").toString();
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes(":8000") && line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0") {
            console.log(`[TeleDrive] Stopping orphaned backend process ${pid} on port 8000...`);
            execSync(`taskkill /pid ${pid} /f /t`);
          }
        }
      }
    } else {
      execSync("lsof -t -i:8000 | xargs kill -9", { stdio: "ignore" });
    }
  } catch (e) {}

  let backendDir = path.resolve(process.cwd(), "../teledrive-backend");
  if (!fs.existsSync(backendDir)) {
    backendDir = path.resolve(process.cwd(), "../telestore-backend");
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
    stdio: "inherit",
    windowsHide: true // 🔥 Completely hides the console window on Windows!
  });

  backendStarted = true;
  console.log("[TeleDrive] Backend process launched successfully.");

  const cleanup = () => {
    try {
      if (process.platform === "win32" && backendProcess.pid) {
        const { execSync } = require("child_process");
        execSync(`taskkill /pid ${backendProcess.pid} /f /t`);
      } else {
        backendProcess.kill("SIGINT");
      }
    } catch (e) {}
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}

// Call on startup (only in the main server process, not in compilation workers or Docker)
if (process.env.NEXT_PRIVATE_WORKER !== "true" && !process.env.TELEDRIVE_SKIP_BACKEND) {
  ensureBackend();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
