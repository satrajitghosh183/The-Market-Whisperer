import axios from 'axios';
import dotenv from 'dotenv';
import { Retry } from '../utils/retry.js';
import { Cache } from '../utils/cache.js';

dotenv.config();

const HUGGINGFACE_API_URL = process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HUGGINGFACE_INFERENCE_API_URL = process.env.HUGGINGFACE_INFERENCE_API_URL || 'https://api-inference.huggingface.co';
const HUGGINGFACE_INFERENCE_API_KEY = process.env.HUGGINGFACE_INFERENCE_API_KEY || HUGGINGFACE_API_KEY;
const USE_HUGGINGFACE_INFERENCE_API = process.env.USE_HUGGINGFACE_INFERENCE_API === 'true' || false;
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
const HUGGINGFACE_FALLBACK_MODELS = (process.env.HUGGINGFACE_FALLBACK_MODELS || 'microsoft/Phi-3-mini-4k-instruct,google/flan-t5-base').split(',');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const USE_OPENAI = process.env.USE_OPENAI === 'true' || false;

// Cache for LLM responses (5 minute TTL)
const responseCache = new Cache(300);

export class LLMService {
  static async generateExplanation(ticker, analysis, indicators) {
    // Check cache first
    const cacheKey = `llm:explain:${ticker}:${JSON.stringify(analysis)}:${JSON.stringify(indicators)}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try OpenAI first if configured
      if (USE_OPENAI && OPENAI_API_KEY) {
        try {
          const result = await Retry.withRetry(
            () => this.generateWithOpenAI(ticker, analysis, indicators),
            { maxRetries: 2, shouldRetry: Retry.isRetryableError }
          );
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.warn('OpenAI API failed, trying fallback:', error.message);
        }
      }

      // Try Hugging Face Inference API if configured (better for production)
      if (USE_HUGGINGFACE_INFERENCE_API && HUGGINGFACE_INFERENCE_API_KEY) {
        try {
          const result = await Retry.withRetry(
            () => this.generateWithHuggingFaceInference(ticker, analysis, indicators),
            { maxRetries: 2, shouldRetry: Retry.isRetryableError }
          );
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.warn('Hugging Face Inference API failed, trying direct API:', error.message);
        }
      }

      // Try Hugging Face direct API if configured
      if (HUGGINGFACE_API_KEY) {
        try {
          const result = await Retry.withRetry(
            () => this.generateWithHuggingFace(ticker, analysis, indicators),
            { maxRetries: 2, shouldRetry: Retry.isRetryableError }
          );
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.warn('Hugging Face API failed, using fallback:', error.message);
        }
      }

      // Fallback to enhanced template-based explanation
      return this.fallbackExplanation(ticker, analysis, indicators);
    } catch (error) {
      console.error('LLM explanation error:', error.message);
      return this.fallbackExplanation(ticker, analysis, indicators);
    }
  }

  static async generateWithOpenAI(ticker, analysis, indicators) {
    const prompt = this.buildPrompt(ticker, analysis, indicators);
    
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst providing clear, concise explanations of stock analysis. Be factual and professional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }

    throw new Error('Invalid OpenAI response');
  }

  /**
   * Generate explanation using Hugging Face Inference API (better for production)
   */
  static async generateWithHuggingFaceInference(ticker, analysis, indicators) {
    if (!HUGGINGFACE_INFERENCE_API_KEY) {
      throw new Error('Hugging Face Inference API key not configured');
    }

    const prompt = this.buildEnhancedPrompt(ticker, analysis, indicators);
    
    // Use better models for financial analysis
    const models = [HUGGINGFACE_MODEL, ...HUGGINGFACE_FALLBACK_MODELS];
    
    let response;
    let lastError;
    
    for (const model of models) {
      try {
        // Inference API uses different endpoint format
        const url = `${HUGGINGFACE_INFERENCE_API_URL}/pipeline/text-generation/${model}`;
        
        // For instruction-tuned models, format as conversation
        const isInstructModel = model.includes('Instruct') || model.includes('Phi-3') || model.includes('Mistral');
        
        let requestBody;
        if (isInstructModel) {
          // Format for instruction models
          requestBody = {
            inputs: `<s>[INST] ${prompt} [/INST]`,
            parameters: {
              max_new_tokens: 300,
              temperature: 0.7,
              top_p: 0.9,
              do_sample: true,
              return_full_text: false
            }
          };
        } else {
          requestBody = {
            inputs: prompt,
            parameters: {
              max_new_tokens: 300,
              temperature: 0.7,
              top_p: 0.9,
              do_sample: true
            }
          };
        }

        response = await axios.post(url, requestBody, {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_INFERENCE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout for inference API
        });
        
        if (response.data && (response.data[0] || response.data.generated_text)) {
          break; // Success, exit loop
        }
      } catch (error) {
        lastError = error;
        // If 503 (model loading), wait a bit and retry
        if (error.response && error.response.status === 503) {
          const waitTime = error.response.data?.estimated_time || 10;
          console.warn(`Model ${model} is loading, estimated wait: ${waitTime}s`);
          await Retry.sleep(waitTime * 1000);
          continue;
        }
        // If 410 (Gone) or 404 (Not Found), try next model
        if (error.response && (error.response.status === 410 || error.response.status === 404)) {
          console.warn(`Model ${model} is unavailable (${error.response.status}), trying next`);
          continue;
        }
        continue; // Try next model
      }
    }
    
    if (!response || !response.data) {
      throw new Error(lastError?.message || 'All Inference API models failed');
    }

    // Parse response
    let generatedText = null;
    if (Array.isArray(response.data) && response.data[0]) {
      generatedText = response.data[0].generated_text || response.data[0];
    } else if (response.data.generated_text) {
      generatedText = response.data.generated_text;
    } else if (typeof response.data === 'string') {
      generatedText = response.data;
    }
    
    if (generatedText) {
      const text = typeof generatedText === 'string' ? generatedText : JSON.stringify(generatedText);
      // Clean up instruction formatting if present
      return text.replace(/<s>\[INST\].*?\[\/INST\]/g, '').trim();
    }

    throw new Error('Invalid Inference API response format');
  }

  static async generateWithHuggingFace(ticker, analysis, indicators) {
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('Hugging Face API key not configured');
    }

    const prompt = this.buildEnhancedPrompt(ticker, analysis, indicators);
    
    // Use better models for financial text generation
    // Try multiple models in order of preference (better models first)
    const models = [
      'google/flan-t5-large',  // Better than base for generation
      'google/flan-t5-base',
      'microsoft/DialoGPT-medium',
      'gpt2'  // Last resort
    ];
    
    let response;
    let lastError;
    
    for (const model of models) {
      try {
        response = await axios.post(
          `${HUGGINGFACE_API_URL}/${model}`,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 300,
              max_length: 400,
              temperature: 0.7,
              top_p: 0.9,
              do_sample: true,
              return_full_text: false
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000 // 20 second timeout
          }
        );
        
        if (response.data && response.data[0]) {
          break; // Success, exit loop
        }
      } catch (error) {
        lastError = error;
        // If 410 (Gone) or 404 (Not Found), skip remaining models and use fallback
        if (error.response && (error.response.status === 410 || error.response.status === 404)) {
          console.warn(`Model ${model} is unavailable (${error.response.status}), using fallback`);
          break;
        }
        continue; // Try next model
      }
    }
    
    if (!response || !response.data || !response.data[0]) {
      throw new Error(lastError?.message || 'All models failed');
    }

    // Handle different response formats from different models
    if (response.data) {
      let generatedText = null;
      
      // Try different response formats
      if (Array.isArray(response.data) && response.data[0]) {
        if (response.data[0].generated_text) {
          generatedText = response.data[0].generated_text;
        } else if (typeof response.data[0] === 'string') {
          generatedText = response.data[0];
        }
      } else if (response.data.generated_text) {
        generatedText = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        generatedText = response.data;
      }
      
      if (generatedText) {
        // Extract just the new generated part (remove prompt)
        const promptLength = prompt.length;
        const text = typeof generatedText === 'string' ? generatedText : JSON.stringify(generatedText);
        return text.length > promptLength ? text.substring(promptLength).trim() : text.trim();
      }
    }

    throw new Error('Invalid response format');
  }

  static buildPrompt(ticker, analysis, indicators) {
    const score = analysis.score || 0;
    const recommendation = analysis.recommendation || 'neutral';
    const momentum = indicators.momentum60 || 0;
    const rsi = indicators.rsi || 50;
    const price = indicators.current_price || 0;

    return `Analyze ${ticker} stock:
- Composite Score: ${score}
- Recommendation: ${recommendation}
- 60-day Momentum: ${momentum > 0 ? 'Positive' : 'Negative'} (${momentum})
- RSI: ${rsi}
- Current Price: $${price}
Explain why this ${recommendation} recommendation was made based on these technical indicators:`;
  }

  /**
   * Build enhanced prompt with more context for better financial analysis
   */
  static buildEnhancedPrompt(ticker, analysis, indicators) {
    const score = analysis.score || 0;
    const recommendation = analysis.recommendation || 'neutral';
    const momentum = indicators.momentum60 || 0;
    const rsi = indicators.rsi || 50;
    const price = indicators.current_price || 0;
    const deviation = indicators.deviation100 || 0;
    const atr = indicators.atr20 || 0;
    const volumeZ = indicators.volume_zscore || 0;
    
    // Get sentiment and policy data if available
    const sentiment = analysis.sentiment || {};
    const policy = analysis.policy || {};

    let prompt = `You are a financial analyst. Analyze ${ticker} stock and provide a clear, professional explanation.\n\n`;
    prompt += `Stock: ${ticker}\n`;
    prompt += `Current Price: $${price.toFixed(2)}\n`;
    prompt += `Composite Score: ${score.toFixed(2)}/100\n`;
    prompt += `Recommendation: ${recommendation.toUpperCase()}\n\n`;
    
    prompt += `Technical Indicators:\n`;
    if (momentum !== 0) {
      prompt += `- 60-day Momentum: ${momentum > 0 ? '+' : ''}${(momentum * 100).toFixed(2)}% ${momentum > 0 ? '(Bullish)' : '(Bearish)'}\n`;
    }
    if (rsi !== undefined && rsi !== null) {
      const rsiStatus = rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
      prompt += `- RSI(14): ${rsi.toFixed(2)} (${rsiStatus})\n`;
    }
    if (deviation !== 0) {
      prompt += `- Deviation from 100-day MA: ${deviation > 0 ? '+' : ''}${(deviation * 100).toFixed(2)}%\n`;
    }
    if (atr > 0) {
      prompt += `- ATR(20): ${atr.toFixed(2)}% (Volatility)\n`;
    }
    if (Math.abs(volumeZ) > 0.5) {
      prompt += `- Volume: ${volumeZ > 0 ? 'Above' : 'Below'} average (z-score: ${volumeZ.toFixed(2)})\n`;
    }

    if (sentiment.sentMean_3d !== undefined) {
      const sentLabel = sentiment.sentMean_3d > 0.6 ? 'Positive' : 
                       sentiment.sentMean_3d < 0.4 ? 'Negative' : 'Neutral';
      prompt += `- News Sentiment (3-day): ${sentLabel} (${sentiment.sentMean_3d.toFixed(3)})\n`;
    }

    if (policy.fomcProximity !== undefined && policy.fomcProximity > 0.3) {
      prompt += `- FOMC Meeting Proximity: ${(policy.fomcProximity * 100).toFixed(0)}%\n`;
    }

    prompt += `\nProvide a concise explanation (2-3 sentences) of why the ${recommendation.toUpperCase()} recommendation was made, considering the technical indicators, sentiment, and market context. Be specific and professional.`;

    return prompt;
  }

  static fallbackExplanation(ticker, analysis, indicators) {
    const score = analysis.score || 0;
    const recommendation = analysis.recommendation || 'neutral';
    const momentum = indicators.momentum60 || 0;
    const rsi = indicators.rsi || 50;
    const price = indicators.current_price || 0;
    const deviation = indicators.deviation100 || 0;
    const atr = indicators.atr20 || 0;
    const volumeZ = indicators.volume_zscore || 0;
    
    // Get sentiment and policy data if available
    const sentiment = analysis.sentiment || {};
    const policy = analysis.policy || {};

    let explanation = `${ticker} Analysis:\n\n`;
    
    explanation += `Composite Score: ${score.toFixed(2)}\n`;
    explanation += `Recommendation: ${recommendation.toUpperCase()}\n\n`;
    
    explanation += `Technical Indicators:\n`;
    explanation += `- Current Price: $${price.toFixed(2)}\n`;
    
    if (momentum !== 0) {
      explanation += `- 60-day Momentum: ${momentum > 0 ? '+' : ''}${(momentum * 100).toFixed(2)}% `;
      explanation += `${momentum > 0 ? '(Bullish trend)' : '(Bearish trend)'}\n`;
    }
    
    if (rsi !== undefined && rsi !== null) {
      let rsiStatus = 'Neutral';
      if (rsi > 70) rsiStatus = 'Overbought';
      else if (rsi < 30) rsiStatus = 'Oversold';
      explanation += `- RSI(14): ${rsi.toFixed(2)} (${rsiStatus})\n`;
    }
    
    if (deviation !== 0) {
      explanation += `- Deviation from 100-day MA: ${deviation > 0 ? '+' : ''}${(deviation * 100).toFixed(2)}%\n`;
    }

    if (atr > 0) {
      explanation += `- ATR(20): ${atr.toFixed(2)}% (Volatility measure)\n`;
    }

    if (Math.abs(volumeZ) > 0.5) {
      explanation += `- Volume: ${volumeZ > 0 ? 'Above' : 'Below'} average (z-score: ${volumeZ.toFixed(2)})\n`;
    }

    // Add sentiment information if available
    if (sentiment.sentMean_3d !== undefined) {
      const sentLabel = sentiment.sentMean_3d > 0.6 ? 'Positive' : 
                       sentiment.sentMean_3d < 0.4 ? 'Negative' : 'Neutral';
      explanation += `- News Sentiment (3-day): ${sentLabel} (${sentiment.sentMean_3d.toFixed(3)})\n`;
      if (sentiment.articleCount > 0) {
        explanation += `- News Articles Analyzed: ${sentiment.articleCount}\n`;
      }
    }

    // Add policy information if available
    if (policy.fomcProximity !== undefined && policy.fomcProximity > 0.3) {
      explanation += `- FOMC Meeting Proximity: ${(policy.fomcProximity * 100).toFixed(0)}% (${policy.fomcProximity > 0.7 ? 'High' : 'Moderate'} proximity)\n`;
    }
    
    explanation += `\nReasoning: `;
    
    if (recommendation === 'long') {
      explanation += `The stock shows positive momentum and technical indicators suggest potential upward movement. `;
      if (momentum > 0) explanation += `Strong momentum indicates buying interest. `;
      if (rsi < 70) explanation += `RSI indicates the stock is not overbought. `;
      if (sentiment.sentMean_3d > 0.6) explanation += `Recent news sentiment is positive, supporting the bullish view. `;
    } else if (recommendation === 'short') {
      explanation += `The stock shows negative momentum and technical indicators suggest potential downward movement. `;
      if (momentum < 0) explanation += `Negative momentum indicates selling pressure. `;
      if (rsi > 70) explanation += `RSI indicates the stock may be overbought. `;
      if (sentiment.sentMean_3d < 0.4) explanation += `Recent news sentiment is negative, reinforcing the bearish view. `;
    } else {
      explanation += `Technical indicators are mixed, suggesting a neutral stance is appropriate. `;
      if (Math.abs(momentum) < 0.02) explanation += `Momentum is relatively flat. `;
      if (rsi >= 30 && rsi <= 70) explanation += `RSI is in neutral territory. `;
    }

    if (policy.fomcProximity > 0.7) {
      explanation += `Note: FOMC meeting is approaching, which may increase market volatility. `;
    }

    return explanation;
  }

  static async generateTradingStrategy(prompt) {
    // Check cache first
    const cacheKey = `llm:strategy:${prompt.substring(0, 100)}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const fullPrompt = `You are a professional trading strategist. Given the following trading scenario, provide a clear, actionable trading strategy with specific recommendations:\n\n${prompt}`;

      // Try OpenAI first if configured
      if (USE_OPENAI && OPENAI_API_KEY) {
        try {
          const result = await Retry.withRetry(
            async () => {
              const response = await axios.post(
                OPENAI_API_URL,
                {
                  model: 'gpt-3.5-turbo',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are a professional trading strategist. Provide clear, actionable trading strategies based on the given scenario.'
                    },
                    {
                      role: 'user',
                      content: fullPrompt
                    }
                  ],
                  max_tokens: 400,
                  temperature: 0.7
                },
                {
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 20000
                }
              );

              if (response.data && response.data.choices && response.data.choices[0]) {
                return response.data.choices[0].message.content.trim();
              }
              throw new Error('Invalid OpenAI response');
            },
            { maxRetries: 2, shouldRetry: Retry.isRetryableError }
          );
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.warn('OpenAI strategy generation failed, trying fallback:', error.message);
        }
      }

      // Try Hugging Face Inference API if configured
      if (USE_HUGGINGFACE_INFERENCE_API && HUGGINGFACE_INFERENCE_API_KEY) {
        try {
          const result = await Retry.withRetry(
            () => this.generateStrategyWithHuggingFaceInference(fullPrompt),
            { maxRetries: 2, shouldRetry: Retry.isRetryableError }
          );
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.warn('Hugging Face Inference API strategy generation failed:', error.message);
        }
      }

      // Try Hugging Face direct API if configured
      if (HUGGINGFACE_API_KEY) {
        try {
          const result = await Retry.withRetry(
            () => this.generateStrategyWithHuggingFace(fullPrompt),
            { maxRetries: 2, shouldRetry: Retry.isRetryableError }
          );
          responseCache.set(cacheKey, result);
          return result;
        } catch (error) {
          console.warn('Hugging Face strategy generation failed:', error.message);
        }
      }

      // Enhanced fallback template
      return this.fallbackStrategy(prompt);
    } catch (error) {
      console.error('LLM strategy generation error:', error.message);
      return this.fallbackStrategy(prompt);
    }
  }

  /**
   * Generate strategy using Hugging Face Inference API
   */
  static async generateStrategyWithHuggingFaceInference(prompt) {
    const models = [HUGGINGFACE_MODEL, ...HUGGINGFACE_FALLBACK_MODELS];
    
    for (const model of models) {
      try {
        const url = `${HUGGINGFACE_INFERENCE_API_URL}/pipeline/text-generation/${model}`;
        const isInstructModel = model.includes('Instruct') || model.includes('Phi-3') || model.includes('Mistral');
        
        const requestBody = isInstructModel ? {
          inputs: `<s>[INST] ${prompt} [/INST]`,
          parameters: {
            max_new_tokens: 400,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false
          }
        } : {
          inputs: prompt,
          parameters: {
            max_new_tokens: 400,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true
          }
        };

        const response = await axios.post(url, requestBody, {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_INFERENCE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        if (response.data) {
          let text = Array.isArray(response.data) && response.data[0] 
            ? (response.data[0].generated_text || response.data[0])
            : (response.data.generated_text || response.data);
          
          if (typeof text === 'string') {
            return text.replace(/<s>\[INST\].*?\[\/INST\]/g, '').trim();
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 503) {
          const waitTime = error.response.data?.estimated_time || 10;
          await Retry.sleep(waitTime * 1000);
        }
        continue;
      }
    }
    
    throw new Error('All Inference API models failed for strategy generation');
  }

  /**
   * Generate strategy using Hugging Face direct API
   */
  static async generateStrategyWithHuggingFace(prompt) {
    const models = ['google/flan-t5-large', 'google/flan-t5-base'];
    
    for (const model of models) {
      try {
        const response = await axios.post(
          `${HUGGINGFACE_API_URL}/${model}`,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 400,
              max_length: 500,
              temperature: 0.7,
              top_p: 0.9,
              do_sample: true,
              return_full_text: false
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000
          }
        );

        if (response.data) {
          let text = Array.isArray(response.data) && response.data[0]
            ? (response.data[0].generated_text || response.data[0])
            : (response.data.generated_text || response.data);
          
          if (typeof text === 'string') {
            const promptLength = prompt.length;
            return text.length > promptLength ? text.substring(promptLength).trim() : text.trim();
          }
        }
      } catch (error) {
        if (error.response && (error.response.status === 410 || error.response.status === 404)) {
          continue;
        }
        continue;
      }
    }
    
    throw new Error('All Hugging Face models failed for strategy generation');
  }

  static fallbackStrategy(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('risk') || lowerPrompt.includes('hedge')) {
      return `Risk Management Strategy:
1. Diversify across sectors to reduce concentration risk
2. Use stop-loss orders at 5-10% below entry price
3. Consider hedging with inverse ETFs or options
4. Monitor volatility indicators (ATR, VIX)
5. Maintain position sizing discipline (max 5% per position)
6. Review portfolio correlation to avoid overexposure`;
    }
    
    if (lowerPrompt.includes('bullish') || lowerPrompt.includes('long')) {
      return `Bullish Market Strategy:
1. Focus on stocks with positive momentum and strong fundamentals
2. Look for breakouts above key resistance levels
3. Consider sector rotation into growth stocks
4. Use trailing stops to protect gains
5. Monitor for overbought conditions (RSI > 70)
6. Consider scaling in positions rather than all-at-once entry`;
    }
    
    if (lowerPrompt.includes('bearish') || lowerPrompt.includes('short')) {
      return `Bearish Market Strategy:
1. Reduce position sizes and increase cash allocation
2. Focus on defensive sectors (utilities, consumer staples)
3. Consider inverse ETFs for portfolio protection
4. Use tight stop-losses on remaining long positions
5. Monitor for oversold conditions (RSI < 30) for potential reversals
6. Avoid catching falling knives - wait for confirmation signals`;
    }
    
    if (lowerPrompt.includes('neutral') || lowerPrompt.includes('sideways')) {
      return `Sideways Market Strategy:
1. Focus on range-bound trading strategies
2. Buy near support levels, sell near resistance
3. Consider options strategies (covered calls, cash-secured puts)
4. Maintain balanced portfolio allocation
5. Look for volatility breakouts for directional moves
6. Use mean reversion indicators (RSI, Bollinger Bands)`;
    }
    
    return `General Trading Strategy:
1. Always use stop-loss orders to manage risk
2. Never risk more than 1-2% of capital per trade
3. Follow the trend - don't fight it
4. Let winners run, cut losers quickly
5. Maintain a trading journal to track performance
6. Review and adjust strategy based on market conditions
7. Consider news sentiment and policy events in decision-making
8. Diversify across different asset classes and sectors`;
  }

  static async explainPortfolioDecision(portfolio, recommendation) {
    try {
      const prompt = `Explain why the following portfolio allocation was recommended: ${JSON.stringify(recommendation)}`;
      
      return await this.generateTradingStrategy(prompt);
    } catch (error) {
      return this.fallbackPortfolioExplanation(portfolio, recommendation);
    }
  }

  static fallbackPortfolioExplanation(portfolio, recommendation) {
    return `Portfolio allocation optimized for diversification across ${recommendation.length} stocks with balanced risk-return profiles.`;
  }
}

