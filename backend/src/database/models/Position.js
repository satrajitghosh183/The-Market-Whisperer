import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  portfolioId: {
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
  shares: {
    type: Number,
    required: true,
    min: 0
  },
  avgCost: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  lastTradePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

positionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for efficient queries
positionSchema.index({ portfolioId: 1, ticker: 1 }, { unique: true });

export const Position = mongoose.model('Position', positionSchema);

