import { Worker } from 'bullmq';
import { redisConnection, whatsappQueue } from './queues';
import { documentService } from '../services/DocumentService';
import { quotationRequestService } from '../services/quotation';
import { prisma } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { DocumentJobData } from '../types';

async function processDocument(data: DocumentJobData): Promise<void> {
  const { quotationId, customerId, insuranceType } = data;

  // In production: generate PDF from quotation data, upload to S3/MinIO
  // This is a placeholder that simulates the operation
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) {
    logger.warn('Quotation not found for document generation', { quotation_id: quotationId });
    return;
  }

  // Simulate PDF generation
  const storageKey = `quotations/${customerId}/${quotationId}/quote.pdf`;
  const storageUrl = `${process.env.STORAGE_ENDPOINT ?? 'https://storage.example.com'}/${storageKey}`;

  const doc = await documentService.store({
    quotationId,
    customerId,
    documentType: 'quotation_pdf',
    fileName: `quote-${quotation.insurerName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
    mimeType: 'application/pdf',
    storageProvider: config.storage.provider,
    storageKey,
    storageUrl,
  });

  logger.info('Document stored', {
    document_id: doc.id,
    quotation_id: quotationId,
    customer_id: customerId,
  });

  // Check if all documents for this request are ready, then queue WhatsApp delivery
  const request = await prisma.quotationRequest.findFirst({
    where: { quotations: { some: { id: quotationId } } },
    include: { quotations: { include: { documents: true } } },
  });

  if (!request) return;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer?.normalizedPhoneNumber) return;

  const allDone = request.quotations.every((q) => q.documents.length > 0);
  if (allDone) {
    await whatsappQueue.add('send_quotation_result', {
      conversationId: request.conversationId,
      customerId,
      phoneNumber: customer.normalizedPhoneNumber,
      messageType: 'quotation_ready',
      payload: {
        quotationRequestId: request.id,
        quotationCount: request.quotations.length,
      },
    });
  }
}

export function createDocumentWorker() {
  return new Worker(
    'document_jobs',
    async (job) => {
      logger.info('Document job started', { job_id: job.id });
      await processDocument(job.data as DocumentJobData);
    },
    {
      connection: redisConnection,
      concurrency: config.workers.documentConcurrency,
    },
  );
}
