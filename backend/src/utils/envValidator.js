import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates environment variables and provides helpful error messages
 */
export class EnvValidator {
  /**
   * Validate required environment variables
   * @param {Object} requiredVars - Object with var names as keys and descriptions as values
   * @param {boolean} throwOnMissing - Whether to throw error or just warn
   */
  static validate(requiredVars, throwOnMissing = false) {
    const missing = [];
    const warnings = [];

    for (const [varName, description] of Object.entries(requiredVars)) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missing.push({ name: varName, description });
      } else if (value.includes('your_') || value.includes('_here')) {
        warnings.push({ name: varName, description });
      }
    }

    if (missing.length > 0) {
      const errorMsg = this.formatMissingVarsError(missing);
      if (throwOnMissing) {
        throw new Error(errorMsg);
      } else {
        console.warn(`⚠️  Missing environment variables:\n${errorMsg}`);
      }
    }

    if (warnings.length > 0) {
      const warningMsg = this.formatWarningVars(warnings);
      console.warn(`⚠️  Environment variables appear to be placeholders:\n${warningMsg}`);
    }

    return { missing, warnings };
  }

  /**
   * Format missing variables error message
   */
  static formatMissingVarsError(missing) {
    let msg = '\n';
    missing.forEach(({ name, description }) => {
      msg += `  - ${name}: ${description}\n`;
    });
    msg += '\nPlease set these in your .env file or environment.\n';
    msg += 'See backend/.env.example for a template.\n';
    return msg;
  }

  /**
   * Format warning message for placeholder values
   */
  static formatWarningVars(warnings) {
    let msg = '\n';
    warnings.forEach(({ name, description }) => {
      msg += `  - ${name}: ${description}\n`;
    });
    msg += '\nPlease update these with actual values in your .env file.\n';
    return msg;
  }

  /**
   * Validate API keys for services
   */
  static validateApiKeys() {
    const apiKeys = {
      NEWS_API_KEY: 'Required for fetching financial news articles',
      TWELVE_DATA_API_KEY: 'Required for real-time stock data',
      HUGGINGFACE_API_KEY: 'Optional - for AI-generated explanations (falls back to templates if missing)'
    };

    // Only throw for critical services, warn for optional ones
    const critical = {
      NEWS_API_KEY: apiKeys.NEWS_API_KEY,
      TWELVE_DATA_API_KEY: apiKeys.TWELVE_DATA_API_KEY
    };

    const optional = {
      HUGGINGFACE_API_KEY: apiKeys.HUGGINGFACE_API_KEY
    };

    this.validate(critical, false); // Warn but don't throw
    this.validate(optional, false); // Just warn
  }
}

