#!/usr/bin/env python3
"""
Quantitative Engine - Feature Extraction and Scoring
Provides technical indicators, sentiment integration, and composite scoring
"""

import sys
import json
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Optional

def calculate_indicators(df: pd.DataFrame) -> Dict:
    """Calculate technical indicators from OHLCV data"""
    if len(df) < 20:
        # Return basic indicators even with limited data
        close = df['close'].values if 'close' in df.columns else []
        if len(close) > 0:
            return {
                'current_price': float(close[-1]),
                'momentum60': 0,
                'momentum20': 0,
                'deviation100': 0,
                'rsi': 50,
                'atr20': 0,
                'breakout20': 0,
                'volume_zscore': 0
            }
        return {}
    
    df = df.copy()
    # Handle date format - try YYYYMMDD format first
    try:
        df['date'] = pd.to_datetime(df['date'], format='%Y%m%d')
    except:
        # If that fails, try standard datetime parsing
        df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    close = df['close'].values
    high = df['high'].values
    low = df['low'].values
    volume = df['volume'].values
    
    indicators = {}
    
    # Moving averages
    if len(close) >= 20:
        indicators['ma20'] = np.mean(close[-20:])
        indicators['ma60'] = np.mean(close[-60:]) if len(close) >= 60 else np.mean(close)
        indicators['ma100'] = np.mean(close[-100:]) if len(close) >= 100 else np.mean(close)
    
    # Momentum
    if len(close) >= 60:
        indicators['momentum60'] = (close[-1] - close[-60]) / close[-60]
        indicators['momentum20'] = (close[-1] - close[-20]) / close[-20] if len(close) >= 20 else 0
    else:
        indicators['momentum60'] = (close[-1] - close[0]) / close[0] if len(close) > 1 else 0
        indicators['momentum20'] = 0
    
    # Deviation from 100-day MA
    if 'ma100' in indicators:
        indicators['deviation100'] = (close[-1] - indicators['ma100']) / indicators['ma100']
    else:
        indicators['deviation100'] = 0
    
    # RSI (14-period)
    if len(close) >= 15:
        delta = np.diff(close)
        gain = np.where(delta > 0, delta, 0)
        loss = np.where(delta < 0, -delta, 0)
        
        avg_gain = np.mean(gain[-14:])
        avg_loss = np.mean(loss[-14:])
        
        if avg_loss != 0:
            rs = avg_gain / avg_loss
            indicators['rsi'] = 100 - (100 / (1 + rs))
        else:
            indicators['rsi'] = 100
    else:
        indicators['rsi'] = 50
    
    # ATR (Average True Range) - 20 period
    if len(df) >= 21:
        high_low = high[1:] - low[1:]
        high_close = np.abs(high[1:] - close[:-1])
        low_close = np.abs(low[1:] - close[:-1])
        
        tr = np.maximum(high_low, np.maximum(high_close, low_close))
        atr = np.mean(tr[-20:])
        indicators['atr20'] = (atr / close[-1]) * 100  # Normalized as percentage
    else:
        indicators['atr20'] = 0
    
    # Breakout indicators
    if len(close) >= 20:
        recent_high = np.max(high[-20:])
        recent_low = np.min(low[-20:])
        indicators['breakout20'] = 1 if close[-1] > recent_high * 0.98 else -1 if close[-1] < recent_low * 1.02 else 0
    else:
        indicators['breakout20'] = 0
    
    # Volume z-score
    if len(volume) >= 20:
        vol_mean = np.mean(volume[-20:])
        vol_std = np.std(volume[-20:])
        if vol_std > 0:
            indicators['volume_zscore'] = (volume[-1] - vol_mean) / vol_std
        else:
            indicators['volume_zscore'] = 0
    else:
        indicators['volume_zscore'] = 0
    
    # Current price
    indicators['current_price'] = float(close[-1])
    
    return indicators


