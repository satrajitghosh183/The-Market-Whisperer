#!/usr/bin/env python3
"""
Sentiment Analysis Module
Uses transformers library for financial news sentiment analysis
"""

import sys
import json
import os
from typing import Dict

try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

# Model paths
MODEL_DIR = os.path.join(os.path.dirname(__file__), '../../models')
SENTIMENT_MODEL_NAME = 'finbert-sentiment'  # Will use FinBERT if available

def load_sentiment_model():
    """Load sentiment analysis model"""
    if not TRANSFORMERS_AVAILABLE:
        return None
    
    try:
        # Try to load FinBERT or similar financial sentiment model
        model_path = os.path.join(MODEL_DIR, SENTIMENT_MODEL_NAME)
        
        if os.path.exists(model_path):
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            model = AutoModelForSequenceClassification.from_pretrained(model_path)
            return pipeline('sentiment-analysis', model=model, tokenizer=tokenizer)
        else:
            # Fallback to general sentiment model
            try:
                return pipeline('sentiment-analysis', model='cardiffnlp/twitter-roberta-base-sentiment-latest')
            except:
                return pipeline('sentiment-analysis')
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        return None

def analyze_sentiment(text: str) -> Dict:
    """Analyze sentiment of text"""
    if not text or len(text.strip()) == 0:
        return {'score': 0.5, 'label': 'neutral'}
    
    # Try to use transformer model
    classifier = load_sentiment_model()
    
    if classifier:
        try:
            # Limit text length for model
            text_limited = text[:512]  # Most models have 512 token limit
            result = classifier(text_limited)[0]
            
            # Convert to our format
            label = result['label'].lower()
            score_raw = result['score']
            
            # Map labels to 0-1 scale
            if 'positive' in label or 'pos' in label:
                score = 0.5 + (score_raw * 0.5)  # 0.5 to 1.0
            elif 'negative' in label or 'neg' in label:
                score = 0.5 - (score_raw * 0.5)  # 0.0 to 0.5
            else:
                score = 0.5  # Neutral
            
            return {
                'score': float(score),
                'label': 'positive' if score > 0.6 else 'negative' if score < 0.4 else 'neutral',
                'confidence': float(score_raw)
            }
        except Exception as e:
            print(f"Error in sentiment analysis: {e}", file=sys.stderr)
    
    # Fallback to keyword-based analysis
    return fallback_sentiment(text)

def fallback_sentiment(text: str) -> Dict:
    """Fallback keyword-based sentiment analysis"""
    text_lower = text.lower()
    
    positive_keywords = [
        'surge', 'rally', 'gain', 'rise', 'up', 'growth', 'profit', 'success',
        'strong', 'bullish', 'outperform', 'beat', 'exceed', 'positive', 'optimistic',
        'breakthrough', 'innovation', 'expansion', 'record', 'high', 'increase',
        'improve', 'boost', 'soar', 'jump', 'climb', 'advance'
    ]
    
    negative_keywords = [
        'drop', 'fall', 'decline', 'loss', 'down', 'crash', 'plunge', 'fail',
        'weak', 'bearish', 'underperform', 'miss', 'negative', 'pessimistic',
        'concern', 'risk', 'worry', 'uncertainty', 'volatility', 'crisis',
        'decrease', 'sink', 'tumble', 'slump', 'dip', 'retreat'
    ]
    
    positive_count = sum(1 for keyword in positive_keywords if keyword in text_lower)
    negative_count = sum(1 for keyword in negative_keywords if keyword in text_lower)
    
    total = positive_count + negative_count
    if total == 0:
        return {'score': 0.5, 'label': 'neutral', 'confidence': 0.5}
    
    score = 0.5 + (positive_count - negative_count) / (total * 2)
    score = max(0.0, min(1.0, score))
    
    if score > 0.6:
        label = 'positive'
    elif score < 0.4:
        label = 'negative'
    else:
        label = 'neutral'
    
    return {
        'score': float(score),
        'label': label,
        'confidence': abs(score - 0.5) * 2  # Distance from neutral
    }

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No text provided'}))
        sys.exit(1)
    
    text = sys.argv[1]
    result = analyze_sentiment(text)
    print(json.dumps(result))

if __name__ == '__main__':
    main()

