const Wallet = require('../models/walletModel');
const Ledger = require('../models/ledgerModel');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// @desc    Get the user's wallet
// @route   GET /api/wallets/me
// @access  Private
const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ user_id: req.user._id });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        res.json(wallet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Deposit sandbox funds into the wallet
// @route   POST /api/wallets/deposit
// @access  Private
const depositFunds = async (req, res) => {
    const { amount } = req.body;
    const numericAmount = parseFloat(amount);

    if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    try {
        const wallet = await Wallet.findOne({ user_id: req.user._id }); // No session
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        // 1. Update Wallet
        wallet.available_balance = (parseFloat(wallet.available_balance) + numericAmount).toString();
        await wallet.save(); // No session

        // 2. Create Ledger Entry
        const ledgerEntry = new Ledger({
            tx_id: uuidv4(),
            wallet_id: wallet._id,
            debit: numericAmount.toString(),
            credit: '0.0',
            reference_type: 'Deposit',
            description: 'Sandbox deposit'
        });
        await ledgerEntry.save(); // No session

        res.json(wallet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Withdraw sandbox funds from the wallet
// @route   POST /api/wallets/withdraw
// @access  Private
const withdrawFunds = async (req, res) => {
    const { amount } = req.body;
    const numericAmount = parseFloat(amount);

    if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    try {
        const wallet = await Wallet.findOne({ user_id: req.user._id }); // No session
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        const available = parseFloat(wallet.available_balance);
        if (numericAmount > available) {
            throw new Error('Insufficient funds');
        }

        // 1. Update Wallet
        wallet.available_balance = (available - numericAmount).toString();
        await wallet.save(); // No session

        // 2. Create Ledger Entry
        const ledgerEntry = new Ledger({
            tx_id: uuidv4(),
            wallet_id: wallet._id,
            debit: '0.0',
            credit: numericAmount.toString(),
            reference_type: 'Withdrawal',
            description: 'Sandbox withdrawal'
        });
        await ledgerEntry.save(); // No session

        res.json(wallet);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Server Error' });
    }
};

module.exports = { getWallet, depositFunds, withdrawFunds };