import { Worker } from 'bullmq';
import { redisConnection, whatsappQueue } from './queues';
import { quotationRequestService } from '../services/quotation';
import { CarQuotationService } from '../services/quotation/CarQuotationService';
import { HealthQuotationService } from '../services/quotation/HealthQuotationService';
import { TermQuotationService } from '../services/quotation/TermQuotationService';
import { LifeQuotationService } from '../services/quotation/LifeQuotationService';
import { ProviderAAdapter } from '../providers/quotation/ProviderAAdapter';
import { ProviderBAdapter } from '../providers/quotation/ProviderBAdapter';
import { leadService } from '../services/LeadService';
import { customerService } from '../services/CustomerService';
import { generateAllQuotationPdfs } from '../services/pdf/QuotationPdfGenerator';
import { dashboardBus } from '../events/DashboardEventBus';
import { config } from '../config';
import { logger } from '../utils/logger';
import { isTransientError } from '../utils/errors';
import type { QuotationJobData, InsuranceType } from '../types';

const providers = [new ProviderAAdapter(), new ProviderBAdapter()];

const carService = new CarQuotationService(providers);
const healthService = new HealthQuotationService(providers);
const termService = new TermQuotationService(providers);
const lifeService = new LifeQuotationService(providers);

async function processQuotation(data: QuotationJobData): Promise<void> {
  const { quotationRequestId, customerId, insuranceType, normalizedPayload } = data;

  await quotationRequestService.updateStatus(quotationRequestId, 'processing');

  let quotes;
  try {
    switch (insuranceType as InsuranceType) {
      case 'car':
        quotes = await carService.fetchQuotes(quotationRequestId, normalizedPayload);
        break;
      case 'health':
        quotes = await healthService.fetchQuotes(quotationRequestId, normalizedPayload);
        break;
      case 'term':
        quotes = await termService.fetchQuotes(quotationRequestId, normalizedPayload);
        break;
      case 'life':
        quotes = await lifeService.fetchQuotes(quotationRequestId, normalizedPayload);
        break;
      default:
        throw new Error(`Unsupported insurance type: ${insuranceType}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await quotationRequestService.updateStatus(quotationRequestId, 'failed', {
      errorCode: 'PROVIDER_ERROR',
      errorMessage: msg,
    });
    if (!isTransientError(err)) throw err; // Non-transient: don't retry
    throw err;
  }

  if (!quotes || quotes.length === 0) {
    await quotationRequestService.updateStatus(quotationRequestId, 'failed', {
      errorCode: 'NO_QUOTES',
      errorMessage: 'No quotations returned by providers',
    });
    return;
  }

  const saved = await quotationRequestService.saveQuotations(
    quotationRequestId,
    customerId,
    insuranceType,
    quotes,
  );

  await quotationRequestService.updateStatus(
    quotationRequestId,
    saved.length === quotes.length ? 'generated' : 'partially_generated',
  );

  // Update lead status
  const request = await quotationRequestService.findById(quotationRequestId);
  if (request?.leadId) {
    await leadService.updateStatus(request.leadId, 'quotation_generated');
  }

  logger.info('Quotations generated', {
    request_id: quotationRequestId,
    customer_id: customerId,
    insurance_type: insuranceType,
    count: saved.length,
  });

  // Generate a PDF for each saved quotation
  const pdfs = await generateAllQuotationPdfs(saved, normalizedPayload);
  logger.info('PDFs generated', { request_id: quotationRequestId, count: pdfs.length });

  dashboardBus.publish('quotation_generated', {
    customerId,
    insuranceType,
    quotationRequestId,
    count: saved.length,
    pdfCount: pdfs.length,
  });

  // Notify the customer over WhatsApp
  const customer = await customerService.findById(customerId);
  if (customer?.normalizedPhoneNumber) {
    // Introductory message with quote count
    await whatsappQueue.add('quotation_intro', {
      conversationId: request?.conversationId ?? null,
      customerId,
      phoneNumber: customer.normalizedPhoneNumber,
      messageType: 'quotation_ready',
      payload: {
        quotationRequestId,
        quotationCount: saved.length,
      },
    });

    // One document message per PDF
    for (const pdf of pdfs) {
      const pdfUrl = `${config.app.publicBaseUrl}/pdfs/${pdf.fileName}`;
      await whatsappQueue.add('quotation_pdf', {
        conversationId: request?.conversationId ?? null,
        customerId,
        phoneNumber: customer.normalizedPhoneNumber,
        messageType: 'document',
        payload: {
          documentUrl: pdfUrl,
          filename: pdf.fileName,
          caption: `📄 ${pdf.insurerName} — ${insuranceType.toUpperCase()} Insurance Quote`,
        },
      });
    }
  }
}

export function createQuotationWorker() {
  return new Worker(
    'quotation_jobs',
    async (job) => {
      logger.info('Quotation job started', { job_id: job.id, data: job.data });
      await processQuotation(job.data as QuotationJobData);
    },
    {
      connection: redisConnection,
      concurrency: config.workers.quotationConcurrency,
    },
  );
}
