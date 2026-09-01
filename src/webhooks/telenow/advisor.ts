import { z } from 'zod';
import { customerService } from '../../services/CustomerService';
import { leadService } from '../../services/LeadService';
import { insuranceInterestService } from '../../services/InsuranceInterestService';
import { advisorService } from '../../services/AdvisorService';
import { prisma } from '../../db';
import { ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const advisorSchema = z.object({
  phone_number: z.string().min(7),
  customer_name: z.string().min(1),
  insurance_type: z.enum(['car', 'health', 'term', 'life']),
  meeting_requested: z.boolean(),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'meeting_date must be YYYY-MM-DD'),
  meeting_time: z.string().regex(/^\d{2}:\d{2}$/, 'meeting_time must be HH:MM'),
  timezone: z.string().default('Asia/Kolkata'),
  notes: z.string().optional(),
  external_event_id: z.string().optional(),
});

export async function handleTelenowAdvisor(
  body: unknown,
  requestId: string,
): Promise<{ appointment_id: string; status: string }> {
  const parsed = advisorSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError(issue.message, issue.path.join('.'));
  }

  const data = parsed.data;

  if (!data.meeting_requested) {
    logger.info('Advisor call not requested', { request_id: requestId });
    return { appointment_id: '', status: 'skipped' };
  }

  // Idempotency
  if (data.external_event_id) {
    const existing = await prisma.webhookEvent.findFirst({
      where: { externalEventId: data.external_event_id, processingStatus: 'processed' },
    });
    if (existing) {
      const customer = await customerService.findByPhone(data.phone_number);
      if (customer) {
        const appt = await prisma.advisorAppointment.findFirst({
          where: { customerId: customer.id, requestedDate: data.meeting_date, requestedTime: data.meeting_time },
        });
        if (appt) return { appointment_id: appt.id, status: appt.status };
      }
    }
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'telenow',
      eventType: 'advisor_call',
      externalEventId: data.external_event_id ?? null,
      requestId,
      payload: body as Record<string, unknown>,
      processingStatus: 'processing',
      receivedAt: new Date(),
    },
  });

  try {
    const customer = await customerService.findOrCreate({
      phoneNumber: data.phone_number,
      name: data.customer_name,
    });

    const lead = await leadService.findOrCreate({
      customerId: customer.id,
      source: 'telenow',
      primaryInsuranceType: data.insurance_type,
    });

    const interest = await insuranceInterestService.findActiveForCustomer(
      customer.id,
      data.insurance_type,
    );

    const appointment = await advisorService.create({
      customerId: customer.id,
      leadId: lead.id,
      insuranceInterestId: interest?.id,
      requestedDate: data.meeting_date,
      requestedTime: data.meeting_time,
      timezone: data.timezone,
      source: 'telenow',
      notes: data.notes,
    });

    await leadService.updateStatus(lead.id, 'advisor_requested');

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: 'processed', processedAt: new Date() },
    });

    logger.info('Telenow advisor appointment created', {
      request_id: requestId,
      appointment_id: appointment.id,
      customer_id: customer.id,
    });

    return { appointment_id: appointment.id, status: appointment.status };
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: 'failed', errorMessage: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
