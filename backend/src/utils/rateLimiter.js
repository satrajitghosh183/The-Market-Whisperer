/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // key -> [timestamps]
  }

  /**
   * Check if request is allowed
   * @param {string} key - Identifier for the rate limit (e.g., 'news-api')
   * @returns {boolean} - True if request is allowed
   */
  isAllowed(key) {
    const now = Date.now();
    const keyRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const recentRequests = keyRequests.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }

  /**
   * Get time until next request is allowed (in ms)
   * @param {string} key - Identifier for the rate limit
   * @returns {number} - Milliseconds until next request is allowed, or 0 if allowed now
   */
  getTimeUntilNext(key) {
    const now = Date.now();
    const keyRequests = this.requests.get(key) || [];
    const recentRequests = keyRequests.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentRequests.length < this.maxRequests) {
      return 0;
    }
    
    // Find oldest request in window
    const oldestRequest = Math.min(...recentRequests);
    return this.windowMs - (now - oldestRequest);
  }

  /**
   * Reset rate limiter for a key
   * @param {string} key - Identifier to reset
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Reset all rate limiters
   */
  resetAll() {
    this.requests.clear();
  }
}

