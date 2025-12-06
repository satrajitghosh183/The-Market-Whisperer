import express from 'express';
import bcrypt from 'bcryptjs';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { PasswordResetService } from '../services/passwordResetService.js';

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'investor', riskProfile = 'moderate', horizonYears = 2 } = req.body;
    
    // Check if user exists
    const existingUser = await dataLayer.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await dataLayer.createUser({
      email,
      passwordHash: hashedPassword,
      role,
      riskProfile,
      horizonYears,
      mode: role === 'investor' ? 'investor' : role === 'trader' ? 'trader' : 'auto-trader'
    });
    
    // Create wallet
    const wallet = await dataLayer.createWallet(user.userId, 10000); // Default $10,000
    
    // Create initial portfolio
    const portfolio = await dataLayer.createPortfolio({
      userId: user.userId,
      benchmark: 'SPY',
      strategyId: 'default',
      holdings: [],
      targetWeights: {}
    });
    
    res.status(201).json({
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        mode: user.mode
      },
      wallet,
      portfolio
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await dataLayer.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // In a real app, generate JWT here
    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        mode: user.mode
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await dataLayer.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const wallet = await dataLayer.getWallet(userId);
    
    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        mode: user.mode,
        riskProfile: user.riskProfile,
        horizonYears: user.horizonYears
      },
      wallet
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Forgot password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await PasswordResetService.requestPasswordReset(email);
    
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to process password reset request' 
    });
  }
});

// Reset password - Set new password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const result = await PasswordResetService.resetPassword(token, newPassword);
    
    res.json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to reset password' 
    });
  }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const isValid = await PasswordResetService.verifyResetToken(token);
    
    res.json({ 
      valid: isValid,
      message: isValid ? 'Token is valid' : 'Token is invalid or expired'
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Failed to verify token' 
    });
  }
});

export default router;

