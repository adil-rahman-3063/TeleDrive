# Changelog

All notable changes to the TeleDrive project will be documented in this file.

---

## [1.0.0] - 2026-08-09

### Added
- **One-Command Setup Scripts**: Added `setup.bat` (Windows) and `setup.sh` (Mac/Linux) for easy local setup.
- **Docker Support**: Added `Dockerfile` and `docker-compose.yml` for running in containers.
- **Local Caching**: Created a temporary local cache folder for downloaded media files to skip Telegram downloads on repeat loads.
- **Client-Side Search**: Search bar to instantly locate collections and files.
- **Filter Chips**: Fast client-side filters for All, Photos, Videos, and Documents.
- **Toast Notifications**: Interactive notification overlay to replace browser alert prompts.
- **Custom Modals**: Custom inputs and confirm modal dialogs.
- **Loading Skeletons**: Beautiful animated shimmering skeletons on Dashboard, Collections, and Settings panels.
- **Backend Splash Screen**: Splash screen to show connection progress on first launch.
- **MIT License**: Included standard open-source licensing.
- **Contributing Guide**: Clear instructions for setting up workspace and submitting PRs.

### Fixed
- **Cross-Platform Python Paths**: Auto-detects virtual environment binary paths across Windows and Mac/Linux in Next.js config.
- **Graceful Port Release**: Cross-platform process termination on port `8000` to prevent duplicate backend spawning collision errors.
- **Early-Fetch Muted Errors**: Blocked dashboard and collections components from fetching until backend status is confirmed online.
