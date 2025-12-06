import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  walletId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  availableBalance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lockedBalance: {
    type: Number,
    required: true,
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

walletSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index on userId (single index definition)
walletSchema.index({ userId: 1 });

export const Wallet = mongoose.model('Wallet', walletSchema);

