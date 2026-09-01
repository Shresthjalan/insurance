import { Worker } from 'bullmq';
import { redisConnection } from './queues';
import { whatsAppService } from '../services/whatsapp/WhatsAppService';
import { supabase, unwrap } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { NotificationJobData, Customer, Conversation } from '../types';

async function processNotification(data: NotificationJobData): Promise<void> {
  const { customerId, eventType, channel, payload } = data;

  const customer = unwrap<Customer | null>(
    await supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
  );
  if (!customer) {
    logger.warn('Customer not found for notification', { customer_id: customerId });
    return;
  }

  if (channel === 'whatsapp') {
    const conversations = unwrap<Conversation[]>(
      await supabase
        .from('conversations')
        .select('*')
        .eq('customerId', customerId)
        .eq('channel', 'whatsapp')
        .eq('status', 'active')
        .limit(1),
    );
    const conv = conversations[0];
    if (!conv) return;

    const body = (payload['message'] as string) ?? `Notification: ${eventType}`;
    await whatsAppService.sendText(conv.id, customerId, customer.normalizedPhoneNumber, body);
  }

  logger.info('Notification sent', { customer_id: customerId, event_type: eventType, channel });
}

export function createNotificationWorker() {
  return new Worker(
    'notification_jobs',
    async (job) => {
      await processNotification(job.data as NotificationJobData);
    },
    {
      connection: redisConnection,
      concurrency: config.workers.notificationConcurrency,
    },
  );
}
