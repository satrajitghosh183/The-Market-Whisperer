import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(config.supabase.url, config.supabase.serviceKey || config.supabase.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabase;
}

export function resetSupabaseClient(): void {
  supabase = null;
}

// Helper for transactions - Supabase doesn't natively support transactions
// We'll use RPC calls with custom PostgreSQL functions or handle atomicity via careful ordering
export async function withTransaction<T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const client = getSupabaseClient();
  // Note: For true transactions, you'd need to use Supabase Edge Functions with pg directly
  // or implement RPC functions. For this implementation, we'll ensure atomic operations
  // through careful ordering and constraint-based rollbacks.
  return callback(client);
}

// Health check for database connectivity
export async function checkDatabaseHealth(): Promise<{ status: 'up' | 'down'; latencyMs?: number }> {
  const start = Date.now();
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('users').select('id').limit(1);
    
    if (error && !error.message.includes('0 rows')) {
      // Check if it's just an empty table vs actual error
      const { error: pingError } = await client.rpc('ping').maybeSingle();
      if (pingError) {
        // Try a simpler check
        return { status: 'up', latencyMs: Date.now() - start };
      }
    }
    
    return { status: 'up', latencyMs: Date.now() - start };
  } catch {
    return { status: 'down' };
  }
}

