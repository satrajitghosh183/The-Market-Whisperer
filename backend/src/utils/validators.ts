import { z } from 'zod';

// ============================================
// USER VALIDATORS
// ============================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// WALLET VALIDATORS
// ============================================

export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  idempotency_key: z.string().min(1, 'Idempotency key is required'),
});

// ============================================
// PORTFOLIO VALIDATORS
// ============================================

export const createPortfolioSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

// ============================================
// ORDER VALIDATORS
// ============================================

export const orderSideSchema = z.enum(['BUY', 'SELL']);

export const createOrderSchema = z.object({
  portfolio_id: z.string().uuid('Invalid portfolio ID'),
  ticker: z.string().min(1, 'Ticker is required').max(20).toUpperCase(),
  side: orderSideSchema,
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
});

// ============================================
// HEDGED TRADE VALIDATORS
// ============================================

export const createHedgedTradeSchema = z.object({
  portfolio_id: z.string().uuid('Invalid portfolio ID'),
  primary_ticker: z.string().min(1).max(20).toUpperCase(),
  primary_side: orderSideSchema,
  primary_quantity: z.number().positive('Primary quantity must be positive'),
  primary_price: z.number().positive('Primary price must be positive'),
  hedge_ticker: z.string().min(1).max(20).toUpperCase(),
  hedge_quantity: z.number().positive('Hedge quantity must be positive'),
  hedge_price: z.number().positive('Hedge price must be positive'),
});

// ============================================
// REPORT VALIDATORS
// ============================================

export const createReportSchema = z.object({
  portfolio_id: z.string().uuid('Invalid portfolio ID').optional(),
  report_type: z.enum(['PORTFOLIO_SUMMARY', 'POSITIONS_DETAIL', 'TRANSACTION_HISTORY', 'PNL_REPORT']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  { message: 'Start date must be before or equal to end date' }
);

// ============================================
// MARKET DATA VALIDATORS
// ============================================

export const tickerSchema = z.string().min(1).max(20).toUpperCase();

export const quoteRequestSchema = z.object({
  ticker: tickerSchema,
});

export const historyRequestSchema = z.object({
  ticker: tickerSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  limit: z.number().int().positive().max(365).optional(),
});

// ============================================
// INDICATOR VALIDATORS
// ============================================

export const computeIndicatorsSchema = z.object({
  ticker: tickerSchema,
  window_size: z.number().int().min(5).max(200).optional().default(20),
});

// ============================================
// NEWS VALIDATORS
// ============================================

export const ingestNewsSchema = z.object({
  ticker: tickerSchema,
  source: z.string().min(1).max(100),
  headline: z.string().min(1),
  summary: z.string().optional(),
  url: z.string().url().optional(),
  published_at: z.string().datetime(),
});

// ============================================
// EXPLAINABILITY VALIDATORS
// ============================================

export const explanationRequestSchema = z.object({
  ticker: tickerSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

// ============================================
// VALIDATION HELPER
// ============================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

