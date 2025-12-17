import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { Wallet, DepositInput } from '../types';
import { ledgerService } from './ledgerService';

export const walletService = {
  /**
   * Module 4.1: Automatically create exactly ONE wallet per user
   */
  async provision(userId: string): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    // Check if wallet already exists (unique constraint also enforces this)
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingWallet) {
      throw new AppError(ErrorCodes.WALLET_ALREADY_EXISTS, 'User already has a wallet', 409);
    }
    
    // Create wallet with initial balance of 0
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        cash_balance: 0,
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        throw new AppError(ErrorCodes.WALLET_ALREADY_EXISTS, 'User already has a wallet', 409);
      }
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create wallet', 500);
    }
    
    return wallet;
  },
  
  /**
   * Get wallet for a user
   */
  async getByUserId(userId: string): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch wallet', 500);
    }
    
    if (!wallet) {
      throw new AppError(ErrorCodes.WALLET_NOT_FOUND, 'Wallet not found', 404);
    }
    
    return wallet;
  },
  
  /**
   * Module 5: Wallet Funding (Deposit)
   * - Accept only positive amounts
   * - Deterministic balance updates using NUMERIC
   * - Idempotency via idempotency_key
   */
  async deposit(userId: string, input: DepositInput): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    // 5.1: Validate positive amount
    if (input.amount <= 0) {
      throw new AppError(ErrorCodes.INVALID_AMOUNT, 'Amount must be positive', 400);
    }
    
    // 5.3: Check idempotency - if this key was already used, return existing result
    const { data: existingTx } = await supabase
      .from('ledger_transactions')
      .select('id')
      .eq('idempotency_key', input.idempotency_key)
      .maybeSingle();
    
    if (existingTx) {
      // Idempotent: return current wallet state
      return this.getByUserId(userId);
    }
    
    // Get current wallet
    const wallet = await this.getByUserId(userId);
    
    // 6: Create ledger transaction for double-entry
    await ledgerService.createDeposit(userId, wallet.id, input.amount, input.idempotency_key);
    
    // 5.2: Update balance deterministically using NUMERIC
    const newBalance = parseFloat(wallet.cash_balance) + input.amount;
    
    const { data: updatedWallet, error } = await supabase
      .from('wallets')
      .update({ cash_balance: newBalance })
      .eq('id', wallet.id)
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update wallet balance', 500);
    }
    
    return updatedWallet;
  },
  
  /**
   * Internal: Update balance (used by order service)
   */
  async updateBalance(walletId: string, newBalance: number): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    if (newBalance < 0) {
      throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Insufficient funds', 422);
    }
    
    const { data: wallet, error } = await supabase
      .from('wallets')
      .update({ cash_balance: newBalance })
      .eq('id', walletId)
      .select()
      .single();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update wallet', 500);
    }
    
    return wallet;
  },
  
  /**
   * Check if user has sufficient funds
   */
  async hasSufficientFunds(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getByUserId(userId);
    return parseFloat(wallet.cash_balance) >= amount;
  },
};

