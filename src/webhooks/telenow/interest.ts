import { z } from 'zod';
import { customerService } from '../../services/CustomerService';
import { leadService } from '../../services/LeadService';
import { insuranceInterestService } from '../../services/InsuranceInterestService';
import { eventService } from '../../services/EventService';
import { prisma } from '../../db';
import { ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const interestSchema = z.object({
  phone_number: z.string().min(7),
  customer_name: z.string().min(1),
  insurance_type: z.enum(['car', 'health', 'term', 'life']),
  external_event_id: z.string().optional(),
});

export async function handleTelenowInterest(
  body: unknown,
  requestId: string,
): Promise<{ lead_id: string; interest_id: string }> {
  const parsed = interestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(issue.message, issue.path.join('.'));
  }

  const { phone_number, customer_name, insurance_type, external_event_id } = parsed.data;

  // Idempotency: check if this external event was already processed
  if (external_event_id) {
    const existing = await prisma.webhookEvent.findFirst({
      where: { externalEventId: external_event_id, processingStatus: 'processed' },
    });
    if (existing) {
      logger.info('Duplicate interest webhook ignored', { external_event_id, request_id: requestId });
      // Still return the original IDs by looking up lead/interest
      const customer = await customerService.findByPhone(phone_number);
      if (customer) {
        const interest = await insuranceInterestService.findActiveForCustomer(customer.id, insurance_type);
        const lead = interest ? await leadService.findById(interest.leadId) : null;
        if (interest && lead) {
          return { lead_id: lead.id, interest_id: interest.id };
        }
      }
    }
  }

  // Record the webhook event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'telenow',
      eventType: 'interest',
      externalEventId: external_event_id ?? null,
      requestId,
      payload: body as Record<string, unknown>,
      processingStatus: 'processing',
      receivedAt: new Date(),
    },
  });

  try {
    // Find or create customer
    const customer = await customerService.findOrCreate({
      phoneNumber: phone_number,
      name: customer_name,
    });

    // Find or create lead
    const lead = await leadService.findOrCreate({
      customerId: customer.id,
      source: 'telenow',
      primaryInsuranceType: insurance_type,
    });

    // Create insurance interest
    const interest = await insuranceInterestService.findOrCreate({
      leadId: lead.id,
      customerId: customer.id,
      insuranceType: insurance_type,
      source: 'telenow',
    });

    // Log the event
    const conv = await prisma.conversation.findFirst({
      where: { customerId: customer.id, channel: 'voice', status: 'active' },
    });
    if (conv) {
      await eventService.log({
        conversationId: conv.id,
        customerId: customer.id,
        eventType: 'interest_captured',
        eventData: { insurance_type, source: 'telenow', request_id: requestId },
        source: 'telenow',
      });
    }

    // Mark webhook processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: 'processed', processedAt: new Date() },
    });

    logger.info('Telenow interest processed', {
      request_id: requestId,
      customer_id: customer.id,
      lead_id: lead.id,
      interest_id: interest.id,
      insurance_type,
    });

    return { lead_id: lead.id, interest_id: interest.id };
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
