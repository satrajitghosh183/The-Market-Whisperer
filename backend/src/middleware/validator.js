/**
 * Input validation middleware
 */

/**
 * Validate ticker parameter
 */
export function validateTicker(req, res, next) {
  const ticker = req.params.ticker || req.body.ticker || req.query.ticker;
  
  if (ticker) {
    // Ticker should be 1-5 uppercase letters/numbers
    if (!/^[A-Z0-9]{1,5}$/i.test(ticker)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker format. Ticker must be 1-5 alphanumeric characters.'
      });
    }
    req.validatedTicker = ticker.toUpperCase();
  }
  
  next();
}

/**
 * Validate numeric query parameters
 */
export function validateNumericQuery(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.query[field];
      if (value !== undefined) {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid ${field}. Must be a positive number.`
          });
        }
        req.query[field] = num;
      }
    }
    next();
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequired(fields) {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(field) {
  return (req, res, next) => {
    const date = req.query[field] || req.body[field];
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${field} format. Expected YYYY-MM-DD.`
        });
      }
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${field} date.`
        });
      }
    }
    next();
  };
}

/**
 * Generic input validator
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
export function validateInput(schema) {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }
      
      // Type validation
      if (rules.type) {
        if (rules.type === 'number' && typeof value !== 'number' && isNaN(parseFloat(value))) {
          errors.push(`${field} must be a number`);
          continue;
        }
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
          continue;
        }
        if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          errors.push(`${field} must be an object`);
          continue;
        }
      }
      
      // Min/Max validation for numbers
      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }
      
      // Default value
      if (rules.default !== undefined && (value === undefined || value === null || value === '')) {
        req.body[field] = rules.default;
      }
      
      // Nested schema validation
      if (rules.type === 'object' && rules.schema && typeof value === 'object') {
        for (const [nestedField, nestedRules] of Object.entries(rules.schema)) {
          const nestedValue = value[nestedField];
          
          if (nestedRules.required && (nestedValue === undefined || nestedValue === null || nestedValue === '')) {
            errors.push(`${field}.${nestedField} is required`);
          }
          
          if (nestedRules.type === 'number' && nestedValue !== undefined && isNaN(parseFloat(nestedValue))) {
            errors.push(`${field}.${nestedField} must be a number`);
          }
          
          if (nestedRules.min !== undefined && nestedValue < nestedRules.min) {
            errors.push(`${field}.${nestedField} must be at least ${nestedRules.min}`);
          }
          
          if (nestedRules.max !== undefined && nestedValue > nestedRules.max) {
            errors.push(`${field}.${nestedField} must be at most ${nestedRules.max}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    next();
  };
}

