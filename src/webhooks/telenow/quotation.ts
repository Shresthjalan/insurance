import { z } from 'zod';
import { customerService } from '../../services/CustomerService';
import { leadService } from '../../services/LeadService';
import { insuranceInterestService } from '../../services/InsuranceInterestService';
import { quotationRequestService } from '../../services/quotation';
import { CarQuotationService } from '../../services/quotation/CarQuotationService';
import { HealthQuotationService } from '../../services/quotation/HealthQuotationService';
import { TermQuotationService } from '../../services/quotation/TermQuotationService';
import { LifeQuotationService } from '../../services/quotation/LifeQuotationService';
import { ProviderAAdapter } from '../../providers/quotation/ProviderAAdapter';
import { ProviderBAdapter } from '../../providers/quotation/ProviderBAdapter';
import { quotationQueue } from '../../workers/queues';
import { prisma } from '../../db';
import { ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { InsuranceType } from '../../types';

const quotationSchema = z.object({
  phone_number: z.string().min(7),
  customer_name: z.string().min(1),
  insurance_type: z.enum(['car', 'health', 'term', 'life']),
  quotation_details: z.record(z.unknown()),
  external_event_id: z.string().optional(),
});

const providers = [new ProviderAAdapter(), new ProviderBAdapter()];

const carService = new CarQuotationService(providers);
const healthService = new HealthQuotationService(providers);
const termService = new TermQuotationService(providers);
const lifeService = new LifeQuotationService(providers);

function validateAndNormalize(insuranceType: InsuranceType, details: unknown) {
  switch (insuranceType) {
    case 'car': {
      const validated = carService.validate(details);
      return carService.normalize(validated);
    }
    case 'health': {
      const validated = healthService.validate(details);
      return healthService.normalize(validated);
    }
    case 'term': {
      const validated = termService.validate(details);
      return termService.normalize(validated);
    }
    case 'life': {
      const validated = lifeService.validate(details);
      return lifeService.normalize(validated);
    }
  }
}

export async function handleTelenowQuotation(
  body: unknown,
  requestId: string,
): Promise<{ quotation_request_id: string; status: string }> {
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(issue.message, issue.path.join('.'));
  }

  const { phone_number, customer_name, insurance_type, quotation_details, external_event_id } = parsed.data;

  // Idempotency
  if (external_event_id) {
    const existing = await prisma.webhookEvent.findFirst({
      where: { externalEventId: external_event_id, processingStatus: 'processed' },
    });
    if (existing) {
      logger.info('Duplicate quotation webhook ignored', { external_event_id, request_id: requestId });
      // Return early — find existing request
      const customer = await customerService.findByPhone(phone_number);
      if (customer) {
        const req = await prisma.quotationRequest.findFirst({
          where: { customerId: customer.id, insuranceType: insurance_type },
          orderBy: { createdAt: 'desc' },
        });
        if (req) return { quotation_request_id: req.id, status: req.status };
      }
    }
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'telenow',
      eventType: 'quotation',
      externalEventId: external_event_id ?? null,
      requestId,
      payload: body as Record<string, unknown>,
      processingStatus: 'processing',
      receivedAt: new Date(),
    },
  });

  try {
    // Validate and normalize the type-specific payload
    const normalizedPayload = validateAndNormalize(insurance_type as InsuranceType, quotation_details);

    const customer = await customerService.findOrCreate({ phoneNumber: phone_number, name: customer_name });
    const lead = await leadService.findOrCreate({ customerId: customer.id, source: 'telenow', primaryInsuranceType: insurance_type as InsuranceType });
    const interest = await insuranceInterestService.findOrCreate({
      leadId: lead.id, customerId: customer.id, insuranceType: insurance_type as InsuranceType, source: 'telenow',
    });

    await leadService.updateStatus(lead.id, 'quotation_requested');

    const quotationRequest = await quotationRequestService.create({
      customerId: customer.id,
      leadId: lead.id,
      insuranceInterestId: interest.id,
      insuranceType: insurance_type as InsuranceType,
      rawPayload: quotation_details as Record<string, unknown>,
      normalizedPayload,
    });

    await quotationRequestService.updateStatus(quotationRequest.id, 'queued');

    // Queue the async job — Telenow does not wait for the result
    await quotationQueue.add('process_quotation', {
      quotationRequestId: quotationRequest.id,
      customerId: customer.id,
      insuranceType: insurance_type,
      normalizedPayload,
    });

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: 'processed', processedAt: new Date() },
    });

    logger.info('Telenow quotation queued', {
      request_id: requestId,
      quotation_request_id: quotationRequest.id,
      customer_id: customer.id,
      insurance_type,
    });

    return { quotation_request_id: quotationRequest.id, status: 'queued' };
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: 'failed', errorMessage: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
