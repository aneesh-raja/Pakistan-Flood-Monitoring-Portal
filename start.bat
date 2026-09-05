@echo off
echo ============================================================
echo   PAKISTAN FLOOD MONITORING PORTAL — 1-CLICK LAUNCHER
echo ============================================================
echo.

echo Starting FastAPI Backend (Python Uvicorn) on http://localhost:8000 ...
start "FastAPI Backend" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"

echo Starting Vite React Frontend on http://localhost:5173 ...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================================
echo   Both services are launching!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000/docs (Swagger API Docs)
echo ============================================================
echo.
pause
