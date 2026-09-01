import axios, { AxiosInstance } from 'axios';
import type { InsuranceType, QuoteResult } from '../../types';
import type { QuotationProvider, QuotationProviderRequest } from './QuotationProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ProviderError } from '../../utils/errors';

export class ProviderBAdapter implements QuotationProvider {
  readonly name = 'provider_b';
  readonly supportedTypes: InsuranceType[] = ['health', 'term', 'life'];

  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.providers.b.apiUrl,
      headers: { Authorization: `Bearer ${config.providers.b.apiKey}` },
      timeout: 30_000,
    });
  }

  async generateQuote(req: QuotationProviderRequest): Promise<QuoteResult[]> {
    try {
      const { data } = await this.http.post('/v2/quotations', {
        type: req.insuranceType,
        payload: req.normalizedPayload,
        ext_ref: req.requestId,
      });

      return (data?.results ?? []).map((q: Record<string, unknown>) => ({
        providerQuoteId: String(q.id),
        insurerName: String(q.company),
        planName: String(q.product),
        premium: Number(q.annual_premium),
        sumAssured: q.cover_amount ? Number(q.cover_amount) : undefined,
        policyTerm: q.term ? Number(q.term) : undefined,
        validUntil: q.expiry ? new Date(q.expiry as string) : undefined,
        documentUrl: q.brochure_url as string | undefined,
        rawResponse: q,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Provider B quote failed', { requestId: req.requestId, error: msg });
      throw new ProviderError(`Provider B: ${msg}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.http.get('/ping');
      return true;
    } catch {
      return false;
    }
  }
}
