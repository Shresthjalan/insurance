import { Worker } from 'bullmq';
import { redisConnection } from './queues';
import { whatsAppService } from '../services/whatsapp/WhatsAppService';
import { prisma } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { NotificationJobData } from '../types';

async function processNotification(data: NotificationJobData): Promise<void> {
  const { customerId, eventType, channel, payload } = data;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    logger.warn('Customer not found for notification', { customer_id: customerId });
    return;
  }

  if (channel === 'whatsapp') {
    const conv = await prisma.conversation.findFirst({
      where: { customerId, channel: 'whatsapp', status: 'active' },
    });
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
