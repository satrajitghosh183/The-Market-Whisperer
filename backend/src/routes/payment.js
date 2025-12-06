import express from 'express';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { PaymentService } from '../services/paymentService.js';
import { validateInput } from '../middleware/validator.js';

const router = express.Router();

/**
 * Create a payment intent (Step 1: Initialize payment)
 * POST /api/payment/create-intent
 */
router.post('/create-intent', validateInput({
  amount: { type: 'number', min: 1, max: 100000, required: true },
  currency: { type: 'string', default: 'usd' }
}), async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    const userId = req.body.userId || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }
    
    // Verify user exists
    const user = await dataLayer.getUser(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Create payment intent
    const paymentIntent = await PaymentService.createPaymentIntent(
      amount,
      currency,
      userId
    );
    
    res.json({
      success: true,
      paymentIntent
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    });
  }
});

/**
 * Confirm and process payment (Step 2: Process payment)
 * POST /api/payment/confirm
 */
router.post('/confirm', validateInput({
  paymentIntentId: { type: 'string', required: true },
  paymentMethod: { 
    type: 'object', 
    required: true,
    schema: {
      type: { type: 'string', required: true },
      cardNumber: { type: 'string', required: true },
      expMonth: { type: 'number', min: 1, max: 12, required: true },
      expYear: { type: 'number', required: true },
      cvc: { type: 'string', required: true }
    }
  }
}), async (req, res) => {
  try {
    const { paymentIntentId, paymentMethod } = req.body;
    const userId = req.body.userId || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }
    
    // Validate card number
    if (!PaymentService.validateCardNumber(paymentMethod.cardNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card number'
      });
    }
    
    // Validate expiry
    if (!PaymentService.validateExpiry(paymentMethod.expMonth, paymentMethod.expYear)) {
      return res.status(400).json({
        success: false,
        error: 'Card has expired or invalid expiry date'
      });
    }
    
    // Validate CVC
    if (!PaymentService.validateCVC(paymentMethod.cvc)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CVC code'
      });
    }
    
    // Get wallet
    let wallet = await dataLayer.getWallet(userId);
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await dataLayer.createWallet(userId, 0);
    }
    
    // Confirm payment with Stripe (fake)
    const confirmedPayment = await PaymentService.confirmPayment(
      paymentIntentId,
      {
        ...paymentMethod,
        userId,
        amount: Math.round(paymentMethod.amount * 100), // Convert to cents
        currency: paymentMethod.currency || 'usd'
      }
    );
    
    if (confirmedPayment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment was not successful'
      });
    }
    
    // Convert amount from cents to dollars
    const depositAmount = confirmedPayment.amount / 100;
    
    // Update wallet balance
    const updatedWallet = await dataLayer.updateWallet(wallet.walletId, {
      availableBalance: wallet.availableBalance + depositAmount
    });
    
    // Add ledger entry
    await dataLayer.addLedgerEntry({
      walletId: wallet.walletId,
      userId,
      type: 'deposit',
      amount: depositAmount,
      description: `Deposit via payment - Card ending in ${confirmedPayment.payment_method.card.last4}`,
      metadata: {
        paymentIntentId,
        chargeId: confirmedPayment.charges.data[0].id,
        cardBrand: confirmedPayment.payment_method.card.brand
      }
    });
    
    res.json({
      success: true,
      payment: confirmedPayment,
      wallet: updatedWallet,
      message: `Successfully deposited $${depositAmount.toFixed(2)}`
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Payment processing failed'
    });
  }
});

/**
 * Get payment history for a user
 * GET /api/payment/history/:userId
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get wallet
    const wallet = await dataLayer.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    // Get ledger entries for deposits
    const ledger = await dataLayer.getLedger(wallet.walletId);
    const deposits = ledger.filter(entry => entry.type === 'deposit');
    
    res.json({
      success: true,
      deposits: deposits.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment history'
    });
  }
});

/**
 * Get test card numbers for development
 * GET /api/payment/test-cards
 */
router.get('/test-cards', (req, res) => {
  res.json({
    success: true,
    testCards: PaymentService.getTestCards(),
    note: '⚠️ These are test card numbers for development only. They will always succeed (except declined/insufficient cards).'
  });
});

/**
 * Get wallet balance
 * GET /api/payment/wallet/:userId
 */
router.get('/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const wallet = await dataLayer.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    res.json({
      success: true,
      wallet: {
        walletId: wallet.walletId,
        userId: wallet.userId,
        availableBalance: wallet.availableBalance,
        lockedBalance: wallet.lockedBalance,
        totalBalance: wallet.availableBalance + wallet.lockedBalance
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve wallet'
    });
  }
});

export default router;

