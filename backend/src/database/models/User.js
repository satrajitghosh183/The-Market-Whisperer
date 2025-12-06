import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['investor', 'trader', 'auto-trader'],
    default: 'investor'
  },
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  investmentHorizon: {
    type: String,
    enum: ['short', 'medium', 'long'],
    default: 'medium'
  },
  horizonYears: {
    type: Number,
    default: 2
  },
  mode: {
    type: String,
    enum: ['investor', 'trader', 'auto-trader'],
    default: 'investor'
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
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

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const User = mongoose.model('User', userSchema);

