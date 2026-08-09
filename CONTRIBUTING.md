# Contributing to TeleDrive

First off, thank you for considering contributing to TeleDrive! It is people like you who make open source projects amazing.

---

## 🛠️ Development Environment Setup

Please follow the steps below to set up your local development workspace.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Telegram API Credentials** (Get them from [my.telegram.org](https://my.telegram.org))

### 2. Setup Guide
1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/teledrive.git
   cd teledrive
   ```
2. **Run the automatic setup script:**
   - **Windows:** `setup.bat`
   - **Mac / Linux:** `./setup.sh`
3. **Configure your environment:**
   Open `teledrive-backend/.env` and insert your `API_ID` and `API_HASH`.

### 3. Launching the App
Simply run:
```bash
cd teledrive
npm run dev
```
The Next.js development server will start on [http://localhost:3000](http://localhost:3000) and automatically launch the Python FastAPI backend in the background on port `8000`.

---

## 📂 Project Structure

- `teledrive/`: Next.js frontend (React 19, custom CSS)
- `teledrive-backend/`: Python backend (FastAPI, Telethon, SQLite)
- `setup.bat` / `setup.sh`: Installation helpers
- `Dockerfile` / `docker-compose.yml`: Container configuration

---

## 🤝 Pull Request Process

We want to make contributing as easy as possible:

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
2. Code your changes. Keep code clean and well-commented.
3. Test your changes locally. Run a build to check for compilation or TypeScript errors:
   ```bash
   npm run build
   ```
4. Commit your changes with descriptive commit messages.
5. Push to your fork and submit a Pull Request.

---

## 📜 Code of Conduct
Please be respectful and constructive in all communication and interactions within this project.

Thank you for helping make TeleDrive better!
