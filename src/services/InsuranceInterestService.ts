import { supabase, unwrap } from '../db';
import { Id } from '../utils/idGenerator';
import { logger } from '../utils/logger';
import type { InsuranceInterest } from '../types';
import type { InsuranceType, LeadSource } from '../types';

export interface CreateInsuranceInterestInput {
  leadId: string;
  customerId: string;
  insuranceType: InsuranceType;
  source: LeadSource;
  conversationId?: string;
}

export class InsuranceInterestService {
  async findOrCreate(input: CreateInsuranceInterestInput): Promise<InsuranceInterest> {
    const existing = unwrap<InsuranceInterest[]>(
      await supabase
        .from('insurance_interests')
        .select('*')
        .eq('customerId', input.customerId)
        .eq('insuranceType', input.insuranceType)
        .eq('status', 'active')
        .order('createdAt', { ascending: false })
        .limit(1),
    );
    if (existing.length > 0) return existing[0];

    const interest = unwrap<InsuranceInterest>(
      await supabase
        .from('insurance_interests')
        .insert({
          id: Id.interest(),
          leadId: input.leadId,
          customerId: input.customerId,
          insuranceType: input.insuranceType,
          source: input.source,
          conversationId: input.conversationId ?? null,
          status: 'active',
        })
        .select()
        .single(),
    );

    logger.info('Insurance interest created', {
      interest_id: interest.id,
      customer_id: input.customerId,
      insurance_type: input.insuranceType,
    });

    return interest;
  }

  async findById(id: string): Promise<InsuranceInterest | null> {
    return unwrap<InsuranceInterest | null>(
      await supabase.from('insurance_interests').select('*').eq('id', id).maybeSingle(),
    );
  }

  async findActiveForCustomer(customerId: string, insuranceType?: InsuranceType) {
    let query = supabase
      .from('insurance_interests')
      .select('*')
      .eq('customerId', customerId)
      .eq('status', 'active');
    if (insuranceType) query = query.eq('insuranceType', insuranceType);

    const results = unwrap<InsuranceInterest[]>(
      await query.order('createdAt', { ascending: false }).limit(1),
    );
    return results[0] ?? null;
  }
}

export const insuranceInterestService = new InsuranceInterestService();
