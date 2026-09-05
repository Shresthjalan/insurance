// ─────────────────────────────────────────────
// ENUMS & DOMAIN TYPES
// ─────────────────────────────────────────────

export type InsuranceType = 'car' | 'health' | 'term' | 'life';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'quotation_requested'
  | 'quotation_generated'
  | 'advisor_requested'
  | 'advisor_assigned'
  | 'converted'
  | 'closed'
  | 'lost';

export type LeadSource = 'telenow' | 'whatsapp' | 'web' | 'admin';

export type QuotationRequestStatus =
  | 'received'
  | 'validating'
  | 'queued'
  | 'processing'
  | 'generated'
  | 'partially_generated'
  | 'failed'
  | 'cancelled';

export type AppointmentStatus =
  | 'requested'
  | 'pending_confirmation'
  | 'confirmed'
  | 'assigned'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'failed';

export type AppointmentSource = 'telenow' | 'whatsapp' | 'web' | 'admin';

export type Channel = 'voice' | 'whatsapp' | 'web' | 'admin';

export type MessageSource = 'telenow' | 'meta' | 'web' | 'crm';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageType =
  | 'text'
  | 'document'
  | 'image'
  | 'audio'
  | 'button'
  | 'list'
  | 'interactive'
  | 'template'
  | 'reaction'
  | 'status';

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export type InterestStatus = 'active' | 'completed' | 'cancelled';

export type PlanType = 'individual' | 'family';

export type ConversationStatus = 'active' | 'idle' | 'completed' | 'expired';

export type StepStatus = 'pending' | 'active' | 'answered' | 'skipped';

// ─────────────────────────────────────────────
// CONVERSATION FLOW TYPES
// ─────────────────────────────────────────────

export type StepType =
  | 'button'
  | 'list'
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'phone'
  | 'confirmation'
  | 'form'
  | 'info'; // send-only step, no input expected

export interface StepOption {
  id: string;
  title: string;
  description?: string;
}

export interface ConditionalRule {
  if: { stepKey: string; equals: string | string[] };
  goto: string;
}

export interface FlowStep {
  key: string;
  type: StepType;
  question: string;
  options?: StepOption[];
  validation?: StepValidation;
  rules?: ConditionalRule[];
  next?: string;
  skipIf?: { stepKey: string; equals: string | string[] };
}

export interface StepValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  format?: 'date' | 'time' | 'phone' | 'registration' | 'numeric';
}

export interface FlowDefinition {
  flow: string;
  version: number;
  steps: FlowStep[];
  initialStep: string;
}

