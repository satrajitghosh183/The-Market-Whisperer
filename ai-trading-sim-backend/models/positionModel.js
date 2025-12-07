// models/positionModel.js
const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
    // We add user_id here for easy lookups on the "basics"
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    ticker: {
        type: String,
        required: true
    },
    // Use Decimal128 for financial precision
    shares: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0.0
    },
    avg_cost: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0.0
    },
}, { timestamps: true });

// Ensures a user can only have one position record per ticker
positionSchema.index({ user_id: 1, ticker: 1 }, { unique: true });

module.exports = mongoose.model('Position', positionSchema);