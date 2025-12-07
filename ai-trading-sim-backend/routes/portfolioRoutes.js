// routes/portfolioRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getOpenPositions } = require('../controllers/portfolioController');

// This creates the endpoint: GET /api/portfolios/positions
router.get('/positions', protect, getOpenPositions);

module.exports = router;