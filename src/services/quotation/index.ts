import { supabase, unwrap } from '../../db';
import { Id } from '../../utils/idGenerator';
import { logger } from '../../utils/logger';
import type { InsuranceType, QuotationRequestStatus, QuoteResult, QuotationRequest, Quotation } from '../../types';

export interface CreateQuotationRequestInput {
  customerId: string;
  leadId?: string;
  insuranceInterestId?: string;
  conversationId?: string;
  insuranceType: InsuranceType;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
}

export class QuotationRequestService {
  async create(input: CreateQuotationRequestInput): Promise<QuotationRequest> {
    const request = unwrap<QuotationRequest>(
      await supabase
        .from('quotation_requests')
        .insert({
          id: Id.quotationRequest(),
          customerId: input.customerId,
          leadId: input.leadId ?? null,
          insuranceInterestId: input.insuranceInterestId ?? null,
          conversationId: input.conversationId ?? null,
          insuranceType: input.insuranceType,
          rawPayload: input.rawPayload,
          normalizedPayload: input.normalizedPayload,
          status: 'received',
          requestedAt: new Date().toISOString(),
        })
        .select()
        .single(),
    );

    logger.info('Quotation request created', {
      request_id: request.id,
      customer_id: input.customerId,
      insurance_type: input.insuranceType,
    });

    return request;
  }

  async updateStatus(
    requestId: string,
    status: QuotationRequestStatus,
    extra?: { errorCode?: string; errorMessage?: string },
  ): Promise<QuotationRequest> {
    const updates: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === 'processing') updates.processingStartedAt = now;
    if (status === 'generated' || status === 'partially_generated' || status === 'failed') updates.completedAt = now;
    if (extra?.errorCode) updates.errorCode = extra.errorCode;
    if (extra?.errorMessage) updates.errorMessage = extra.errorMessage;

    return unwrap<QuotationRequest>(
      await supabase.from('quotation_requests').update(updates).eq('id', requestId).select().single(),
    );
  }

  async saveQuotations(
    requestId: string,
    customerId: string,
    insuranceType: InsuranceType,
    results: QuoteResult[],
  ): Promise<Quotation[]> {
    const rows = results.map((r) => ({
      id: Id.quotation(),
      quotationRequestId: requestId,
      customerId,
      insuranceType,
      provider: (r.rawResponse['_provider'] as string) ?? 'unknown',
      providerQuoteId: r.providerQuoteId,
      insurerName: r.insurerName,
      planName: r.planName,
      premium: r.premium,
      sumAssured: r.sumAssured ?? null,
      policyTerm: r.policyTerm ?? null,
      validUntil: r.validUntil ? r.validUntil.toISOString() : null,
      status: 'active',
    }));

    return unwrap<Quotation[]>(await supabase.from('quotations').insert(rows).select());
  }

  async findById(id: string): Promise<QuotationRequest | null> {
    return unwrap<QuotationRequest | null>(
      await supabase.from('quotation_requests').select('*, quotations(*)').eq('id', id).maybeSingle(),
    );
  }

  async findForCustomer(customerId: string): Promise<QuotationRequest[]> {
    return unwrap<QuotationRequest[]>(
      await supabase
        .from('quotation_requests')
        .select('*, quotations(*)')
        .eq('customerId', customerId)
        .order('createdAt', { ascending: false }),
    );
  }
}

export const quotationRequestService = new QuotationRequestService();
