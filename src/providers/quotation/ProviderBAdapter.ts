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

  private stubQuotes(req: QuotationProviderRequest): QuoteResult[] {
    const validity = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const stubs: Record<string, QuoteResult[]> = {
      health: [
        {
          providerQuoteId: 'PB-HLTH-001',
          insurerName: 'Beta Health Assurance',
          planName: 'Family Floater Basic',
          premium: 11200,
          sumAssured: 300000,
          policyTerm: 1,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
        {
          providerQuoteId: 'PB-HLTH-002',
          insurerName: 'Beta Health Assurance',
          planName: 'Family Floater Plus',
          premium: 22000,
          sumAssured: 1000000,
          policyTerm: 1,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
      ],
      term: [
        {
          providerQuoteId: 'PB-TERM-001',
          insurerName: 'Beta Life Insurance',
          planName: 'Term Sure 20',
          premium: 6800,
          sumAssured: 5000000,
          policyTerm: 20,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
        {
          providerQuoteId: 'PB-TERM-002',
          insurerName: 'Beta Life Insurance',
          planName: 'Term Sure 30',
          premium: 9100,
          sumAssured: 5000000,
          policyTerm: 30,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
      ],
      life: [
        {
          providerQuoteId: 'PB-LIFE-001',
          insurerName: 'Beta Life Insurance',
          planName: 'Endowment Growth Plan',
          premium: 35000,
          sumAssured: 1000000,
          policyTerm: 15,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
        {
          providerQuoteId: 'PB-LIFE-002',
          insurerName: 'Beta Life Insurance',
          planName: 'Whole Life Secure',
          premium: 48000,
          sumAssured: 2000000,
          policyTerm: 20,
          validUntil: validity,
          rawResponse: { _provider: this.name, _stub: true },
        },
      ],
    };
    return stubs[req.insuranceType] ?? [];
  }

  async generateQuote(req: QuotationProviderRequest): Promise<QuoteResult[]> {
    if (!config.providers.b.apiKey) {
      logger.warn('Provider B: no API key configured, returning stub quotes', { requestId: req.requestId });
      return this.stubQuotes(req);
    }

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
    if (!config.providers.b.apiKey) return true;
    try {
      await this.http.get('/ping');
      return true;
    } catch {
      return false;
    }
  }
}
