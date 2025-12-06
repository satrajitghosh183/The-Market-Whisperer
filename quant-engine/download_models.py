#!/usr/bin/env python3
"""
Model Download Script
Downloads required NLP models for sentiment analysis
"""

import os
import sys
from pathlib import Path

def download_models():
    """Download sentiment analysis models"""
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        from huggingface_hub import snapshot_download
    except ImportError:
        print("ERROR: transformers and huggingface_hub are required.")
        print("Install with: pip install transformers huggingface_hub")
        sys.exit(1)
    
    # Create models directory
    script_dir = Path(__file__).parent
    models_dir = script_dir / 'models'
    models_dir.mkdir(exist_ok=True)
    
    print("Downloading sentiment analysis models...")
    print("This may take several minutes depending on your internet connection.")
    
    # Try to download FinBERT (financial sentiment model)
    try:
        print("\n1. Attempting to download FinBERT (financial sentiment model)...")
        finbert_path = models_dir / 'finbert-sentiment'
        
        if not finbert_path.exists():
            # Try ProsusAI/finbert model
            try:
                print("   Downloading ProsusAI/finbert...")
                tokenizer = AutoTokenizer.from_pretrained('ProsusAI/finbert')
                model = AutoModelForSequenceClassification.from_pretrained('ProsusAI/finbert')
                
                tokenizer.save_pretrained(str(finbert_path))
                model.save_pretrained(str(finbert_path))
                print(f"   ✓ FinBERT saved to {finbert_path}")
            except Exception as e:
                print(f"   ⚠ Could not download FinBERT: {e}")
                print("   Will use fallback model")
        else:
            print(f"   ✓ FinBERT already exists at {finbert_path}")
    except Exception as e:
        print(f"   ⚠ Error with FinBERT: {e}")
    
    # Download fallback model (Twitter RoBERTa - good general sentiment)
    try:
        print("\n2. Downloading fallback sentiment model (Twitter RoBERTa)...")
        roberta_path = models_dir / 'twitter-roberta-sentiment'
        
        if not roberta_path.exists():
            print("   Downloading cardiffnlp/twitter-roberta-base-sentiment-latest...")
            tokenizer = AutoTokenizer.from_pretrained('cardiffnlp/twitter-roberta-base-sentiment-latest')
            model = AutoModelForSequenceClassification.from_pretrained('cardiffnlp/twitter-roberta-base-sentiment-latest')
            
            tokenizer.save_pretrained(str(roberta_path))
            model.save_pretrained(str(roberta_path))
            print(f"   ✓ Twitter RoBERTa saved to {roberta_path}")
        else:
            print(f"   ✓ Twitter RoBERTa already exists at {roberta_path}")
    except Exception as e:
        print(f"   ⚠ Error downloading fallback model: {e}")
    
    # Download lightweight model as backup
    try:
        print("\n3. Downloading lightweight backup model...")
        distilbert_path = models_dir / 'distilbert-sentiment'
        
        if not distilbert_path.exists():
            print("   Downloading distilbert-base-uncased-finetuned-sst-2-english...")
            tokenizer = AutoTokenizer.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english')
            model = AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english')
            
            tokenizer.save_pretrained(str(distilbert_path))
            model.save_pretrained(str(distilbert_path))
            print(f"   ✓ DistilBERT saved to {distilbert_path}")
        else:
            print(f"   ✓ DistilBERT already exists at {distilbert_path}")
    except Exception as e:
        print(f"   ⚠ Error downloading backup model: {e}")
    
    print("\n" + "="*60)
    print("Model download complete!")
    print("="*60)
    print(f"\nModels are stored in: {models_dir}")
    print("\nNote: The system will automatically use available models.")
    print("If models are not available, it will use keyword-based fallback.")

if __name__ == '__main__':
    download_models()

