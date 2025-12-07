const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const Ledger = require('../models/ledgerModel');
const Position = require('../models/positionModel');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// @desc    Place a BUY order (instant execution)
// @route   POST /api/orders/buy
// @access  Private
const buyOrder = async (req, res) => {
    const { ticker, quantity, price } = req.body;

    try {
        const numericQuantity = parseFloat(quantity);
        const numericPrice = parseFloat(price);
        const orderValue = numericQuantity * numericPrice;

        if (!ticker || numericQuantity <= 0 || numericPrice <= 0) {
            throw new Error('Invalid order details');
        }

        // 1. Get Wallet & Check Funds
        const wallet = await Wallet.findOne({ user_id: req.user._id }); // No session
        if (parseFloat(wallet.available_balance) < orderValue) {
            throw new Error('Insufficient funds');
        }

        // 2. Update Wallet (Funds decrease)
        wallet.available_balance = (parseFloat(wallet.available_balance) - orderValue).toString();
        await wallet.save(); // No session

        // 3. Create Ledger Entry
        const tx_id = uuidv4();
        const ledgerEntry = new Ledger({
            tx_id,
            wallet_id: wallet._id,
            credit: orderValue.toString(),
            reference_id: tx_id, // Placeholder, will be updated
            reference_type: 'Order',
            description: `Buy ${numericQuantity} ${ticker} @ ${numericPrice}`
        });
        await ledgerEntry.save(); // No session

        // 4. Find or Create Position
        let position = await Position.findOne({ user_id: req.user._id, ticker }); // No session
        if (!position) {
            position = new Position({ user_id: req.user._id, ticker });
        }

        // 5. Update Position (Weighted Average Cost)
        const currentShares = parseFloat(position.shares);
        const currentAvgCost = parseFloat(position.avg_cost);

        const newTotalShares = currentShares + numericQuantity;
        const newAvgCost = ((currentAvgCost * currentShares) + (numericPrice * numericQuantity)) / newTotalShares;

        position.shares = newTotalShares.toString();
        position.avg_cost = newAvgCost.toString();
        await position.save(); // No session

        // 6. Create Order record
        const order = new Order({
            user_id: req.user._id,
            ticker,
            quantity: numericQuantity.toString(),
            side: 'buy',
            type: 'market',
            price: numericPrice.toString(),
            status: 'Filled',
        });
        await order.save(); // No session

        // Link ledger entry to the filled order
        ledgerEntry.reference_id = order._id;
        await ledgerEntry.save(); // No session

        res.status(201).json({ order, position, wallet });

    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error placing buy order' });
    }
};


// @desc    Place a SELL order (instant execution)
// @route   POST /api/orders/sell
// @access  Private
const sellOrder = async (req, res) => {
    const { ticker, quantity, price } = req.body;

    try {
        const numericQuantity = parseFloat(quantity);
        const numericPrice = parseFloat(price);
        const proceeds = numericQuantity * numericPrice;

        if (!ticker || numericQuantity <= 0 || numericPrice <= 0) {
            throw new Error('Invalid order details');
        }

        // 1. Get Position & Check Shares
        const position = await Position.findOne({ user_id: req.user._id, ticker }); // No session
        if (!position || parseFloat(position.shares) < numericQuantity) {
            throw new Error('Insufficient shares to sell');
        }

        // 2. Update Position (Shares decrease)
        position.shares = (parseFloat(position.shares) - numericQuantity).toString();
        if (parseFloat(position.shares) === 0) {
            position.avg_cost = '0.0';
        }
        await position.save(); // No session

        // 3. Update Wallet (Funds increase)
        const wallet = await Wallet.findOne({ user_id: req.user._id }); // No session
        wallet.available_balance = (parseFloat(wallet.available_balance) + proceeds).toString();
        await wallet.save(); // No session

        // 4. Create Ledger Entry
        const tx_id = uuidv4();
        const ledgerEntry = new Ledger({
            tx_id,
            wallet_id: wallet._id,
            debit: proceeds.toString(),
            reference_type: 'Order',
            description: `Sell ${numericQuantity} ${ticker} @ ${numericPrice}`
        });
        await ledgerEntry.save(); // No session

        // 5. Create Order record
        const order = new Order({
            user_id: req.user._id,
            ticker,
            quantity: numericQuantity.toString(),
            side: 'sell',
            type: 'market',
            price: numericPrice.toString(),
            status: 'Filled',
        });
        await order.save(); // No session

        // Link ledger entry to the filled order
        ledgerEntry.reference_id = order._id;
        await ledgerEntry.save(); // No session

        res.status(201).json({ order, position, wallet });

    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Error placing sell order' });
    }
};

module.exports = { buyOrder, sellOrder };