import mongoose from 'mongoose';

const basketSchema = new mongoose.Schema({
  basketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  orders: [{
    type: String,
    ref: 'Order'
  }],
  status: {
    type: String,
    enum: ['active', 'executed', 'cancelled'],
    default: 'active',
    index: true
  },
  executedAt: {
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

basketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

basketSchema.index({ symbol: 1, status: 1 });

export const Basket = mongoose.model('Basket', basketSchema);

