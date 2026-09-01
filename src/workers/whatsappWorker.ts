import { Worker } from 'bullmq';
import { redisConnection } from './queues';
import { whatsAppService } from '../services/whatsapp/WhatsAppService';
import { messageBuilder } from '../services/whatsapp/MessageBuilder';
import { quotationRequestService } from '../services/quotation';
import { prisma } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { WhatsAppJobData } from '../types';

async function processWhatsAppJob(data: WhatsAppJobData): Promise<void> {
  const { conversationId, customerId, phoneNumber, messageType, payload } = data;

  // Ensure a conversation exists (it may have been created by Telenow without a WA conversation)
  let convId = conversationId;
  if (!convId) {
    const conv = await prisma.conversation.findFirst({
      where: { customerId, channel: 'whatsapp', status: 'active' },
    });
    if (!conv) {
      const created = await prisma.conversation.create({
        data: {
          customerId,
          channel: 'whatsapp',
          source: 'meta',
          status: 'active',
          startedAt: new Date(),
        },
      });
      convId = created.id;
    } else {
      convId = conv.id;
    }
  }

  switch (messageType) {
    case 'quotation_ready': {
      const { quotationRequestId, quotationCount } = payload as {
        quotationRequestId: string;
        quotationCount: number;
      };

      // Send summary message with action buttons
      const msg = messageBuilder.quotationReady(Number(quotationCount));
      await whatsAppService.sendMessage(convId, customerId, phoneNumber, msg);

      // Send individual quotation documents
      const req = await quotationRequestService.findById(quotationRequestId);
      if (req) {
        for (const q of req.quotations) {
          for (const doc of q.documents) {
            if (doc.storageUrl && doc.status === 'ready') {
              await whatsAppService.sendDocument(
                convId,
                customerId,
                phoneNumber,
                doc.storageUrl,
                doc.fileName,
                `${q.insurerName} — ${q.planName} — ₹${q.premium.toNumber().toLocaleString('en-IN')}/yr`,
              );
            }
          }
        }
      }

      break;
    }

    case 'text': {
      await whatsAppService.sendText(convId, customerId, phoneNumber, payload['body'] as string);
      break;
    }

    default:
      logger.warn('Unknown WhatsApp job message type', { messageType });
  }
}

export function createWhatsAppWorker() {
  return new Worker(
    'whatsapp_jobs',
    async (job) => {
      logger.info('WhatsApp job started', { job_id: job.id, type: job.data?.messageType });
      await processWhatsAppJob(job.data as WhatsAppJobData);
    },
    {
      connection: redisConnection,
      concurrency: config.workers.whatsappConcurrency,
    },
  );
}
