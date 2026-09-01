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

export type DocumentType =
  | 'quotation_pdf'
  | 'comparison_pdf'
  | 'policy_document'
  | 'proposal_document'
  | 'other';

export type InterestStatus = 'active' | 'completed' | 'cancelled';

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
// QUEUE JOB DATA
// ─────────────────────────────────────────────

export interface QuotationJobData {
  quotationRequestId: string;
  customerId: string;
  insuranceType: InsuranceType;
  normalizedPayload: Record<string, unknown>;
}

export interface DocumentJobData {
  quotationId: string;
  customerId: string;
  insuranceType: InsuranceType;
}

export interface WhatsAppJobData {
  conversationId: string;
  customerId: string;
  phoneNumber: string;
  messageType: MessageType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface NotificationJobData {
  customerId: string;
  eventType: string;
  channel: Channel;
  payload: Record<string, unknown>;
}
