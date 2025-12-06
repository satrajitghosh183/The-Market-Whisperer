import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
  portfolioId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Default Portfolio'
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

portfolioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

portfolioSchema.index({ userId: 1 });

export const Portfolio = mongoose.model('Portfolio', portfolioSchema);

