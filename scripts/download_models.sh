#!/bin/bash
# Model Download Script
# Downloads required NLP models for sentiment analysis

echo "=========================================="
echo "Downloading Sentiment Analysis Models"
echo "=========================================="
echo ""

# Navigate to quant-engine directory
cd "$(dirname "$0")/../quant-engine" || exit 1

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 is not installed or not in PATH"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "ERROR: pip3 is not installed or not in PATH"
    exit 1
fi

# Install required packages if not already installed
echo "Installing required Python packages..."
pip3 install transformers torch huggingface-hub --quiet

# Run the Python download script
echo ""
echo "Running model download script..."
python3 download_models.py

echo ""
echo "=========================================="
echo "Model download complete!"
echo "=========================================="

