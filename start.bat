@echo off
echo Cleaning up any stuck backend processes on port 8000...
FOR /F "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a >nul 2>&1

echo Starting TeleDrive Backend in a new window...
cd teledrive-backend
start "TeleDrive Backend" cmd /c ".venv\Scripts\python.exe -m uvicorn main:app --port 8000"
cd ..

cd teledrive
echo Building TeleDrive for production...
call npm run build
echo Starting TeleDrive production server...
npm start
pause
