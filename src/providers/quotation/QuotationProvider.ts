import type { InsuranceType, QuoteResult } from '../../types';

export interface QuotationProviderRequest {
  insuranceType: InsuranceType;
  normalizedPayload: Record<string, unknown>;
  requestId: string;
}

export interface QuotationProvider {
  readonly name: string;
  readonly supportedTypes: InsuranceType[];
  generateQuote(req: QuotationProviderRequest): Promise<QuoteResult[]>;
  isHealthy(): Promise<boolean>;
}
