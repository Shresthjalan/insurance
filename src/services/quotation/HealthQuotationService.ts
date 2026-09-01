import { z } from 'zod';
import type { HealthQuotationDetails, QuoteResult } from '../../types';
import type { QuotationProvider } from '../../providers/quotation/QuotationProvider';
import { ValidationError } from '../../utils/errors';

const memberSchema = z.object({
  relationship: z.string(),
  age: z.number().int().min(0).max(99),
  gender: z.enum(['male', 'female', 'other']),
});

const healthSchema = z.object({
  policy_type: z.enum(['individual', 'family']),
  members: z.array(memberSchema).min(1),
  city: z.string().min(1),
  sum_insured: z.number().positive(),
  policy_tenure: z.number().int().min(1).max(3),
  pre_existing_disease: z.boolean(),
  pre_existing_disease_details: z.string().nullable().optional(),
});

export class HealthQuotationService {
  constructor(private readonly providers: QuotationProvider[]) {}

  validate(raw: unknown): HealthQuotationDetails {
    const result = healthSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new ValidationError(issue.message, issue.path.join('.'));
    }
    return result.data as HealthQuotationDetails;
  }

  normalize(details: HealthQuotationDetails): Record<string, unknown> {
    return {
      policy_type: details.policy_type,
      members: details.members,
      member_count: details.members.length,
      city: details.city,
      sum_insured: details.sum_insured,
      policy_tenure: details.policy_tenure,
      pre_existing_disease: details.pre_existing_disease,
      pre_existing_disease_details: details.pre_existing_disease_details ?? null,
      youngest_member_age: Math.min(...details.members.map((m) => m.age)),
      oldest_member_age: Math.max(...details.members.map((m) => m.age)),
    };
  }

  async fetchQuotes(requestId: string, normalized: Record<string, unknown>): Promise<QuoteResult[]> {
    const eligible = this.providers.filter((p) => p.supportedTypes.includes('health'));
    const results = await Promise.allSettled(
      eligible.map((p) =>
        p.generateQuote({ insuranceType: 'health', normalizedPayload: normalized, requestId })
          .then((quotes) => quotes.map((q) => ({ ...q, rawResponse: { ...q.rawResponse, _provider: p.name } })))
      ),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<QuoteResult[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }
}
