import { Worker } from 'bullmq';
import { redisConnection } from './queues';
import { whatsAppService } from '../services/whatsapp/WhatsAppService';
import { messageBuilder } from '../services/whatsapp/MessageBuilder';
import { quotationRequestService } from '../services/quotation';
import { supabase, unwrap } from '../db';
import { Id } from '../utils/idGenerator';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { WhatsAppJobData, Conversation } from '../types';

async function processWhatsAppJob(data: WhatsAppJobData): Promise<void> {
  const { conversationId, customerId, phoneNumber, messageType, payload } = data;

  // Ensure a conversation exists (it may have been created by Telenow without a WA conversation)
  let convId = conversationId;
  if (!convId) {
    const existing = unwrap<Conversation[]>(
      await supabase
        .from('conversations')
        .select('*')
        .eq('customerId', customerId)
        .eq('channel', 'whatsapp')
        .eq('status', 'active')
        .limit(1),
    );
    if (existing.length > 0) {
      convId = existing[0].id;
    } else {
      const created = unwrap<Conversation>(
        await supabase
          .from('conversations')
          .insert({
            id: Id.conversation(),
            customerId,
            channel: 'whatsapp',
            source: 'meta',
            status: 'active',
            startedAt: new Date().toISOString(),
          })
          .select()
          .single(),
      );
      convId = created.id;
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

      // Send a comparison list of the generated quotations
      const req = await quotationRequestService.findById(quotationRequestId);
      if (req?.quotations && req.quotations.length > 0) {
        const comparison = messageBuilder.quotationComparison(
          req.quotations.map((q) => ({
            id: q.id,
            title: q.planName,
            premium: q.premium,
            insurer: q.insurerName,
          })),
        );
        await whatsAppService.sendMessage(convId, customerId, phoneNumber, comparison);
      }

      break;
    }

    case 'text': {
      await whatsAppService.sendText(convId, customerId, phoneNumber, payload['body'] as string);
      break;
    }

    case 'document': {
      await whatsAppService.sendDocument(
        convId,
        customerId,
        phoneNumber,
        payload['documentUrl'] as string,
        (payload['filename'] as string | undefined) ?? 'quotation.pdf',
        payload['caption'] as string | undefined,
      );
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
