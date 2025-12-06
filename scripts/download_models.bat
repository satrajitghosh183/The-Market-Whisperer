@echo off
REM Model Download Script for Windows
REM Downloads required NLP models for sentiment analysis

echo ==========================================
echo Downloading Sentiment Analysis Models
echo ==========================================
echo.

REM Navigate to quant-engine directory
cd /d "%~dp0\..\quant-engine"
if errorlevel 1 (
    echo ERROR: Could not navigate to quant-engine directory
    exit /b 1
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    exit /b 1
)

REM Install required packages if not already installed
echo Installing required Python packages...
python -m pip install transformers torch huggingface-hub --quiet

REM Run the Python download script
echo.
echo Running model download script...
python download_models.py

echo.
echo ==========================================
echo Model download complete!
echo ==========================================
pause

