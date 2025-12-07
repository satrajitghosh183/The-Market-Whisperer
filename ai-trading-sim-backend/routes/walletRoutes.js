// routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const {
    getWallet,
    depositFunds,
    withdrawFunds
} = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, getWallet);
router.post('/deposit', protect, depositFunds);
router.post('/withdraw', protect, withdrawFunds);

module.exports = router;