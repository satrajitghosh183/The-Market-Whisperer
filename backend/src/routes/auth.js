import express from 'express';
import bcrypt from 'bcryptjs';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';

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

export default router;

