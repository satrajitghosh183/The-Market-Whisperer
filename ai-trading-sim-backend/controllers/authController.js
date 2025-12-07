const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose'); // Keep mongoose import

// Helper function to generate a JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user and create their wallet
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { email, password, role, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    try {
        // 1. Create User
        const user = new User({
            name: name || email.split('@')[0], // Use provided name or email username
            email: email.toLowerCase(),
            password_hash: password,
            role: role || 'Investor',
            risk_profile: 'Medium'
        });
        const createdUser = await user.save(); // No session

        // 2. Create associated Wallet
        const wallet = new Wallet({
            user_id: createdUser._id,
            available_balance: '0.00',
            locked_balance: '0.0'
        });
        await wallet.save(); // No session

        res.status(201).json({
            _id: createdUser._id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
            token: generateToken(createdUser._id)
        });

    } catch (error) {
        console.error(error); // This will show the real error in your terminal
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate a user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name || user.email.split('@')[0], // Include name in response
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const user = {
        _id: req.user._id,
        name: req.user.name || req.user.email.split('@')[0], // Include name
        email: req.user.email,
        role: req.user.role,
    };
    res.status(200).json(user);
};


module.exports = {
    registerUser,
    loginUser,
    getMe,
};