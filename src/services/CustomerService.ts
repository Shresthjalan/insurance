import { prisma } from '../db';
import { normalizePhoneNumber, isValidPhoneNumber } from '../utils/phoneNormalizer';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { Customer } from '@prisma/client';

export interface FindOrCreateCustomerInput {
  phoneNumber: string;
  name?: string;
  language?: string;
  countryCode?: string;
}

export class CustomerService {
  async findOrCreate(input: FindOrCreateCustomerInput): Promise<Customer> {
    if (!isValidPhoneNumber(input.phoneNumber)) {
      throw new ValidationError(`Invalid phone number: ${input.phoneNumber}`, 'phone_number');
    }

    const normalized = normalizePhoneNumber(input.phoneNumber);

    const existing = await prisma.customer.findUnique({
      where: { normalizedPhoneNumber: normalized },
    });

    if (existing) {
      // Update name/language if newly provided
      if ((input.name && !existing.name) || (input.language && !existing.preferredLanguage)) {
        return prisma.customer.update({
          where: { id: existing.id },
          data: {
            ...(input.name && !existing.name && { name: input.name }),
            ...(input.language && !existing.preferredLanguage && { preferredLanguage: input.language }),
            lastContactAt: new Date(),
          },
        });
      }
      await prisma.customer.update({
        where: { id: existing.id },
        data: { lastContactAt: new Date() },
      });
      return existing;
    }

    const customer = await prisma.customer.create({
      data: {
        phoneNumber: input.phoneNumber,
        normalizedPhoneNumber: normalized,
        name: input.name ?? null,
        preferredLanguage: input.language ?? null,
        countryCode: input.countryCode ?? null,
        lastContactAt: new Date(),
      },
    });

    logger.info('Customer created', { customer_id: customer.id });
    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { id } });
  }

  async findByPhone(phoneNumber: string): Promise<Customer | null> {
    const normalized = normalizePhoneNumber(phoneNumber);
    return prisma.customer.findUnique({ where: { normalizedPhoneNumber: normalized } });
  }

  async list(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.customer.count(),
    ]);
    return { items, total, page, limit };
  }
}

export const customerService = new CustomerService();
