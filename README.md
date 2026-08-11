<div align="center">

# ☁️ TeleDrive

**Turn Telegram into your personal unlimited cloud storage.**

Upload, organize, and stream your photos, videos, and files — backed by Telegram's free, unlimited storage. Self-hosted. Open source. No subscription required.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white)](https://python.org)
[![Telegram](https://img.shields.io/badge/Telegram-API-26A5E4?logo=telegram)](https://core.telegram.org)

</div>

<br />

<div align="center">
  <table>
    <tr>
      <td>
        <div align="center">
          <h3>📣 Latest Update</h3>
          <p>Fixed Windows <code>start.bat</code> to properly manage background backend processes and updated UI footer. <i>(August 11, 2026)</i></p>
        </div>
      </td>
    </tr>
  </table>
</div>

---

## ✨ Features

- 📁 **Collections** — Organize files into nested folders with drag-and-drop
- 🖼️ **Media Viewer** — Full-screen image/video viewer with filmstrip navigation
- 🔄 **Auto-sync** — Files are stored in your Telegram channel, accessible anywhere
- 🗑️ **Trash & Restore** — Soft-delete with 30-day auto-purge, or restore instantly
- ⚡ **Real-time Progress** — WebSockets provide instant upload/download tracking
- 🎬 **Native Video Streaming** — HTTP Range request support for instant video scrubbing
- 🔄 **Background Processing** — Caches media in the background without freezing the UI
- 🌙 **Dark / Light Mode** — System-aware theme with manual toggle
- 📱 **Channel Support** — Use private channels for organized storage
- 🔐 **Self-hosted** — Your data stays on your Telegram account, not someone else's server
- 💾 **Intelligent Local Caching** — Instantly loads previously downloaded files without re-downloading
- 🎞️ **Video Previews** — Hover-to-play video thumbnails in grid view

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Python, FastAPI, Uvicorn |
| Telegram | Telethon (MTProto API) |
| Database | SQLite (zero-config) |
| Styling | Custom CSS with design tokens |

## 🚀 Quick Start

### Prerequisites

- [Python 3.10+](https://python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- Telegram API credentials ([get them here](https://my.telegram.org))

### One-Command Setup

```bash
# Clone the repo
git clone https://github.com/your-username/teledrive.git
cd teledrive

# Run the setup script
# Windows:
setup.bat

# Mac / Linux:
chmod +x setup.sh && ./setup.sh
```

### Manual Setup

<details>
<summary>Click to expand manual steps</summary>

**1. Backend**

```bash
cd teledrive-backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API_ID and API_HASH
```

**2. Frontend**

```bash
cd teledrive
npm install
```

</details>

### Configure

Edit `teledrive-backend/.env` with your Telegram API credentials:

```env
API_ID=your_api_id_here
API_HASH=your_api_hash_here
```

> 💡 **How to get API credentials:**
> 1. Go to [my.telegram.org](https://my.telegram.org)
> 2. Log in with your phone number
> 3. Click **"API development tools"**
> 4. Create a new application
> 5. Copy the `api_id` and `api_hash`

### Run

```bash
cd teledrive
npm run dev
```

Open **http://localhost:3000** — the backend starts automatically.

## 🐳 Docker

```bash
# Build and run
docker compose up --build

# Open http://localhost:3000
```

## 📂 Project Structure

```
teledrive/
├── teledrive/                 # Next.js frontend
│   ├── src/
│   │   ├── app/               # Pages (dashboard, collections, settings, login)
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # React hooks (auth, theme)
│   │   └── services/          # API client
│   └── next.config.ts         # Auto-launches backend
│
├── teledrive-backend/         # Python FastAPI backend
│   ├── routes/                # API endpoints (auth, files, folders, upload)
│   ├── telegram_client.py     # Telethon client manager
│   ├── database.py            # SQLite database layer
│   └── main.py                # FastAPI app entry point
│
├── setup.bat                  # Windows setup script
├── setup.sh                   # Mac/Linux setup script
├── docker-compose.yml         # Docker configuration
└── LICENSE                    # MIT License
```

## 🔒 Security Notes

- **Session files** (`sessions/`) contain your Telegram auth tokens. **Never commit them.**
- **`.env`** contains your API credentials. **Never commit it.**
- Both are excluded via `.gitignore` by default.
- TeleDrive runs **entirely on your machine** — no data is sent to any third-party server.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 👨‍💻 Creator

This project was built with passion by **Adil Rahiman**.

## 💖 Support & Contributions

If you find this project useful and want to support its ongoing development, consider buying me a coffee or donating!

<div align="left" style="display: flex; gap: 20px;">
  
### PayPal
**Email:** `adilrahman3063@gmail.com`

### Google Pay QR Code
<img src="teledrive/public/GooglePay_QR.png" alt="Google Pay QR Code" width="150"/>

</div>

## 🎨 Credits

- **Homepage UI:** Special thanks to [Denis Dod (Dribbble)](https://dribbble.com/den4dens) for the beautiful homepage UI design and inspiration.

---

<div align="center">

**Built with ❤️ using Telegram's unlimited storage**

</div>
