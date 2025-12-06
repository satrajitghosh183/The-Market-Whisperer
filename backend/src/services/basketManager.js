import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { TradingService } from './tradingService.js';

const BASKET_WINDOW_MS = 5000; // 5 second aggregation window
const activeBaskets = new Map();

export class BasketManager {
  static async addOrderToBasket(order) {
    const symbol = order.ticker;
    let basket = activeBaskets.get(symbol);
    
    if (!basket) {
      basket = await dataLayer.createBasket({
        symbol,
        netQuantity: 0,
        orders: [],
        windowTime: new Date(Date.now() + BASKET_WINDOW_MS).toISOString()
      });
      activeBaskets.set(symbol, basket);
      
      // Set timer to execute basket
      setTimeout(async () => {
        await this.executeBasket(symbol);
      }, BASKET_WINDOW_MS);
    }
    
    // Add order to basket
    basket.orders.push(order.orderId);
    basket.netQuantity += order.side === 'buy' ? order.quantity : -order.quantity;
    
    // Get unique user count
    const orders = await Promise.all(
      basket.orders.map(orderId => dataLayer.getOrder(orderId))
    );
    const userIds = new Set(orders.filter(o => o).map(o => o.userId));
    
    await dataLayer.updateBasket(basket.basketId, {
      orders: basket.orders,
      netQuantity: basket.netQuantity,
      userCount: userIds.size
    });
    
    return basket;
  }
  
  static async executeBasket(symbol) {
    const basket = activeBaskets.get(symbol);
    if (!basket || basket.orders.length === 0) {
      activeBaskets.delete(symbol);
      return;
    }
    
    // Execute all orders in basket
    const executions = await Promise.all(
      basket.orders.map(orderId => TradingService.executeOrder(orderId))
    );
    
    // Update basket
    await dataLayer.updateBasket(basket.basketId, {
      status: 'executed',
      executedAt: new Date().toISOString()
    });
    
    activeBaskets.delete(symbol);
    
    return {
      basketId: basket.basketId,
      symbol,
      executedOrders: basket.orders.length,
      executions
    };
  }
  
  static async getBasketForSymbol(symbol) {
    const basket = activeBaskets.get(symbol);
    if (basket) {
      const orders = await Promise.all(
        basket.orders.map(orderId => dataLayer.getOrder(orderId))
      );
      return {
        ...basket,
        orders: orders.filter(Boolean)
      };
    }
    return null;
  }
}

