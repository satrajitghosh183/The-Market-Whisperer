/**
 * Retry utility with exponential backoff
 */
export class Retry {
  /**
   * Execute a function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries (default: 3)
   * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
   * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
   * @param {number} options.backoffMultiplier - Backoff multiplier (default: 2)
   * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all)
   * @returns {Promise} - Result of the function
   */
  static async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      shouldRetry = () => true
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry if we've exhausted attempts or error shouldn't be retried
        if (attempt >= maxRetries || !shouldRetry(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await this.sleep(Math.min(delay, maxDelay));
          delay *= backoffMultiplier;
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable (network errors, timeouts, 5xx errors)
   * @param {Error} error - Error to check
   * @returns {boolean} - True if error is retryable
   */
  static isRetryableError(error) {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // HTTP 5xx errors
    if (error.response && error.response.status >= 500 && error.response.status < 600) {
      return true;
    }

    // Rate limit errors (429)
    if (error.response && error.response.status === 429) {
      return true;
    }

    // Timeout errors
    if (error.message && error.message.includes('timeout')) {
      return true;
    }

    return false;
  }
}

