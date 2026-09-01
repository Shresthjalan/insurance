import { z } from 'zod';
import type { TermQuotationDetails, QuoteResult } from '../../types';
import type { QuotationProvider } from '../../providers/quotation/QuotationProvider';
import { ValidationError } from '../../utils/errors';

const termSchema = z.object({
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female', 'other']),
  annual_income: z.number().positive(),
  occupation: z.string().min(1),
  smoking_tobacco_status: z.enum(['smoker', 'non_smoker']),
  desired_sum_assured: z.number().positive(),
  policy_term: z.number().int().min(5).max(50),
});

export class TermQuotationService {
  constructor(private readonly providers: QuotationProvider[]) {}

  validate(raw: unknown): TermQuotationDetails {
    const result = termSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new ValidationError(issue.message, issue.path.join('.'));
    }
    return result.data as TermQuotationDetails;
  }

  normalize(details: TermQuotationDetails): Record<string, unknown> {
    const dob = new Date(details.date_of_birth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return {
      ...details,
      age,
    };
  }

  async fetchQuotes(requestId: string, normalized: Record<string, unknown>): Promise<QuoteResult[]> {
    const eligible = this.providers.filter((p) => p.supportedTypes.includes('term'));
    const results = await Promise.allSettled(
      eligible.map((p) =>
        p.generateQuote({ insuranceType: 'term', normalizedPayload: normalized, requestId })
          .then((quotes) => quotes.map((q) => ({ ...q, rawResponse: { ...q.rawResponse, _provider: p.name } })))
      ),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<QuoteResult[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }
}
