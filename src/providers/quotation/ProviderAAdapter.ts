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

  private stubQuotes(req: QuotationProviderRequest): QuoteResult[] {
    const validity = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const stubs: Record<string, QuoteResult[]> = {
      car: [
        {
          providerQuoteId: 'PA-CAR-001',
          insurerName: 'Acme General Insurance',
          planName: 'Comprehensive Cover',
          premium: 12500,
          sumAssured: 800000,
          policyTerm: 1,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
        {
          providerQuoteId: 'PA-CAR-002',
          insurerName: 'Acme General Insurance',
          planName: 'Third-Party Only',
          premium: 4200,
          sumAssured: 500000,
          policyTerm: 1,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
      ],
      health: [
        {
          providerQuoteId: 'PA-HLTH-001',
          insurerName: 'Acme Health Ltd',
          planName: 'Silver Health Shield',
          premium: 9800,
          sumAssured: 300000,
          policyTerm: 1,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
        {
          providerQuoteId: 'PA-HLTH-002',
          insurerName: 'Acme Health Ltd',
          planName: 'Gold Health Shield',
          premium: 18500,
          sumAssured: 500000,
          policyTerm: 1,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
      ],
      term: [
        {
          providerQuoteId: 'PA-TERM-001',
          insurerName: 'Acme Life Insurance',
          planName: 'Pure Term Protect',
          premium: 7200,
          sumAssured: 5000000,
          policyTerm: 20,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
      ],
    };
    return stubs[req.insuranceType] ?? [];
  }

  async generateQuote(req: QuotationProviderRequest): Promise<QuoteResult[]> {
    if (!config.providers.a.apiKey) {
      logger.warn('Provider A: no API key configured, returning stub quotes', { requestId: req.requestId });
      return this.stubQuotes(req);
    }

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
    if (!config.providers.a.apiKey) return true;
    try {
      await this.http.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}
