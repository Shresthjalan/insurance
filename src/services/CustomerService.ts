import { supabase, unwrap, unwrapList } from '../db';
import { normalizePhoneNumber, isValidPhoneNumber } from '../utils/phoneNormalizer';
import { ValidationError } from '../utils/errors';
import { Id } from '../utils/idGenerator';
import { logger } from '../utils/logger';
import type { Customer } from '../types';

export interface FindOrCreateCustomerInput {
  phoneNumber: string;
  name?: string;
  language?: string;
  countryCode?: string;
}

export class CustomerService {
  async findOrCreate(input: FindOrCreateCustomerInput): Promise<Customer> {
    if (!isValidPhoneNumber(input.phoneNumber)) {
      throw new ValidationError(`Invalid phone number: ${input.phoneNumber}`, 'phone_number');
    }

    const normalized = normalizePhoneNumber(input.phoneNumber);

    const existing = unwrap<Customer | null>(
      await supabase.from('customers').select('*').eq('normalizedPhoneNumber', normalized).maybeSingle(),
    );

    if (existing) {
      const updates: Record<string, unknown> = { lastContactAt: new Date().toISOString() };
      if (input.name && !existing.name) updates.name = input.name;
      if (input.language && !existing.preferredLanguage) updates.preferredLanguage = input.language;

      return unwrap<Customer>(
        await supabase.from('customers').update(updates).eq('id', existing.id).select().single(),
      );
    }

    const customer = unwrap<Customer>(
      await supabase
        .from('customers')
        .insert({
          id: Id.customer(),
          phoneNumber: input.phoneNumber,
          normalizedPhoneNumber: normalized,
          name: input.name ?? null,
          preferredLanguage: input.language ?? null,
          countryCode: input.countryCode ?? null,
          lastContactAt: new Date().toISOString(),
        })
        .select()
        .single(),
    );

    logger.info('Customer created', { customer_id: customer.id });
    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    return unwrap<Customer | null>(await supabase.from('customers').select('*').eq('id', id).maybeSingle());
  }

  async findByPhone(phoneNumber: string): Promise<Customer | null> {
    const normalized = normalizePhoneNumber(phoneNumber);
    return unwrap<Customer | null>(
      await supabase.from('customers').select('*').eq('normalizedPhoneNumber', normalized).maybeSingle(),
    );
  }

  async list(page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const result = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(from, from + limit - 1);
    return { ...unwrapList<Customer>(result), page, limit };
  }
}

export const customerService = new CustomerService();
