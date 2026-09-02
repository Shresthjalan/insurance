-- Insurance platform schema
-- Idempotent: safe to run multiple times (IF NOT EXISTS on every statement).
-- Column names stay camelCase (quoted) to match application code.

create extension if not exists pgcrypto;

-- Auto-update "updatedAt" trigger function
create or replace function set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

-- Helper macro: create trigger only if it doesn't exist yet
-- (Postgres has no CREATE TRIGGER IF NOT EXISTS, so we drop first)

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────

create table if not exists "customers" (
  "id"                    text primary key,
  "phoneNumber"           text not null,
  "normalizedPhoneNumber" text not null unique,
  "name"                  text,
  "preferredLanguage"     text,
  "countryCode"           text,
  "status"                text not null default 'active',
  "createdAt"             timestamptz not null default now(),
  "updatedAt"             timestamptz not null default now(),
  "lastContactAt"         timestamptz
);
drop trigger if exists set_updated_at on "customers";
create trigger set_updated_at before update on "customers"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- ADVISORS
-- ─────────────────────────────────────────────

create table if not exists "advisors" (
  "id"        text primary key,
  "name"      text not null,
  "phone"     text,
  "email"     text,
  "status"    text not null default 'active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
drop trigger if exists set_updated_at on "advisors";
create trigger set_updated_at before update on "advisors"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────

create table if not exists "leads" (
  "id"                   text primary key,
  "customerId"           text not null references "customers"("id"),
  "source"               text not null,
  "status"               text not null default 'new',
  "primaryInsuranceType" text,
  "assignedAdvisorId"    text references "advisors"("id"),
  "createdAt"            timestamptz not null default now(),
  "updatedAt"            timestamptz not null default now()
);
create index if not exists leads_customer_id_idx on "leads" ("customerId");
drop trigger if exists set_updated_at on "leads";
create trigger set_updated_at before update on "leads"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────

create table if not exists "conversations" (
  "id"                text primary key,
  "customerId"        text not null references "customers"("id"),
  "channel"           text not null,
  "source"            text not null,
  "status"            text not null default 'active',
  "language"          text,
  "currentFlow"       text,
  "currentState"      text,
  "expectedInputType" text,
  "expectedInputIds"  jsonb,
  "contextJson"       jsonb,
  "lastUiMessageId"   text,
  "lastMessageAt"     timestamptz,
  "startedAt"         timestamptz not null default now(),
  "endedAt"           timestamptz,
  "createdAt"         timestamptz not null default now(),
  "updatedAt"         timestamptz not null default now()
);
create index if not exists conversations_customer_id_idx on "conversations" ("customerId");
create index if not exists conversations_status_idx       on "conversations" ("status");
drop trigger if exists set_updated_at on "conversations";
create trigger set_updated_at before update on "conversations"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- INSURANCE INTERESTS
-- ─────────────────────────────────────────────

create table if not exists "insurance_interests" (
  "id"             text primary key,
  "leadId"         text not null references "leads"("id"),
  "customerId"     text not null references "customers"("id"),
  "insuranceType"  text not null,
  "source"         text not null,
  "conversationId" text references "conversations"("id"),
  "status"         text not null default 'active',
  "createdAt"      timestamptz not null default now(),
  "updatedAt"      timestamptz not null default now()
);
create index if not exists insurance_interests_customer_id_idx    on "insurance_interests" ("customerId");
create index if not exists insurance_interests_insurance_type_idx on "insurance_interests" ("insuranceType");
drop trigger if exists set_updated_at on "insurance_interests";
create trigger set_updated_at before update on "insurance_interests"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CONVERSATION STEPS
-- ─────────────────────────────────────────────

create table if not exists "conversation_steps" (
  "id"               text primary key,
  "conversationId"   text not null references "conversations"("id"),
  "flowName"         text not null,
  "flowVersion"      integer not null default 1,
  "stepKey"          text not null,
  "stepType"         text not null,
  "status"           text not null default 'pending',
  "questionPayload"  jsonb,
  "expectedInput"    jsonb,
  "answerValue"      text,
  "answerNormalized" jsonb,
  "startedAt"        timestamptz,
  "answeredAt"       timestamptz,
  "createdAt"        timestamptz not null default now(),
  "updatedAt"        timestamptz not null default now()
);
create index if not exists conversation_steps_conversation_id_idx on "conversation_steps" ("conversationId");
drop trigger if exists set_updated_at on "conversation_steps";
create trigger set_updated_at before update on "conversation_steps"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CONVERSATION EVENTS
-- ─────────────────────────────────────────────

create table if not exists "conversation_events" (
  "id"             text primary key,
  "conversationId" text not null references "conversations"("id"),
  "customerId"     text not null,
  "eventType"      text not null,
  "eventData"      jsonb,
  "source"         text,
  "createdAt"      timestamptz not null default now()
);
create index if not exists conversation_events_conversation_id_idx on "conversation_events" ("conversationId");

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────

create table if not exists "messages" (
  "id"                  text primary key,
  "conversationId"      text not null references "conversations"("id"),
  "customerId"          text not null references "customers"("id"),
  "channel"             text not null,
  "direction"           text not null,
  "messageType"         text not null,
  "textBody"            text,
  "mediaUrl"            text,
  "documentId"          text,
  "providerMessageId"   text unique,
  "providerStatus"      text,
  "replyToMessageId"    text,
  "interactiveType"     text,
  "interactiveId"       text,
  "rawPayloadReference" text,
  "sentAt"              timestamptz,
  "deliveredAt"         timestamptz,
  "readAt"              timestamptz,
  "createdAt"           timestamptz not null default now()
);
create index if not exists messages_conversation_id_idx on "messages" ("conversationId");

-- ─────────────────────────────────────────────
-- QUOTATION REQUESTS
-- ─────────────────────────────────────────────

create table if not exists "quotation_requests" (
  "id"                  text primary key,
  "customerId"          text not null references "customers"("id"),
  "leadId"              text references "leads"("id"),
  "insuranceInterestId" text references "insurance_interests"("id"),
  "conversationId"      text references "conversations"("id"),
  "insuranceType"       text not null,
  "rawPayload"          jsonb not null,
  "normalizedPayload"   jsonb not null,
  "status"              text not null default 'received',
  "provider"            text,
  "providerRequestId"   text,
  "errorCode"           text,
  "errorMessage"        text,
  "requestedAt"         timestamptz not null default now(),
  "processingStartedAt" timestamptz,
  "completedAt"         timestamptz,
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now()
);
create index if not exists quotation_requests_customer_id_idx    on "quotation_requests" ("customerId");
create index if not exists quotation_requests_status_idx         on "quotation_requests" ("status");
create index if not exists quotation_requests_insurance_type_idx on "quotation_requests" ("insuranceType");
drop trigger if exists set_updated_at on "quotation_requests";
create trigger set_updated_at before update on "quotation_requests"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- QUOTATIONS
-- ─────────────────────────────────────────────

create table if not exists "quotations" (
  "id"                 text primary key,
  "quotationRequestId" text not null references "quotation_requests"("id"),
  "customerId"         text not null references "customers"("id"),
  "insuranceType"      text not null,
  "provider"           text not null,
  "providerQuoteId"    text,
  "insurerName"        text not null,
  "planName"           text not null,
  "premium"            numeric(12,2) not null,
  "sumAssured"         numeric(12,2),
  "policyTerm"         integer,
  "status"             text not null default 'active',
  "validUntil"         timestamptz,
  "createdAt"          timestamptz not null default now(),
  "updatedAt"          timestamptz not null default now()
);
create index if not exists quotations_customer_id_idx         on "quotations" ("customerId");
create index if not exists quotations_quotation_request_id_idx on "quotations" ("quotationRequestId");
drop trigger if exists set_updated_at on "quotations";
create trigger set_updated_at before update on "quotations"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────

create table if not exists "documents" (
  "id"              text primary key,
  "quotationId"     text references "quotations"("id"),
  "customerId"      text not null references "customers"("id"),
  "documentType"    text not null,
  "fileName"        text not null,
  "mimeType"        text not null,
  "storageProvider" text not null,
  "storageKey"      text not null,
  "storageUrl"      text,
  "status"          text not null default 'pending',
  "createdAt"       timestamptz not null default now(),
  "updatedAt"       timestamptz not null default now()
);
create index if not exists documents_customer_id_idx  on "documents" ("customerId");
create index if not exists documents_quotation_id_idx on "documents" ("quotationId");
drop trigger if exists set_updated_at on "documents";
create trigger set_updated_at before update on "documents"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- ADVISOR APPOINTMENTS
-- ─────────────────────────────────────────────

create table if not exists "advisor_appointments" (
  "id"                  text primary key,
  "customerId"          text not null references "customers"("id"),
  "leadId"              text references "leads"("id"),
  "insuranceInterestId" text references "insurance_interests"("id"),
  "conversationId"      text references "conversations"("id"),
  "advisorId"           text references "advisors"("id"),
  "requestedDate"       text not null,
  "requestedTime"       text not null,
  "timezone"            text not null,
  "status"              text not null default 'requested',
  "source"              text not null,
  "notes"               text,
  "confirmedAt"         timestamptz,
  "assignedAt"          timestamptz,
  "completedAt"         timestamptz,
  "cancelledAt"         timestamptz,
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now()
);
create index if not exists advisor_appointments_customer_id_idx    on "advisor_appointments" ("customerId");
create index if not exists advisor_appointments_requested_date_idx on "advisor_appointments" ("requestedDate");
create index if not exists advisor_appointments_status_idx         on "advisor_appointments" ("status");
drop trigger if exists set_updated_at on "advisor_appointments";
create trigger set_updated_at before update on "advisor_appointments"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- WEBHOOK EVENTS
-- ─────────────────────────────────────────────

create table if not exists "webhook_events" (
  "id"               text primary key,
  "provider"         text not null,
  "eventType"        text not null,
  "externalEventId"  text,
  "requestId"        text,
  "idempotencyKey"   text unique,
  "payloadHash"      text,
  "payload"          jsonb not null,
  "processingStatus" text not null default 'received',
  "attemptCount"     integer not null default 0,
  "errorCode"        text,
  "errorMessage"     text,
  "receivedAt"       timestamptz not null default now(),
  "processedAt"      timestamptz,
  "createdAt"        timestamptz not null default now()
);
create index if not exists webhook_events_external_event_id_idx on "webhook_events" ("externalEventId");
create index if not exists webhook_events_request_id_idx        on "webhook_events" ("requestId");

-- ─────────────────────────────────────────────
-- WHATSAPP SESSIONS
-- ─────────────────────────────────────────────

create table if not exists "whatsapp_sessions" (
  "id"                       text primary key,
  "customerId"               text not null references "customers"("id"),
  "conversationId"           text not null unique references "conversations"("id"),
  "phoneNumber"              text not null,
  "state"                    text,
  "lastInteractiveMessageId" text,
  "expiresAt"                timestamptz,
  "createdAt"                timestamptz not null default now(),
  "updatedAt"                timestamptz not null default now()
);
drop trigger if exists set_updated_at on "whatsapp_sessions";
create trigger set_updated_at before update on "whatsapp_sessions"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- FLOW DEFINITIONS
-- ─────────────────────────────────────────────

create table if not exists "flow_definitions" (
  "id"        text primary key,
  "flowName"  text not null,
  "version"   integer not null,
  "steps"     jsonb not null,
  "rules"     jsonb,
  "isActive"  boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("flowName", "version")
);
drop trigger if exists set_updated_at on "flow_definitions";
create trigger set_updated_at before update on "flow_definitions"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- OUTBOUND MESSAGE JOBS
-- ─────────────────────────────────────────────

create table if not exists "outbound_message_jobs" (
  "id"             text primary key,
  "conversationId" text not null,
  "customerId"     text not null,
  "channel"        text not null,
  "messageType"    text not null,
  "payload"        jsonb not null,
  "status"         text not null default 'pending',
  "attemptCount"   integer not null default 0,
  "errorMessage"   text,
  "scheduledAt"    timestamptz,
  "processedAt"    timestamptz,
  "createdAt"      timestamptz not null default now(),
  "updatedAt"      timestamptz not null default now()
);
create index if not exists outbound_message_jobs_status_idx      on "outbound_message_jobs" ("status");
create index if not exists outbound_message_jobs_customer_id_idx on "outbound_message_jobs" ("customerId");
drop trigger if exists set_updated_at on "outbound_message_jobs";
create trigger set_updated_at before update on "outbound_message_jobs"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- INSURANCE POLICIES
-- ─────────────────────────────────────────────

create table if not exists "insurance_policies" (
  "id"             text primary key,
  "insuranceType"  text not null,
  "planType"       text not null check ("planType" in ('individual', 'family')),
  "amount"         numeric(12,2) not null,
  "membersCount"   integer,
  "customerName"   text,
  "phoneNumber"    text,
  "customerId"     text references "customers"("id"),
  "status"         text not null default 'active',
  "createdAt"      timestamptz not null default now()
);
create index if not exists insurance_policies_customer_id_idx    on "insurance_policies" ("customerId");
create index if not exists insurance_policies_insurance_type_idx on "insurance_policies" ("insuranceType");