export interface ConversationContext {
  insuranceType?: InsuranceType;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────
// QUOTATION PAYLOADS
// ─────────────────────────────────────────────

export interface CarQuotationDetails {
  car_status: 'new' | 'existing';
  vehicle_registration_number?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_variant?: string;
  fuel_type?: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  registration_year?: number;
  rto?: string;
  policy_new_or_renewal?: 'new' | 'renewal';
  previous_claim?: boolean;
  ncb_percentage?: number;
}

export interface HealthMember {
  relationship: string;
  age: number;
  gender: 'male' | 'female' | 'other';
}

export interface HealthQuotationDetails {
  policy_type: 'individual' | 'family';
  members: HealthMember[];
  city: string;
  sum_insured: number;
  policy_tenure: number;
  pre_existing_disease: boolean;
  pre_existing_disease_details?: string | null;
}

export interface TermQuotationDetails {
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  annual_income: number;
  occupation: string;
  smoking_tobacco_status: 'smoker' | 'non_smoker';
  desired_sum_assured: number;
  policy_term: number;
}

export interface LifeQuotationDetails {
  product_objective: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  annual_income: number;
  smoking_tobacco_status: 'smoker' | 'non_smoker';
  desired_sum_assured: number;
  policy_term: number;
  premium_payment_term: number;
  premium_payment_frequency: 'yearly' | 'half_yearly' | 'quarterly' | 'monthly';
}

export type QuotationDetails =
  | CarQuotationDetails
  | HealthQuotationDetails
  | TermQuotationDetails
  | LifeQuotationDetails;

// ─────────────────────────────────────────────
// API REQUEST / RESPONSE
// ─────────────────────────────────────────────

export interface ApiSuccessResponse<T = Record<string, unknown>> {
  success: true;
  request_id: string;
  data?: T;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  request_id: string;
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export type ApiResponse<T = Record<string, unknown>> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─────────────────────────────────────────────
// TELENOW WEBHOOK PAYLOADS
// ─────────────────────────────────────────────

export interface TelenowInterestPayload {
  phone_number: string;
  customer_name: string;
  insurance_type: InsuranceType;
  external_event_id?: string;
}

export interface TelenowQuotationPayload {
  phone_number: string;
  customer_name: string;
  insurance_type: InsuranceType;
  quotation_details: QuotationDetails;
  external_event_id?: string;
}

export interface TelenowAdvisorPayload {
  phone_number: string;
  customer_name: string;
  insurance_type: InsuranceType;
  meeting_requested: boolean;
  meeting_date: string;
  meeting_time: string;
  timezone: string;
  notes?: string;
  external_event_id?: string;
}

// ─────────────────────────────────────────────
// QUOTATION PROVIDER
// ─────────────────────────────────────────────

export interface QuoteResult {
  providerQuoteId: string;
  insurerName: string;
  planName: string;
  premium: number;
  sumAssured?: number;
  policyTerm?: number;
  validUntil?: Date;
  documentUrl?: string;
  rawResponse: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// WHATSAPP
// ─────────────────────────────────────────────

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

export interface WhatsAppInboundMessage {
  messageId: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { payload: string; text: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
    nfm_reply?: { response_json: string };
  };
  document?: { id: string; filename?: string; mime_type?: string };
  image?: { id: string };
  audio?: { id: string };
}

export interface WhatsAppStatusUpdate {
  id: string;
  status: DeliveryStatus;
  timestamp: string;
  recipient_id: string;
}

// ─────────────────────────────────────────────
// DATABASE ROW TYPES
// (hand-written — previously generated by Prisma; columns are camelCase
// exactly as stored in Postgres, timestamps come back as ISO strings)
// ─────────────────────────────────────────────

export interface Customer {
  id: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  name: string | null;
  preferredLanguage: string | null;
  countryCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
}

export interface Lead {
  id: string;
  customerId: string;
  source: string;
  status: string;
  primaryInsuranceType: string | null;
  assignedAdvisorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceInterest {
  id: string;
  leadId: string;
  customerId: string;
  insuranceType: string;
  source: string;
  conversationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  channel: string;
  source: string;
  status: string;
  language: string | null;
  currentFlow: string | null;
  currentState: string | null;
  expectedInputType: string | null;
  expectedInputIds: unknown;
  contextJson: Record<string, unknown> | null;
  lastUiMessageId: string | null;
  lastMessageAt: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationStep {
  id: string;
  conversationId: string;
  flowName: string;
  flowVersion: number;
  stepKey: string;
  stepType: string;
  status: string;
  questionPayload: unknown;
  expectedInput: unknown;
  answerValue: string | null;
  answerNormalized: unknown;
  startedAt: string | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  customerId: string;
  channel: string;
  direction: string;
  messageType: string;
  textBody: string | null;
  mediaUrl: string | null;
  documentId: string | null;
  providerMessageId: string | null;
  providerStatus: string | null;
  replyToMessageId: string | null;
  interactiveType: string | null;
  interactiveId: string | null;
  rawPayloadReference: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface QuotationRequest {
  id: string;
  customerId: string;
  leadId: string | null;
  insuranceInterestId: string | null;
  conversationId: string | null;
  insuranceType: string;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
  status: string;
  provider: string | null;
  providerRequestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestedAt: string;
  processingStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  quotations?: Quotation[];
}

export interface Quotation {
  id: string;
  quotationRequestId: string;
  customerId: string;
  insuranceType: string;
  provider: string;
  providerQuoteId: string | null;
  insurerName: string;
  planName: string;
  premium: number;
  sumAssured: number | null;
  policyTerm: number | null;
  status: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisorAppointment {
  id: string;
  customerId: string;
  leadId: string | null;
  insuranceInterestId: string | null;
  conversationId: string | null;
  advisorId: string | null;
  requestedDate: string;
  requestedTime: string;
  timezone: string;
  status: string;
  source: string;
  notes: string | null;
  confirmedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  externalEventId: string | null;
  requestId: string | null;
  idempotencyKey: string | null;
  payloadHash: string | null;
  payload: Record<string, unknown>;
  processingStatus: string;
  attemptCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
  createdAt: string;
}

export interface InsurancePolicy {
  id: string;
  insuranceType: InsuranceType;
  planType: PlanType;
  amount: number;
  membersCount: number | null;
  customerName: string | null;
  phoneNumber: string | null;
  customerId: string | null;
  status: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// QUEUE JOB DATA
// ─────────────────────────────────────────────

export interface QuotationJobData {
  quotationRequestId: string;
  customerId: string;
  insuranceType: InsuranceType;
  normalizedPayload: Record<string, unknown>;
}

export type WhatsAppJobMessageType = 'text' | 'quotation_ready' | 'document';

export interface WhatsAppJobData {
  conversationId: string;
  customerId: string;
  phoneNumber: string;
  messageType: WhatsAppJobMessageType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface NotificationJobData {
  customerId: string;
  eventType: string;
  channel: Channel;
  payload: Record<string, unknown>;
}
