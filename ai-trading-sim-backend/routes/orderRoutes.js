// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { buyOrder, sellOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Use these routes for the "basic" instant execution
router.post('/buy', protect, buyOrder);
router.post('/sell', protect, sellOrder);

module.exports = router;