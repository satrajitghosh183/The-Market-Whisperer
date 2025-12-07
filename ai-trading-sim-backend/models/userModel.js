const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: false }, // Added name field
    email: { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['Investor', 'Trader', 'Auto-Trader'], default: 'Investor' },
    risk_profile: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    // ... other fields from your plan
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password_hash')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password_hash);
};

module.exports = mongoose.model('User', userSchema);