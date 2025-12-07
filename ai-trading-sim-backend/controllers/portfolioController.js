// controllers/portfolioController.js
const Position = require('../models/positionModel');

// @desc    Get all of the user's open positions
// @route   GET /api/portfolios/positions
// @access  Private
const getOpenPositions = async (req, res) => {
    try {
        // Find all positions for the user where they own more than 0 shares
        const positions = await Position.find({
            user_id: req.user._id,
            shares: { $gt: 0 } // $gt means "greater than"
        });

        if (!positions) {
            // Send an empty array, not an error, if they just have no positions
            return res.status(200).json([]);
        }

        res.status(200).json(positions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getOpenPositions };