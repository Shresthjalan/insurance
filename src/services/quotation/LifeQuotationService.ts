import { z } from 'zod';
import type { LifeQuotationDetails, QuoteResult } from '../../types';
import type { QuotationProvider } from '../../providers/quotation/QuotationProvider';
import { ValidationError } from '../../utils/errors';

const lifeSchema = z.object({
  product_objective: z.string().min(1),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female', 'other']),
  annual_income: z.number().positive(),
  smoking_tobacco_status: z.enum(['smoker', 'non_smoker']),
  desired_sum_assured: z.number().positive(),
  policy_term: z.number().int().min(5).max(50),
  premium_payment_term: z.number().int().min(5).max(50),
  premium_payment_frequency: z.enum(['yearly', 'half_yearly', 'quarterly', 'monthly']),
});

export class LifeQuotationService {
  constructor(private readonly providers: QuotationProvider[]) {}

  validate(raw: unknown): LifeQuotationDetails {
    const result = lifeSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new ValidationError(issue.message, issue.path.join('.'));
    }
    return result.data as LifeQuotationDetails;
  }

  normalize(details: LifeQuotationDetails): Record<string, unknown> {
    const dob = new Date(details.date_of_birth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return {
      ...details,
      age,
      // Resolve "same" premium payment term to policy term
      premium_payment_term:
        String(details.premium_payment_term) === 'same'
          ? details.policy_term
          : details.premium_payment_term,
    };
  }

  async fetchQuotes(requestId: string, normalized: Record<string, unknown>): Promise<QuoteResult[]> {
    const eligible = this.providers.filter((p) => p.supportedTypes.includes('life'));
    const results = await Promise.allSettled(
      eligible.map((p) =>
        p.generateQuote({ insuranceType: 'life', normalizedPayload: normalized, requestId })
          .then((quotes) => quotes.map((q) => ({ ...q, rawResponse: { ...q.rawResponse, _provider: p.name } })))
      ),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<QuoteResult[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }
}
