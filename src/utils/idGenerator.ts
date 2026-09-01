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
  conversationStep: () => generateId('STEP-'),
  conversationEvent: () => generateId('CEVT-'),
  message: () => generateId('MSG-'),
  document: () => generateId('DOC-'),
  customer: () => generateId('CUST-'),
  advisor: () => generateId('ADV-'),
  event: () => generateId('EVT-'),
  webhookEvent: () => generateId('WHE-'),
  whatsappSession: () => generateId('WAS-'),
  flowDefinition: () => generateId('FLOW-'),
  outboundMessageJob: () => generateId('OMJ-'),
  insurancePolicy: () => generateId('IPOL-'),
  idempotency: (provider: string, externalId: string) => `${provider}:${externalId}`,
};
