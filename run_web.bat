@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080
  python -m http.server 8080
) else (
  echo Python not found.
  echo Install Python or deploy this folder to Netlify, Vercel, GitHub Pages, or any static web host.
  pause
)
