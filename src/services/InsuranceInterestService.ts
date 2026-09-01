import { prisma } from '../db';
import { logger } from '../utils/logger';
import type { InsuranceInterest } from '@prisma/client';
import type { InsuranceType, LeadSource } from '../types';

export interface CreateInsuranceInterestInput {
  leadId: string;
  customerId: string;
  insuranceType: InsuranceType;
  source: LeadSource;
  conversationId?: string;
}

export class InsuranceInterestService {
  async findOrCreate(input: CreateInsuranceInterestInput): Promise<InsuranceInterest> {
    const existing = await prisma.insuranceInterest.findFirst({
      where: {
        customerId: input.customerId,
        insuranceType: input.insuranceType,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    const interest = await prisma.insuranceInterest.create({
      data: {
        leadId: input.leadId,
        customerId: input.customerId,
        insuranceType: input.insuranceType,
        source: input.source,
        conversationId: input.conversationId ?? null,
        status: 'active',
      },
    });

    logger.info('Insurance interest created', {
      interest_id: interest.id,
      customer_id: input.customerId,
      insurance_type: input.insuranceType,
    });

    return interest;
  }

  async findById(id: string): Promise<InsuranceInterest | null> {
    return prisma.insuranceInterest.findUnique({ where: { id } });
  }

  async findActiveForCustomer(customerId: string, insuranceType?: InsuranceType) {
    return prisma.insuranceInterest.findFirst({
      where: {
        customerId,
        status: 'active',
        ...(insuranceType && { insuranceType }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const insuranceInterestService = new InsuranceInterestService();
