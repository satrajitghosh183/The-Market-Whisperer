/**
 * Fake Stripe Payment Service
 * Simulates Stripe payment processing for development/testing
 * 
 * ⚠️ WARNING: This is a FAKE payment service for development only!
 * In production, use real Stripe API with proper security.
 */

export class PaymentService {
  /**
   * Simulate creating a payment intent (Stripe API)
   * @param {number} amount - Amount in dollars
   * @param {string} currency - Currency code (default: 'usd')
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Payment intent object
   */
  static async createPaymentIntent(amount, currency = 'usd', userId) {
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount. Must be greater than 0.');
    }
    
    if (amount > 100000) {
      throw new Error('Amount exceeds maximum limit of $100,000');
    }
    
    // Simulate API delay
    await this.simulateDelay(500, 1500);
    
    // Generate fake payment intent ID
    const paymentIntentId = `pi_fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: paymentIntentId,
      object: 'payment_intent',
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      status: 'requires_payment_method',
      client_secret: `pi_fake_${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`,
      metadata: {
        userId,
        createdAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Simulate confirming a payment (Stripe API)
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} paymentMethod - Payment method details
   * @returns {Promise<Object>} Confirmed payment object
   */
  static async confirmPayment(paymentIntentId, paymentMethod) {
    // Validate payment intent ID format
    if (!paymentIntentId || !paymentIntentId.startsWith('pi_fake_')) {
      throw new Error('Invalid payment intent ID');
    }
    
    // Validate payment method
    if (!paymentMethod || !paymentMethod.type) {
      throw new Error('Payment method is required');
    }
    
    // Simulate card validation
    const cardNumber = paymentMethod.cardNumber?.replace(/\s/g, '') || '';
    
    // Simulate declined cards (for testing)
    if (cardNumber === '4000000000000002') {
      throw new Error('Your card was declined.');
    }
    
    if (cardNumber === '4000000000009995') {
      throw new Error('Your card has insufficient funds.');
    }
    
    // Simulate API delay
    await this.simulateDelay(1000, 2500);
    
    // Simulate random failures (5% chance) for testing
    if (Math.random() < 0.05) {
      throw new Error('Payment processing failed. Please try again.');
    }
    
    // Generate fake charge ID
    const chargeId = `ch_fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: paymentIntentId,
      object: 'payment_intent',
      status: 'succeeded',
      amount: paymentMethod.amount,
      currency: paymentMethod.currency || 'usd',
      charges: {
        data: [{
          id: chargeId,
          object: 'charge',
          amount: paymentMethod.amount,
          currency: paymentMethod.currency || 'usd',
          status: 'succeeded',
          paid: true,
          created: Math.floor(Date.now() / 1000)
        }]
      },
      payment_method: {
        type: paymentMethod.type,
        card: {
          brand: this.detectCardBrand(cardNumber),
          last4: cardNumber.slice(-4),
          exp_month: paymentMethod.expMonth || 12,
          exp_year: paymentMethod.expYear || new Date().getFullYear() + 1
        }
      },
      metadata: {
        userId: paymentMethod.userId,
        processedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Detect card brand from card number
   * @param {string} cardNumber - Card number
   * @returns {string} Card brand
   */
  static detectCardBrand(cardNumber) {
    const number = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^6(?:011|5)/.test(number)) return 'discover';
    
    return 'unknown';
  }
  
  /**
   * Validate card number using Luhn algorithm
   * @param {string} cardNumber - Card number
   * @returns {boolean} True if valid
   */
  static validateCardNumber(cardNumber) {
    const number = cardNumber.replace(/\s/g, '');
    
    // Basic format check
    if (!/^\d{13,19}$/.test(number)) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Validate card expiry
   * @param {number} month - Expiry month (1-12)
   * @param {number} year - Expiry year (YYYY)
   * @returns {boolean} True if valid
   */
  static validateExpiry(month, year) {
    if (month < 1 || month > 12) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  }
  
  /**
   * Validate CVC
   * @param {string} cvc - CVC code
   * @returns {boolean} True if valid
   */
  static validateCVC(cvc) {
    return /^\d{3,4}$/.test(cvc);
  }
  
  /**
   * Simulate network delay
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   */
  static async simulateDelay(min = 500, max = 2000) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Get test card numbers for development
   * @returns {Object} Test card numbers
   */
  static getTestCards() {
    return {
      visa: {
        number: '4242 4242 4242 4242',
        cvc: '123',
        description: 'Visa - Success'
      },
      mastercard: {
        number: '5555 5555 5555 4444',
        cvc: '123',
        description: 'Mastercard - Success'
      },
      amex: {
        number: '3782 822463 10005',
        cvc: '1234',
        description: 'American Express - Success'
      },
      declined: {
        number: '4000 0000 0000 0002',
        cvc: '123',
        description: 'Card Declined (for testing)'
      },
      insufficient: {
        number: '4000 0000 0000 9995',
        cvc: '123',
        description: 'Insufficient Funds (for testing)'
      }
    };
  }
}

