const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Good for looking up a user's order history
    },
    ticker: {
        type: String,
        required: true
    },
    // The number of shares
    quantity: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    side: {
        type: String,
        enum: ['buy', 'sell'],
        required: true
    },
    // The "market" type is used in your basic controller
    type: {
        type: String,
        enum: ['market', 'limit', 'coupled'],
        default: 'market'
    },
    // The price the order was filled at
    price: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Filled', 'Cancelled'],
        default: 'Pending'
    },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model('Order', orderSchema);