import axios, { AxiosInstance } from 'axios';
import type { InsuranceType, QuoteResult } from '../../types';
import type { QuotationProvider, QuotationProviderRequest } from './QuotationProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ProviderError } from '../../utils/errors';

export class ProviderAAdapter implements QuotationProvider {
  readonly name = 'provider_a';
  readonly supportedTypes: InsuranceType[] = ['car', 'health', 'term'];

  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.providers.a.apiUrl,
      headers: { 'X-API-Key': config.providers.a.apiKey },
      timeout: 30_000,
    });
  }

  async generateQuote(req: QuotationProviderRequest): Promise<QuoteResult[]> {
    try {
      const { data } = await this.http.post('/quotes', {
        insurance_type: req.insuranceType,
        details: req.normalizedPayload,
        reference: req.requestId,
      });

      return (data?.quotes ?? []).map((q: Record<string, unknown>) => ({
        providerQuoteId: String(q.quote_id),
        insurerName: String(q.insurer_name),
        planName: String(q.plan_name),
        premium: Number(q.premium),
        sumAssured: q.sum_assured ? Number(q.sum_assured) : undefined,
        policyTerm: q.policy_term ? Number(q.policy_term) : undefined,
        validUntil: q.valid_until ? new Date(q.valid_until as string) : undefined,
        documentUrl: q.document_url as string | undefined,
        rawResponse: q,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Provider A quote failed', { requestId: req.requestId, error: msg });
      throw new ProviderError(`Provider A: ${msg}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.http.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}
