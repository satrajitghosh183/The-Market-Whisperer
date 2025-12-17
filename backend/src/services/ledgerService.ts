import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { LedgerTransaction, LedgerEntry, TxType, AccountType } from '../types';

interface LedgerPostings {
  account_type: AccountType;
  account_ref?: string;
  debit: number;
  credit: number;
}

export const ledgerService = {
  /**
   * Module 6: Create a balanced ledger transaction with entries
   * 6.1: Record all monetary events as balanced debit/credit postings
   * 6.2: sum(debits) == sum(credits) per tx_id
   */
  async createTransaction(
    userId: string,
    txType: TxType,
    postings: LedgerPostings[],
    options: {
      referenceId?: string;
      idempotencyKey?: string;
      description?: string;
    } = {}
  ): Promise<LedgerTransaction> {
    const supabase = getSupabaseClient();
    
    // Validate balance: sum(debits) must equal sum(credits)
    const totalDebits = postings.reduce((sum, p) => sum + p.debit, 0);
    const totalCredits = postings.reduce((sum, p) => sum + p.credit, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.00000001) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Ledger entries must balance. Debits: ${totalDebits}, Credits: ${totalCredits}`,
        400
      );
    }
    
    // Check idempotency
    if (options.idempotencyKey) {
      const { data: existingTx } = await supabase
        .from('ledger_transactions')
        .select('*')
        .eq('idempotency_key', options.idempotencyKey)
        .maybeSingle();
      
      if (existingTx) {
        return existingTx;
      }
    }
    
    // Create transaction
    const { data: tx, error: txError } = await supabase
      .from('ledger_transactions')
      .insert({
        user_id: userId,
        tx_type: txType,
        reference_id: options.referenceId || null,
        idempotency_key: options.idempotencyKey || null,
        description: options.description || null,
      })
      .select()
      .single();
    
    if (txError) {
      if (txError.message.includes('duplicate key') && options.idempotencyKey) {
        throw new AppError(ErrorCodes.IDEMPOTENCY_CONFLICT, 'Duplicate transaction', 409);
      }
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create ledger transaction', 500);
    }
    
    // Create entries
    const entries = postings.map((p) => ({
      tx_id: tx.id,
      account_type: p.account_type,
      account_ref: p.account_ref || null,
      debit: p.debit,
      credit: p.credit,
    }));
    
    const { error: entriesError } = await supabase
      .from('ledger_entries')
      .insert(entries);
    
    if (entriesError) {
      // Rollback transaction (in a real scenario, we'd use a proper transaction)
      await supabase.from('ledger_transactions').delete().eq('id', tx.id);
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create ledger entries', 500);
    }
    
    return tx;
  },
  
  /**
   * Create deposit ledger entries
   * Debit: CASH (increase in assets)
   * Credit: EQUITY (increase in equity from deposit)
   */
  async createDeposit(
    userId: string,
    walletId: string,
    amount: number,
    idempotencyKey: string
  ): Promise<LedgerTransaction> {
    return this.createTransaction(
      userId,
      'DEPOSIT',
      [
        { account_type: 'CASH', account_ref: walletId, debit: amount, credit: 0 },
        { account_type: 'EQUITY', account_ref: 'DEPOSIT', debit: 0, credit: amount },
      ],
      {
        idempotencyKey,
        description: `Deposit of ${amount}`,
      }
    );
  },
  
  /**
   * Create buy order ledger entries
   * Debit: STOCK (increase in stock holdings)
   * Credit: CASH (decrease in cash)
   */
  async createBuy(
    userId: string,
    orderId: string,
    ticker: string,
    totalCost: number
  ): Promise<LedgerTransaction> {
    return this.createTransaction(
      userId,
      'BUY',
      [
        { account_type: 'STOCK', account_ref: ticker, debit: totalCost, credit: 0 },
        { account_type: 'CASH', debit: 0, credit: totalCost },
      ],
      {
        referenceId: orderId,
        description: `Buy ${ticker} for ${totalCost}`,
      }
    );
  },
  
  /**
   * Create sell order ledger entries
   * Debit: CASH (increase in cash from sale)
   * Debit: REALIZED_PNL (if loss) or Credit: REALIZED_PNL (if profit)
   * Credit: STOCK (decrease in stock holdings at cost basis)
   */
  async createSell(
    userId: string,
    orderId: string,
    ticker: string,
    saleProceeds: number,
    costBasis: number
  ): Promise<LedgerTransaction> {
    const pnl = saleProceeds - costBasis;
    
    const postings: LedgerPostings[] = [
      { account_type: 'CASH', debit: saleProceeds, credit: 0 },
      { account_type: 'STOCK', account_ref: ticker, debit: 0, credit: costBasis },
    ];
    
    if (pnl >= 0) {
      // Profit: Credit to P&L
      postings.push({ account_type: 'REALIZED_PNL', account_ref: ticker, debit: 0, credit: pnl });
    } else {
      // Loss: Debit to P&L
      postings.push({ account_type: 'REALIZED_PNL', account_ref: ticker, debit: Math.abs(pnl), credit: 0 });
    }
    
    return this.createTransaction(userId, 'SELL', postings, {
      referenceId: orderId,
      description: `Sell ${ticker} for ${saleProceeds}, P&L: ${pnl}`,
    });
  },
  
  /**
   * Get entries for a transaction
   */
  async getEntriesForTransaction(txId: string): Promise<LedgerEntry[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('tx_id', txId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch ledger entries', 500);
    }
    
    return data || [];
  },
  
  /**
   * Get all transactions for a user
   */
  async getTransactionsForUser(userId: string): Promise<LedgerTransaction[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('ledger_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch transactions', 500);
    }
    
    return data || [];
  },
  
  /**
   * 6.3: Verify wallet totals are reconcilable from ledger history
   */
  async reconcileWalletBalance(userId: string): Promise<{
    walletBalance: number;
    ledgerBalance: number;
    isReconciled: boolean;
  }> {
    const supabase = getSupabaseClient();
    
    // Get wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('cash_balance')
      .eq('user_id', userId)
      .single();
    
    // Calculate from ledger
    const { data: reconciliation } = await supabase
      .from('wallet_ledger_reconciliation')
      .select('cash_balance_from_ledger')
      .eq('user_id', userId)
      .single();
    
    const walletBalance = wallet ? parseFloat(wallet.cash_balance) : 0;
    const ledgerBalance = reconciliation ? parseFloat(reconciliation.cash_balance_from_ledger) : 0;
    
    return {
      walletBalance,
      ledgerBalance,
      isReconciled: Math.abs(walletBalance - ledgerBalance) < 0.00000001,
    };
  },
};

