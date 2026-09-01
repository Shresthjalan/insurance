-- Insurance platform schema (raw SQL — replaces the former prisma/schema.prisma).
-- Column names intentionally stay camelCase (quoted) to match the existing
-- application code, which was written against Prisma's default (unmapped)
-- field names. Primary keys are app-supplied prefixed IDs (see
-- src/utils/idGenerator.ts) rather than DB-generated UUIDs.

create extension if not exists pgcrypto;

-- Generic trigger to replicate Prisma's `@updatedAt` behavior.
create or replace function set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────

create table "customers" (
  "id" text primary key,
  "phoneNumber" text not null,
  "normalizedPhoneNumber" text not null unique,
  "name" text,
  "preferredLanguage" text,
  "countryCode" text,
  "status" text not null default 'active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "lastContactAt" timestamptz
);
create trigger set_updated_at before update on "customers"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- ADVISORS
-- ─────────────────────────────────────────────

create table "advisors" (
  "id" text primary key,
  "name" text not null,
  "phone" text,
  "email" text,
  "status" text not null default 'active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create trigger set_updated_at before update on "advisors"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────

create table "leads" (
  "id" text primary key,
  "customerId" text not null references "customers"("id"),
  "source" text not null,
  "status" text not null default 'new',
  "primaryInsuranceType" text,
  "assignedAdvisorId" text references "advisors"("id"),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "leads" ("customerId");
create trigger set_updated_at before update on "leads"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────

create table "conversations" (
  "id" text primary key,
  "customerId" text not null references "customers"("id"),
  "channel" text not null,
  "source" text not null,
  "status" text not null default 'active',
  "language" text,
  "currentFlow" text,
  "currentState" text,
  "expectedInputType" text,
  "expectedInputIds" jsonb,
  "contextJson" jsonb,
  "lastUiMessageId" text,
  "lastMessageAt" timestamptz,
  "startedAt" timestamptz not null default now(),
  "endedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "conversations" ("customerId");
create index on "conversations" ("status");
create trigger set_updated_at before update on "conversations"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- INSURANCE INTERESTS
-- ─────────────────────────────────────────────

create table "insurance_interests" (
  "id" text primary key,
  "leadId" text not null references "leads"("id"),
  "customerId" text not null references "customers"("id"),
  "insuranceType" text not null,
  "source" text not null,
  "conversationId" text references "conversations"("id"),
  "status" text not null default 'active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "insurance_interests" ("customerId");
create index on "insurance_interests" ("insuranceType");
create trigger set_updated_at before update on "insurance_interests"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CONVERSATION STEPS
-- ─────────────────────────────────────────────

create table "conversation_steps" (
  "id" text primary key,
  "conversationId" text not null references "conversations"("id"),
  "flowName" text not null,
  "flowVersion" integer not null default 1,
  "stepKey" text not null,
  "stepType" text not null,
  "status" text not null default 'pending',
  "questionPayload" jsonb,
  "expectedInput" jsonb,
  "answerValue" text,
  "answerNormalized" jsonb,
  "startedAt" timestamptz,
  "answeredAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "conversation_steps" ("conversationId");
create trigger set_updated_at before update on "conversation_steps"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CONVERSATION EVENTS
-- ─────────────────────────────────────────────

create table "conversation_events" (
  "id" text primary key,
  "conversationId" text not null references "conversations"("id"),
  "customerId" text not null,
  "eventType" text not null,
  "eventData" jsonb,
  "source" text,
  "createdAt" timestamptz not null default now()
);
create index on "conversation_events" ("conversationId");

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────

create table "messages" (
  "id" text primary key,
  "conversationId" text not null references "conversations"("id"),
  "customerId" text not null references "customers"("id"),
  "channel" text not null,
  "direction" text not null,
  "messageType" text not null,
  "textBody" text,
  "mediaUrl" text,
  "documentId" text,
  "providerMessageId" text unique,
  "providerStatus" text,
  "replyToMessageId" text,
  "interactiveType" text,
  "interactiveId" text,
  "rawPayloadReference" text,
  "sentAt" timestamptz,
  "deliveredAt" timestamptz,
  "readAt" timestamptz,
  "createdAt" timestamptz not null default now()
);
create index on "messages" ("conversationId");

-- ─────────────────────────────────────────────
-- QUOTATION REQUESTS
-- ─────────────────────────────────────────────

create table "quotation_requests" (
  "id" text primary key,
  "customerId" text not null references "customers"("id"),
  "leadId" text references "leads"("id"),
  "insuranceInterestId" text references "insurance_interests"("id"),
  "conversationId" text references "conversations"("id"),
  "insuranceType" text not null,
  "rawPayload" jsonb not null,
  "normalizedPayload" jsonb not null,
  "status" text not null default 'received',
  "provider" text,
  "providerRequestId" text,
  "errorCode" text,
  "errorMessage" text,
  "requestedAt" timestamptz not null default now(),
  "processingStartedAt" timestamptz,
  "completedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "quotation_requests" ("customerId");
create index on "quotation_requests" ("status");
create index on "quotation_requests" ("insuranceType");
create trigger set_updated_at before update on "quotation_requests"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- QUOTATIONS
-- ─────────────────────────────────────────────

create table "quotations" (
  "id" text primary key,
  "quotationRequestId" text not null references "quotation_requests"("id"),
  "customerId" text not null references "customers"("id"),
  "insuranceType" text not null,
  "provider" text not null,
  "providerQuoteId" text,
  "insurerName" text not null,
  "planName" text not null,
  "premium" numeric(12, 2) not null,
  "sumAssured" numeric(12, 2),
  "policyTerm" integer,
  "status" text not null default 'active',
  "validUntil" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "quotations" ("customerId");
create index on "quotations" ("quotationRequestId");
create trigger set_updated_at before update on "quotations"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- ADVISOR APPOINTMENTS
-- ─────────────────────────────────────────────

create table "advisor_appointments" (
  "id" text primary key,
  "customerId" text not null references "customers"("id"),
  "leadId" text references "leads"("id"),
  "insuranceInterestId" text references "insurance_interests"("id"),
  "conversationId" text references "conversations"("id"),
  "advisorId" text references "advisors"("id"),
  "requestedDate" text not null,
  "requestedTime" text not null,
  "timezone" text not null,
  "status" text not null default 'requested',
  "source" text not null,
  "notes" text,
  "confirmedAt" timestamptz,
  "assignedAt" timestamptz,
  "completedAt" timestamptz,
  "cancelledAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "advisor_appointments" ("customerId");
create index on "advisor_appointments" ("requestedDate");
create index on "advisor_appointments" ("status");
create trigger set_updated_at before update on "advisor_appointments"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- WEBHOOK EVENTS
-- ─────────────────────────────────────────────

create table "webhook_events" (
  "id" text primary key,
  "provider" text not null,
  "eventType" text not null,
  "externalEventId" text,
  "requestId" text,
  "idempotencyKey" text unique,
  "payloadHash" text,
  "payload" jsonb not null,
  "processingStatus" text not null default 'received',
  "attemptCount" integer not null default 0,
  "errorCode" text,
  "errorMessage" text,
  "receivedAt" timestamptz not null default now(),
  "processedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);
create index on "webhook_events" ("externalEventId");
create index on "webhook_events" ("requestId");

-- ─────────────────────────────────────────────
-- WHATSAPP SESSIONS
-- ─────────────────────────────────────────────

create table "whatsapp_sessions" (
  "id" text primary key,
  "customerId" text not null references "customers"("id"),
  "conversationId" text not null unique references "conversations"("id"),
  "phoneNumber" text not null,
  "state" text,
  "lastInteractiveMessageId" text,
  "expiresAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create trigger set_updated_at before update on "whatsapp_sessions"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- FLOW DEFINITIONS
-- ─────────────────────────────────────────────

create table "flow_definitions" (
  "id" text primary key,
  "flowName" text not null,
  "version" integer not null,
  "steps" jsonb not null,
  "rules" jsonb,
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("flowName", "version")
);
create trigger set_updated_at before update on "flow_definitions"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- OUTBOUND MESSAGE JOBS
-- ─────────────────────────────────────────────

create table "outbound_message_jobs" (
  "id" text primary key,
  "conversationId" text not null,
  "customerId" text not null,
  "channel" text not null,
  "messageType" text not null,
  "payload" jsonb not null,
  "status" text not null default 'pending',
  "attemptCount" integer not null default 0,
  "errorMessage" text,
  "scheduledAt" timestamptz,
  "processedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index on "outbound_message_jobs" ("status");
create index on "outbound_message_jobs" ("customerId");
create trigger set_updated_at before update on "outbound_message_jobs"
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- INSURANCE POLICIES
-- (new — replaces the old S3/PDF "document" placeholder pipeline; written to
-- directly via POST /api/v1/insurance-policies)
-- ─────────────────────────────────────────────

create table "insurance_policies" (
  "id" text primary key,
  "insuranceType" text not null,
  "planType" text not null check ("planType" in ('individual', 'family')),
  "amount" numeric(12, 2) not null,
  "membersCount" integer,
  "customerName" text,
  "phoneNumber" text,
  "customerId" text references "customers"("id"),
  "status" text not null default 'active',
  "createdAt" timestamptz not null default now()
);
create index on "insurance_policies" ("customerId");
create index on "insurance_policies" ("insuranceType");