def calculate_composite_score(indicators: Dict, sentiment_data: Optional[Dict] = None, policy_data: Optional[Dict] = None) -> float:
    """
    Calculate composite score using the formula from spec:
    Score = 0.35*M60 + 0.20*D100 + 0.15*B20 - 0.10*A20 + 0.10*S3d + 0.05*Csv + 0.05*Pt - 0.05*Ff
    
    Args:
        indicators: Technical indicators
        sentiment_data: Sentiment metrics (sentMean_3d, sentShock, sentVsPrice)
        policy_data: Policy metrics (policyTilt, fomcProximity)
    """
    M60 = indicators.get('momentum60', 0) * 100  # Scale momentum
    D100 = indicators.get('deviation100', 0) * 100  # Scale deviation
    B20 = indicators.get('breakout20', 0) * 10  # Scale breakout
    A20 = indicators.get('atr20', 0)  # Already percentage
    
    # Sentiment features (normalized to -1 to 1 scale)
    if sentiment_data:
        S3d = (sentiment_data.get('sentMean_3d', 0.5) - 0.5) * 2  # Convert 0-1 to -1 to 1
        Csv = sentiment_data.get('sentVsPrice', 0.0)  # Already -1 to 1
    else:
        S3d = 0.0  # Neutral
        Csv = 0.0
    
    # Policy features
    if policy_data:
        Pt = policy_data.get('policyTilt', 0.0)  # Already -1 to 1
        Ff = policy_data.get('fomcProximity', 0.0)  # 0 to 1
    else:
        Pt = 0.0
        Ff = 0.0
    
    score = (
        0.35 * M60 +
        0.20 * D100 +
        0.15 * B20 -
        0.10 * A20 +
        0.10 * S3d +
        0.05 * Csv +
        0.05 * Pt -
        0.05 * Ff
    )
    
    return float(score)


def analyze_ticker(data: List[Dict], sentiment_data: Optional[Dict] = None, policy_data: Optional[Dict] = None) -> Dict:
    """Main analysis function"""
    if not data:
        return {
            'ticker': '',
            'score': 0,
            'indicators': {},
            'recommendation': 'neutral',
            'error': 'No data provided'
        }
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Ensure required columns exist
    required_cols = ['date', 'open', 'high', 'low', 'close', 'volume']
    for col in required_cols:
        if col not in df.columns:
            df[col] = 0
    
    # Calculate indicators
    indicators = calculate_indicators(df)
    
    # Calculate composite score with sentiment and policy data
    score = calculate_composite_score(indicators, sentiment_data, policy_data)
    
    # Determine recommendation
    if score > 5:
        recommendation = 'long'
    elif score < -5:
        recommendation = 'short'
    else:
        recommendation = 'neutral'
    
    # Prepare result
    result = {
        'ticker': data[0].get('ticker', '') if data else '',
        'score': round(score, 4),
        'indicators': {
            k: round(v, 4) if isinstance(v, (int, float)) else v
            for k, v in indicators.items()
        },
        'recommendation': recommendation,
        'sentiment': sentiment_data or {},
        'policy': policy_data or {}
    }
    
    return result


def main():
    """Main entry point"""
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Invalid arguments'}))
        sys.exit(1)
    
    method = sys.argv[1]
    params_input = sys.argv[2]
    
    try:
        # Check if params_input is a file path or JSON string
        if os.path.exists(params_input) and os.path.isfile(params_input):
            # Read from file (to avoid command-line length limits)
            with open(params_input, 'r', encoding='utf-8') as f:
                params = json.load(f)
        else:
            # Parse as JSON string (backward compatibility)
            params = json.loads(params_input)
        
        if method == 'analyze':
            data = params.get('data', [])
            sentiment_data = params.get('sentiment_data')
            policy_data = params.get('policy_data')
            result = analyze_ticker(data, sentiment_data, policy_data)
            print(json.dumps(result))
        else:
            print(json.dumps({'error': f'Unknown method: {method}'}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()

