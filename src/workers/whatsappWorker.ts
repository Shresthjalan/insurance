import { Worker } from 'bullmq';
import { redisConnection } from './queues';
import { whatsAppService } from '../services/whatsapp/WhatsAppService';
import { messageBuilder } from '../services/whatsapp/MessageBuilder';

import { supabase, unwrap } from '../db';
import { Id } from '../utils/idGenerator';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { WhatsAppJobData, Conversation } from '../types';

import fs from 'fs';
import path from 'path';
import { quotationRequestService } from '../services/quotation';
import { generateQuotationPdf } from '../services/pdf/QuotationPdfGenerator';

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
        quotationRequestId?: string;
        quotationCount: number;
      };

      const count = Number(quotationCount ?? 1);
      // 1. Send greeting text with no buttons
      const greeting = messageBuilder.quotationReadyGreeting(count);
      await whatsAppService.sendText(convId, customerId, phoneNumber, greeting);

      // 2. Fetch and send PDFs immediately
      let req = quotationRequestId
        ? await quotationRequestService.findById(quotationRequestId)
        : null;
      if (!req) {
        const list = await quotationRequestService.findForCustomer(customerId);
        req = list[0] ?? null;
      }

      if (req && req.quotations && req.quotations.length > 0) {
        const pdfDir = path.resolve(process.cwd(), 'uploads', 'pdfs');
        for (const q of req.quotations) {
          const fileName = `quote_${q.id}_${q.insuranceType}.pdf`;
          const filePath = path.join(pdfDir, fileName);

          if (!fs.existsSync(filePath)) {
            await generateQuotationPdf(q, req.normalizedPayload);
          }

          const pdfUrl = `${config.app.publicBaseUrl}/pdfs/${fileName}`;
          await whatsAppService.sendDocument(
            convId,
            customerId,
            phoneNumber,
            pdfUrl,
            fileName,
            `${q.insurerName} — ${q.insuranceType.toUpperCase()} Insurance Quote`,
            filePath,
          );
        }
      }

      // 3. Immediately send option to talk to advisor
      const advisorMsg = messageBuilder.talkToAdvisor();
      await whatsAppService.sendMessage(convId, customerId, phoneNumber, advisorMsg);
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
