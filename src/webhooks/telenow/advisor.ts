import { z } from 'zod';
import { customerService } from '../../services/CustomerService';
import { leadService } from '../../services/LeadService';
import { insuranceInterestService } from '../../services/InsuranceInterestService';
import { advisorService } from '../../services/AdvisorService';
import { supabase, unwrap } from '../../db';
import { Id } from '../../utils/idGenerator';
import { ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { WebhookEvent, AdvisorAppointment } from '../../types';

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
    const existing = unwrap<WebhookEvent | null>(
      await supabase
        .from('webhook_events')
        .select('*')
        .eq('externalEventId', data.external_event_id)
        .eq('processingStatus', 'processed')
        .maybeSingle(),
    );
    if (existing) {
      const customer = await customerService.findByPhone(data.phone_number);
      if (customer) {
        const appts = unwrap<AdvisorAppointment[]>(
          await supabase
            .from('advisor_appointments')
            .select('*')
            .eq('customerId', customer.id)
            .eq('requestedDate', data.meeting_date)
            .eq('requestedTime', data.meeting_time)
            .limit(1),
        );
        if (appts[0]) return { appointment_id: appts[0].id, status: appts[0].status };
      }
    }
  }

  const webhookEvent = unwrap<WebhookEvent>(
    await supabase
      .from('webhook_events')
      .insert({
        id: Id.webhookEvent(),
        provider: 'telenow',
        eventType: 'advisor_call',
        externalEventId: data.external_event_id ?? null,
        requestId,
        payload: body as Record<string, unknown>,
        processingStatus: 'processing',
        receivedAt: new Date().toISOString(),
      })
      .select()
      .single(),
  );

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

    await supabase
      .from('webhook_events')
      .update({ processingStatus: 'processed', processedAt: new Date().toISOString() })
      .eq('id', webhookEvent.id);

    logger.info('Telenow advisor appointment created', {
      request_id: requestId,
      appointment_id: appointment.id,
      customer_id: customer.id,
    });

    return { appointment_id: appointment.id, status: appointment.status };
  } catch (err) {
    await supabase
      .from('webhook_events')
      .update({
        processingStatus: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .eq('id', webhookEvent.id);
    throw err;
  }
}
