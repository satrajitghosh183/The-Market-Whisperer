const mongoose = require('mongoose');

// This is the core of your auditable system (Section 8)
const ledgerSchema = new mongoose.Schema({
    tx_id: { type: String, required: true, unique: true }, // Unique transaction ID
    wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    // 'debit' increases asset (e.g., locked_balance) or decreases liability
    debit: { type: mongoose.Schema.Types.Decimal128, default: 0.0 },
    // 'credit' decreases asset (e.g., available_balance) or increases liability
    credit: { type: mongoose.Schema.Types.Decimal128, default: 0.0 },
    // Reference to the action that caused this (e.g., an Order ID)
    reference_id: { type: String, index: true },
    reference_type: { type: String, enum: ['Order', 'Deposit', 'Withdrawal'] },
    description: { type: String }, // e.g., "Lock funds for AAPL buy order"
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);