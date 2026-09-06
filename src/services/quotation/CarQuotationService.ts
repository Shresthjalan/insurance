import { z } from 'zod';
import type { CarQuotationDetails, QuoteResult } from '../../types';
import type { QuotationProvider } from '../../providers/quotation/QuotationProvider';
import { ValidationError } from '../../utils/errors';

const carSchema = z.object({
  car_status: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower.includes('exist')) return 'existing';
      if (lower.includes('new')) return 'new';
    }
    return val;
  }, z.enum(['new', 'existing'])),
  vehicle_registration_number: z.string().optional(),
  vehicle_make: z.string().min(1),
  vehicle_model: z.string().min(1),
  vehicle_variant: z.string().optional(),
  fuel_type: z.preprocess((val) => {
    if (typeof val === 'string') return val.toLowerCase();
    return val;
  }, z.enum(['petrol', 'diesel', 'cng', 'electric', 'hybrid']).optional()),
  registration_year: z.preprocess((val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return val;
  }, z.number().int().min(1990).max(new Date().getFullYear() + 1).optional()),
  rto: z.string().optional(),
  policy_new_or_renewal: z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower.includes('renew')) return 'renewal';
      if (lower.includes('new')) return 'new';
    }
    return val;
  }, z.enum(['new', 'renewal']).optional()),
  previous_claim: z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
    }
    return val;
  }, z.boolean().optional()),
  ncb_percentage: z.preprocess((val) => {
    if (typeof val === 'string') return parseFloat(val);
    return val;
  }, z.number().min(0).max(50).optional()),
});

export class CarQuotationService {
  constructor(private readonly providers: QuotationProvider[]) {}

  validate(raw: unknown): CarQuotationDetails {
    const result = carSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new ValidationError(issue.message, issue.path.join('.'));
    }
    return result.data as CarQuotationDetails;
  }

  normalize(details: CarQuotationDetails): Record<string, unknown> {
    return {
      car_status: details.car_status,
      vehicle_registration_number: details.vehicle_registration_number?.toUpperCase() ?? null,
      vehicle_make: details.vehicle_make,
      vehicle_model: details.vehicle_model,
      vehicle_variant: details.vehicle_variant ?? null,
      fuel_type: details.fuel_type ?? 'petrol',
      registration_year: details.registration_year ?? null,
      rto: details.rto ?? null,
      policy_new_or_renewal: details.policy_new_or_renewal ?? 'new',
      previous_claim: details.previous_claim ?? false,
      ncb_percentage: details.previous_claim === false ? (details.ncb_percentage ?? 0) : 0,
    };
  }

  async fetchQuotes(requestId: string, normalized: Record<string, unknown>): Promise<QuoteResult[]> {
    const eligible = this.providers.filter((p) => p.supportedTypes.includes('car'));
    const results = await Promise.allSettled(
      eligible.map((p) =>
        p.generateQuote({ insuranceType: 'car', normalizedPayload: normalized, requestId })
          .then((quotes): QuoteResult[] => quotes.map((q) => ({ ...q, rawResponse: { ...q.rawResponse, _provider: p.name } })))
      ),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<QuoteResult[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }
}
