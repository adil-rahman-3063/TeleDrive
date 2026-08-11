@echo off
cd teledrive
echo Building TeleDrive for production...
call npm run build
echo Starting TeleDrive production server...
npm start
pause
