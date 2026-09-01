import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: { persistSession: false },
});

interface PostgrestResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Throws AppError on a Supabase/PostgREST error, otherwise returns the data. */
export function unwrap<T>(result: PostgrestResult<T>): T {
  if (result.error) {
    throw new AppError('DATABASE_ERROR', result.error.message, 500);
  }
  return result.data as T;
}

interface PostgrestListResult<T> extends PostgrestResult<T> {
  count: number | null;
}

/** Same as unwrap, but also returns the `count` from a `{ count: 'exact' }` select. */
export function unwrapList<T>(result: PostgrestListResult<T[]>): { items: T[]; total: number } {
  return { items: unwrap(result), total: result.count ?? 0 };
}

export async function connectDb(): Promise<void> {
  unwrap(await supabase.from('customers').select('id').limit(1));
  logger.info('Database connected');
}

export async function disconnectDb(): Promise<void> {
  logger.info('Database disconnected');
}
