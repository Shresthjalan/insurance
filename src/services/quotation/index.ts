import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import type { InsuranceType, QuotationRequestStatus, QuoteResult, QuotationDetails } from '../../types';
import type { QuotationProvider } from '../../providers/quotation/QuotationProvider';

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
  async create(input: CreateQuotationRequestInput) {
    const request = await prisma.quotationRequest.create({
      data: {
        customerId: input.customerId,
        leadId: input.leadId ?? null,
        insuranceInterestId: input.insuranceInterestId ?? null,
        conversationId: input.conversationId ?? null,
        insuranceType: input.insuranceType,
        rawPayload: input.rawPayload,
        normalizedPayload: input.normalizedPayload,
        status: 'received',
        requestedAt: new Date(),
      },
    });

    logger.info('Quotation request created', {
      request_id: request.id,
      customer_id: input.customerId,
      insurance_type: input.insuranceType,
    });

    return request;
  }

  async updateStatus(requestId: string, status: QuotationRequestStatus, extra?: { errorCode?: string; errorMessage?: string }) {
    const data: Record<string, unknown> = { status };
    if (status === 'processing') data.processingStartedAt = new Date();
    if (status === 'generated' || status === 'partially_generated' || status === 'failed') data.completedAt = new Date();
    if (extra?.errorCode) data.errorCode = extra.errorCode;
    if (extra?.errorMessage) data.errorMessage = extra.errorMessage;

    return prisma.quotationRequest.update({ where: { id: requestId }, data });
  }

  async saveQuotations(requestId: string, customerId: string, insuranceType: InsuranceType, results: QuoteResult[]) {
    const quotations = await prisma.$transaction(
      results.map((r) =>
        prisma.quotation.create({
          data: {
            quotationRequestId: requestId,
            customerId,
            insuranceType,
            provider: r.rawResponse['_provider'] as string ?? 'unknown',
            providerQuoteId: r.providerQuoteId,
            insurerName: r.insurerName,
            planName: r.planName,
            premium: r.premium,
            sumAssured: r.sumAssured ?? null,
            policyTerm: r.policyTerm ?? null,
            validUntil: r.validUntil ?? null,
            status: 'active',
          },
        }),
      ),
    );
    return quotations;
  }

  async findById(id: string) {
    return prisma.quotationRequest.findUnique({
      where: { id },
      include: { quotations: { include: { documents: true } } },
    });
  }

  async findForCustomer(customerId: string) {
    return prisma.quotationRequest.findMany({
      where: { customerId },
      include: { quotations: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const quotationRequestService = new QuotationRequestService();
