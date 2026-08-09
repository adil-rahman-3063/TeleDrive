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
    console.log("[TeleDrive] Backend is already running on port 8000. Skipping launch.");
    backendStarted = true;
    return;
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
      backendProcess.kill("SIGINT");
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
