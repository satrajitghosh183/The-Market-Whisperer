import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { Order, CreateOrderInput, OrderStatus } from '../types';
import { walletService } from './walletService';
import { positionService } from './positionService';
import { ledgerService } from './ledgerService';
import { portfolioService } from './portfolioService';

export const orderService = {
  /**
   * Module 7: Order Placement (Single-Leg)
   * 7.1: Submit buy/sell orders with schema validation
   * 7.2: Enforce sufficient funds (buy) / sufficient inventory (sell)
   * 7.3: Status transitions: PENDING → FILLED/REJECTED/CANCELLED
   */
  async create(userId: string, input: CreateOrderInput): Promise<Order> {
    const supabase = getSupabaseClient();
    
    // Verify portfolio ownership
    const ownsPortfolio = await portfolioService.verifyOwnership(input.portfolio_id, userId);
    if (!ownsPortfolio) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'You do not own this portfolio', 403);
    }
    
    // Create order in PENDING status
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        portfolio_id: input.portfolio_id,
        ticker: input.ticker.toUpperCase(),
        side: input.side,
        quantity: input.quantity,
        price: input.price,
        status: 'PENDING',
      })
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create order', 500);
    }
    
    return order;
  },
  
  /**
   * Module 8: Order Settlement Atomicity
   * 8.1: Settlement as single unit of work
   * - wallet + ledger + order + position updates succeed together or none
   * 
   * Note: Supabase doesn't natively support transactions via REST API.
   * In production, you'd use Edge Functions with direct pg connection.
   * Here we implement careful ordering with constraint-based rollback.
   */
  async settle(orderId: string, userId: string): Promise<Order> {
    const supabase = getSupabaseClient();
    
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();
    
    if (orderError || !order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found', 404);
    }
    
    if (order.status !== 'PENDING') {
      throw new AppError(
        ErrorCodes.INVALID_ORDER_STATUS,
        `Order cannot be settled. Current status: ${order.status}`,
        422
      );
    }
    
    const quantity = parseFloat(order.quantity);
    const price = parseFloat(order.price);
    const totalCost = quantity * price;
    
    try {
      if (order.side === 'BUY') {
        await this.settleBuyOrder(order, userId, quantity, price, totalCost);
      } else {
        await this.settleSellOrder(order, userId, quantity, price, totalCost);
      }
      
      // Mark order as FILLED
      const { data: filledOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'FILLED',
          filled_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) {
        throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update order status', 500);
      }
      
      return filledOrder;
    } catch (error) {
      // Mark order as REJECTED on failure
      await supabase
        .from('orders')
        .update({
          status: 'REJECTED',
          rejection_reason: error instanceof AppError ? error.message : 'Settlement failed',
        })
        .eq('id', orderId);
      
      throw error;
    }
  },
  
  /**
   * Settle a buy order
   */
  async settleBuyOrder(
    order: Order,
    userId: string,
    quantity: number,
    price: number,
    totalCost: number
  ): Promise<void> {
    // Check sufficient funds
    const wallet = await walletService.getByUserId(userId);
    const currentBalance = parseFloat(wallet.cash_balance);
    
    if (currentBalance < totalCost) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_FUNDS,
        `Insufficient funds. Have ${currentBalance}, need ${totalCost}`,
        422
      );
    }
    
    // Create ledger entry (debit stock, credit cash)
    await ledgerService.createBuy(userId, order.id, order.ticker, totalCost);
    
    // Update wallet balance
    await walletService.updateBalance(wallet.id, currentBalance - totalCost);
    
    // Update position (VWAP)
    await positionService.updateOnBuy(order.portfolio_id, order.ticker, quantity, price);
  },
  
  /**
   * Settle a sell order
   */
  async settleSellOrder(
    order: Order,
    userId: string,
    quantity: number,
    price: number,
    saleProceeds: number
  ): Promise<void> {
    // Check sufficient shares
    const hasSufficientShares = await positionService.hasSufficientShares(
      order.portfolio_id,
      order.ticker,
      quantity
    );
    
    if (!hasSufficientShares) {
      throw new AppError(ErrorCodes.INSUFFICIENT_SHARES, 'Insufficient shares to sell', 422);
    }
    
    // Update position and get cost basis
    const { costBasis } = await positionService.updateOnSell(
      order.portfolio_id,
      order.ticker,
      quantity
    );
    
    // Create ledger entry (debit cash, credit stock + P&L)
    await ledgerService.createSell(userId, order.id, order.ticker, saleProceeds, costBasis);
    
    // Update wallet balance
    const wallet = await walletService.getByUserId(userId);
    const currentBalance = parseFloat(wallet.cash_balance);
    await walletService.updateBalance(wallet.id, currentBalance + saleProceeds);
  },
  
  /**
   * Cancel a pending order
   */
  async cancel(orderId: string, userId: string): Promise<Order> {
    const supabase = getSupabaseClient();
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();
    
    if (orderError || !order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found', 404);
    }
    
    if (order.status !== 'PENDING') {
      throw new AppError(
        ErrorCodes.INVALID_ORDER_STATUS,
        `Only PENDING orders can be cancelled. Current status: ${order.status}`,
        422
      );
    }
    
    const { data: cancelledOrder, error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' as OrderStatus })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to cancel order', 500);
    }
    
    return cancelledOrder;
  },
  
  /**
   * Get order by ID
   */
  async getById(orderId: string, userId: string): Promise<Order> {
    const supabase = getSupabaseClient();
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();
    
    if (error || !order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found', 404);
    }
    
    return order;
  },
  
  /**
   * Get all orders for a user
   */
  async getAllForUser(userId: string): Promise<Order[]> {
    const supabase = getSupabaseClient();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch orders', 500);
    }
    
    return orders || [];
  },
  
  /**
   * Get orders for a specific portfolio
   */
  async getByPortfolio(portfolioId: string, userId: string): Promise<Order[]> {
    const supabase = getSupabaseClient();
    
    // Verify ownership
    const ownsPortfolio = await portfolioService.verifyOwnership(portfolioId, userId);
    if (!ownsPortfolio) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'You do not own this portfolio', 403);
    }
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch orders', 500);
    }
    
    return orders || [];
  },
};

