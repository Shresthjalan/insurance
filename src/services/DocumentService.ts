import { prisma } from '../db';
import { logger } from '../utils/logger';
import type { DocumentType } from '../types';

export interface StoreDocumentInput {
  quotationId?: string;
  customerId: string;
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  storageProvider: string;
  storageKey: string;
  storageUrl?: string;
}

export class DocumentService {
  async store(input: StoreDocumentInput) {
    const doc = await prisma.document.create({
      data: {
        quotationId: input.quotationId ?? null,
        customerId: input.customerId,
        documentType: input.documentType,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageProvider: input.storageProvider,
        storageKey: input.storageKey,
        storageUrl: input.storageUrl ?? null,
        status: 'ready',
      },
    });

    logger.info('Document stored', { document_id: doc.id, customer_id: input.customerId });
    return doc;
  }

  async markReady(documentId: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: { status: 'ready' },
    });
  }

  async getForQuotation(quotationId: string) {
    return prisma.document.findMany({
      where: { quotationId, status: 'ready' },
    });
  }

  async getForCustomer(customerId: string) {
    return prisma.document.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const documentService = new DocumentService();
