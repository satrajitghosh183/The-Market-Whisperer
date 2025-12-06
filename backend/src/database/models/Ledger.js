import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  ledgerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['deposit', 'withdrawal', 'trade', 'dividend', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  orderId: {
    type: String,
    ref: 'Order'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

ledgerSchema.index({ userId: 1, createdAt: -1 });

export const Ledger = mongoose.model('Ledger', ledgerSchema);

