import { prisma } from '../db';
import { logger } from '../utils/logger';
import type { Lead } from '@prisma/client';
import type { InsuranceType, LeadSource, LeadStatus } from '../types';

export interface FindOrCreateLeadInput {
  customerId: string;
  source: LeadSource;
  primaryInsuranceType?: InsuranceType;
}

export class LeadService {
  async findOrCreate(input: FindOrCreateLeadInput): Promise<Lead> {
    // Re-use an open lead for the same customer and insurance type
    const existing = await prisma.lead.findFirst({
      where: {
        customerId: input.customerId,
        status: { notIn: ['converted', 'closed', 'lost'] },
        ...(input.primaryInsuranceType && { primaryInsuranceType: input.primaryInsuranceType }),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    const lead = await prisma.lead.create({
      data: {
        customerId: input.customerId,
        source: input.source,
        primaryInsuranceType: input.primaryInsuranceType ?? null,
        status: 'new',
      },
    });

    logger.info('Lead created', { lead_id: lead.id, customer_id: input.customerId });
    return lead;
  }

  async updateStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    return prisma.lead.update({ where: { id: leadId }, data: { status } });
  }

  async findById(id: string): Promise<Lead | null> {
    return prisma.lead.findUnique({ where: { id } });
  }

  async list(filters: { status?: LeadStatus; source?: LeadSource } = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.source && { source: filters.source }),
    };
    const [items, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.lead.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}

export const leadService = new LeadService();
