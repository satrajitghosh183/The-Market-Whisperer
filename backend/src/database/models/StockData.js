import mongoose from 'mongoose';

const stockDataSchema = new mongoose.Schema({
  ticker: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  open: {
    type: Number,
    required: true
  },
  high: {
    type: Number,
    required: true
  },
  low: {
    type: Number,
    required: true
  },
  close: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    default: 0
  }
}, {
  timestamps: false // Don't add createdAt/updatedAt
});

// Compound index for efficient queries
stockDataSchema.index({ ticker: 1, date: 1 }, { unique: true });

export const StockData = mongoose.model('StockData', stockDataSchema);

