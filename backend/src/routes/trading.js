import express from 'express';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { TradingService } from '../services/tradingService.js';
import { BasketManager } from '../services/basketManager.js';

const router = express.Router();

// Place order
router.post('/order', async (req, res) => {
  try {
    const { userId, ticker, quantity, side, orderType = 'market', price } = req.body;
    
    const order = await TradingService.placeOrder({
      userId,
      ticker,
      quantity,
      side,
      orderType,
      price
    });
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({ error: error.message || 'Failed to place order' });
  }
});

// Get user orders
router.get('/orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await dataLayer.getUserOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Cancel order
router.post('/order/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await dataLayer.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }
    
    await dataLayer.updateOrder(orderId, { status: 'cancelled' });
    res.json({ message: 'Order cancelled', orderId });
  } catch (error) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Coupled (hedged) trade
router.post('/coupled', async (req, res) => {
  try {
    const { userId, longTicker, shortTicker, longQuantity, shortQuantity } = req.body;
    
    const coupledTrade = await TradingService.placeCoupledTrade({
      userId,
      longTicker,
      shortTicker,
      longQuantity,
      shortQuantity
    });
    
    res.status(201).json(coupledTrade);
  } catch (error) {
    console.error('Coupled trade error:', error);
    res.status(500).json({ error: error.message || 'Failed to place coupled trade' });
  }
});

// Get basket status
router.get('/basket/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const basket = await BasketManager.getBasketForSymbol(symbol);
    res.json(basket);
  } catch (error) {
    console.error('Basket fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch basket' });
  }
});

export default router;

