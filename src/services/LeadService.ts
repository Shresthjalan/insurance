import { supabase, unwrap, unwrapList } from '../db';
import { Id } from '../utils/idGenerator';
import { logger } from '../utils/logger';
import type { Lead } from '../types';
import type { InsuranceType, LeadSource, LeadStatus } from '../types';

const OPEN_STATUS_EXCLUSIONS = ['converted', 'closed', 'lost'];

export interface FindOrCreateLeadInput {
  customerId: string;
  source: LeadSource;
  primaryInsuranceType?: InsuranceType;
}

export class LeadService {
  async findOrCreate(input: FindOrCreateLeadInput): Promise<Lead> {
    // Re-use an open lead for the same customer and insurance type
    let query = supabase
      .from('leads')
      .select('*')
      .eq('customerId', input.customerId)
      .not('status', 'in', `(${OPEN_STATUS_EXCLUSIONS.join(',')})`)
      .order('createdAt', { ascending: false })
      .limit(1);
    if (input.primaryInsuranceType) {
      query = query.eq('primaryInsuranceType', input.primaryInsuranceType);
    }

    const existing = unwrap<Lead[]>(await query);
    if (existing.length > 0) return existing[0];

    const lead = unwrap<Lead>(
      await supabase
        .from('leads')
        .insert({
          id: Id.lead(),
          customerId: input.customerId,
          source: input.source,
          primaryInsuranceType: input.primaryInsuranceType ?? null,
          status: 'new',
        })
        .select()
        .single(),
    );

    logger.info('Lead created', { lead_id: lead.id, customer_id: input.customerId });
    return lead;
  }

  async updateStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    return unwrap<Lead>(await supabase.from('leads').update({ status }).eq('id', leadId).select().single());
  }

  async findById(id: string): Promise<Lead | null> {
    return unwrap<Lead | null>(await supabase.from('leads').select('*').eq('id', id).maybeSingle());
  }

  async list(filters: { status?: LeadStatus; source?: LeadSource } = {}, page = 1, limit = 50) {
    const from = (page - 1) * limit;
    let query = supabase.from('leads').select('*', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.source) query = query.eq('source', filters.source);
    const result = await query.order('createdAt', { ascending: false }).range(from, from + limit - 1);
    return { ...unwrapList<Lead>(result), page, limit };
  }
}

export const leadService = new LeadService();
