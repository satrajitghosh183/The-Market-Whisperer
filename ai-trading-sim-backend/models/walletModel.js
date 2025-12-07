const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Using NumberDecimal for precision. Mongoose Decimal128 maps to this.
    available_balance: { type: mongoose.Schema.Types.Decimal128, required: true, default: 0.0 },
    locked_balance: { type: mongoose.Schema.Types.Decimal128, required: true, default: 0.0 },
    // Total balance is a virtual property
}, { timestamps: true });

walletSchema.virtual('total_balance').get(function () {
    return parseFloat(this.available_balance) + parseFloat(this.locked_balance);
});

module.exports = mongoose.model('Wallet', walletSchema);