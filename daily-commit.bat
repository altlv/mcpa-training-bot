@echo off
REM ================================
REM MCPA Training Bot - Daily Commit Helper
REM Run this after each study session
REM ================================

echo.
echo MCPA Training Bot - Daily Commit
echo ================================
echo.

REM Check if we're in the right directory
if not exist "TODO.md" (
    echo Error: Please run this from the mcpa-bot directory
    echo    cd C:\Users\User\mcpa-bot
    pause
    exit /b 1
)

REM Show current status
echo Current Status:
echo -----------------
git status --short
echo.

REM Ask for commit message
echo What did you do today?
echo    Examples:
echo    - "Day 1: Read MCP intro, set up project"
echo    - "Day 4: Built quiz MCP server"
echo    - "Day 7: Week 1 review, 80%% on quiz"
echo.
set /p commitmsg="Enter commit message: "

REM Validate input
if "%commitmsg%"=="" (
    echo Error: Commit message cannot be empty
    pause
    exit /b 1
)

REM Stage all changes
echo.
echo Staging changes...
git add .

REM Commit
echo.
echo Committing...
git commit -m "%commitmsg%"

REM Push
echo.
echo Pushing to GitHub...
git push

echo.
echo Done! Your progress is saved.
echo ================================
pause