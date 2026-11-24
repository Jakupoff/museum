@echo off
cd /d "%~dp0"
echo Starting the museum (Docker Desktop must be running)...
docker compose up -d --build
echo.
echo Waiting for the public link...
:wait
timeout /t 3 /nobreak >nul
docker compose logs tunnel 2>nul | findstr /r "https://.*trycloudflare.com" >nul || goto wait
echo.
echo ===== Send this link to her (works on iPhone) =====
powershell -NoProfile -Command "$l = (docker compose logs tunnel) -join \"`n\"; ([regex]::Matches($l, 'https://[a-z0-9-]+\.trycloudflare\.com') | Select-Object -Last 1).Value"
echo ===================================================
echo On this laptop you can also open http://localhost:8765
echo The museum password is in the .env file.
pause
