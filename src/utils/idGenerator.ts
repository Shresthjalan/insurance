import { ulid } from 'ulid';

export function generateId(prefix?: string): string {
  const id = ulid();
  return prefix ? `${prefix}${id}` : id;
}

export const Id = {
  request: () => generateId('REQ-'),
  lead: () => generateId('LEAD-'),
  interest: () => generateId('INT-'),
  quotationRequest: () => generateId('QTREQ-'),
  quotation: () => generateId('QT-'),
  appointment: () => generateId('APPT-'),
  conversation: () => generateId('CONV-'),
  message: () => generateId('MSG-'),
  document: () => generateId('DOC-'),
  customer: () => generateId('CUST-'),
  event: () => generateId('EVT-'),
  idempotency: (provider: string, externalId: string) => `${provider}:${externalId}`,
};
