import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: {
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
  ticker: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true,
    index: true
  },
  orderType: {
    type: String,
    enum: ['market', 'limit'],
    default: 'market'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'executed', 'cancelled', 'failed'],
    default: 'pending',
    index: true
  },
  executedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for efficient queries
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ ticker: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);

