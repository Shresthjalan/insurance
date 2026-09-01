import { metaWhatsAppProvider } from '../../providers/whatsapp/MetaWhatsAppProvider';
import { customerService } from '../../services/CustomerService';
import { conversationEngine } from '../../services/conversation/ConversationEngine';
import { conversationService } from '../../services/conversation/ConversationService';
import { eventService } from '../../services/EventService';
import { whatsAppService } from '../../services/whatsapp/WhatsAppService';
import { messageBuilder } from '../../services/whatsapp/MessageBuilder';
import { advisorService } from '../../services/AdvisorService';
import { leadService } from '../../services/LeadService';
import { insuranceInterestService } from '../../services/InsuranceInterestService';
import { quotationRequestService } from '../../services/quotation';
import { quotationQueue } from '../../workers/queues';
import { CarQuotationService } from '../../services/quotation/CarQuotationService';
import { HealthQuotationService } from '../../services/quotation/HealthQuotationService';
import { TermQuotationService } from '../../services/quotation/TermQuotationService';
import { LifeQuotationService } from '../../services/quotation/LifeQuotationService';
import { ProviderAAdapter } from '../../providers/quotation/ProviderAAdapter';
import { ProviderBAdapter } from '../../providers/quotation/ProviderBAdapter';
import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import type { WhatsAppInboundMessage, WhatsAppStatusUpdate, InsuranceType } from '../../types';

const providers = [new ProviderAAdapter(), new ProviderBAdapter()];
const carService = new CarQuotationService(providers);
const healthService = new HealthQuotationService(providers);
const termService = new TermQuotationService(providers);
const lifeService = new LifeQuotationService(providers);

// ─── Non-meaningful text detection ────────────────────────────────────────────
const NON_MEANINGFUL_PATTERNS = [
  /^(hi+|hello+|hey+|heyy+)$/i,
  /^(ok|okay|sure|fine|yes|no|nope|yep|yeah|nah)$/i,
  /^(thanks?|thank you|ty|thx)$/i,
  /^(good morning|good afternoon|good evening|good night)$/i,
  /^[\u{1F600}-\u{1F9FF}\u{2600}-\u{27FF}]+$/u, // emoji only
  /^\.+$/,
];

function isNonMeaningfulText(text: string): boolean {
  const trimmed = text.trim();
  return NON_MEANINGFUL_PATTERNS.some((p) => p.test(trimmed));
}

// ─── Main entry point ──────────────────────────────────────────────────────────

export async function handleWhatsAppWebhook(body: unknown, signature?: string): Promise<void> {
  const { messages, statuses } = metaWhatsAppProvider.parseWebhook(body, signature);

  for (const status of statuses) {
    await handleStatusUpdate(status);
  }

  for (const message of messages) {
    try {
      await handleInboundMessage(message);
    } catch (err) {
      logger.error('Error handling WhatsApp message', {
        message_id: message.messageId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ─── Status updates ────────────────────────────────────────────────────────────

async function handleStatusUpdate(status: WhatsAppStatusUpdate): Promise<void> {
  await conversationService.updateMessageStatus(status.id, status.status, status.timestamp);
}

// ─── Inbound message processing ──────────────────────────────────────────────

async function handleInboundMessage(message: WhatsAppInboundMessage): Promise<void> {
  const phoneNumber = message.from;

  const customer = await customerService.findOrCreate({ phoneNumber });

  // Mark as read immediately
  await whatsAppService.markRead(phoneNumber, message.messageId);

  // Find or create active conversation
  const conversation = await conversationEngine.findOrStartConversation({
    customerId: customer.id,
    channel: 'whatsapp',
    source: 'meta',
  });

  // Persist inbound message
  await conversationService.saveMessage({
    conversationId: conversation.id,
    customerId: customer.id,
    channel: 'whatsapp',
    direction: 'inbound',
    messageType: message.type,
    textBody: message.text?.body ?? message.button?.payload,
    providerMessageId: message.messageId,
    interactiveType: message.interactive?.type,
    interactiveId:
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id,
    rawPayloadReference: message.messageId,
  });

  // ── Extract the user's selection ─────────────────────────────────────────
  const { inputId, inputText } = extractInput(message);

  // ── Determine current expected input type ───────────────────────────────
  const expectedInputType = conversation.expectedInputType;
  const isStructuredInput = expectedInputType === 'button' || expectedInputType === 'list' || expectedInputType === 'confirmation';

  // ── Non-meaningful text while structured input expected ─────────────────
  if (!inputId && isStructuredInput && inputText && isNonMeaningfulText(inputText)) {
    await resendCurrentUi(conversation.id, customer.id, phoneNumber);
    await eventService.log({
      conversationId: conversation.id,
      customerId: customer.id,
      eventType: 'invalid_input',
      eventData: { reason: 'non_meaningful_text', text: inputText },
    });
    return;
  }

  // ── No conversation state (new customer) → home menu ────────────────────
  if (!conversation.currentFlow || !conversation.currentState) {
    await sendHomeMenu(conversation.id, customer.id, phoneNumber);
    return;
  }

  // ── Process structured interaction (button/list click) ──────────────────
  if (inputId) {
    await processInteraction(conversation.id, customer.id, phoneNumber, inputId, inputText);
    return;
  }

  // ── Free text input ──────────────────────────────────────────────────────
  if (inputText && !isStructuredInput) {
    await processTextInput(conversation.id, customer.id, phoneNumber, inputText);
    return;
  }

  // ── Fallback: resend current UI ──────────────────────────────────────────
  await resendCurrentUi(conversation.id, customer.id, phoneNumber);
}

// ─── Process button/list interaction ──────────────────────────────────────────

async function processInteraction(
  conversationId: string,
  customerId: string,
  phoneNumber: string,
  inputId: string,
  inputText?: string,
): Promise<void> {
  const result = await conversationEngine.processInput(conversationId, inputId, inputText);

  await eventService.log({
    conversationId,
    customerId,
    eventType: 'button_clicked',
    eventData: { input_id: inputId, text: inputText },
  });

  // ── Post-step business logic ─────────────────────────────────────────────
  if (result.completed || inputId === 'confirm') {
    await handleConfirmation(conversationId, customerId, phoneNumber);
    return;
  }

  // Talk to advisor shortcut
  if (inputId === 'talk_advisor') {
    await conversationEngine.startFlow(conversationId, 'advisor');
    const step = await conversationEngine.getCurrentStep(conversationId);
    if (step) {
      const msg = messageBuilder.fromStep(step);
      await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, msg);
    }
    return;
  }

  // Quotation action buttons
  if (inputId === 'view_quotes') {
    await sendQuotationDetails(conversationId, customerId, phoneNumber);
    return;
  }

  if (inputId === 'compare_quotes') {
    await sendQuotationComparison(conversationId, customerId, phoneNumber);
    return;
  }

  // Advance to next step UI
  if (result.nextStep) {
    const msg = messageBuilder.fromStep(result.nextStep);
    await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, msg);
    return;
  }

  await resendCurrentUi(conversationId, customerId, phoneNumber);
}

// ─── Process free text input ──────────────────────────────────────────────────

async function processTextInput(
  conversationId: string,
  customerId: string,
  phoneNumber: string,
  text: string,
): Promise<void> {
  // Advance engine with the raw text as both id and value
  const result = await conversationEngine.processInput(conversationId, text, text);

  await eventService.log({
    conversationId,
    customerId,
    eventType: 'customer_message',
    eventData: { text },
  });

  if (result.completed || text === 'confirm') {
    await handleConfirmation(conversationId, customerId, phoneNumber);
    return;
  }

  if (result.nextStep) {
    const msg = messageBuilder.fromStep(result.nextStep);
    await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, msg);
    return;
  }

  await resendCurrentUi(conversationId, customerId, phoneNumber);
}

// ─── Handle confirmation (trigger quotation or advisor) ─────────────────────

async function handleConfirmation(
  conversationId: string,
  customerId: string,
  phoneNumber: string,
): Promise<void> {
  const ctx = await conversationEngine.getContext(conversationId);

  // Check if this is an advisor flow completion
  if (ctx['preferred_date'] || ctx['custom_date']) {
    await handleAdvisorConfirmation(conversationId, customerId, phoneNumber, ctx);
    return;
  }

  // Insurance quotation flow completion
  const insuranceType = ctx['insurance_type'] as InsuranceType | undefined;
  if (!insuranceType) {
    await sendHomeMenu(conversationId, customerId, phoneNumber);
    return;
  }

  // Build normalized payload from conversation context
  const normalizedPayload = buildNormalizedPayloadFromContext(insuranceType, ctx);

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  const lead = await leadService.findOrCreate({ customerId, source: 'whatsapp', primaryInsuranceType: insuranceType });
  const interest = await insuranceInterestService.findOrCreate({
    leadId: lead.id, customerId, insuranceType, source: 'whatsapp', conversationId,
  });

  await leadService.updateStatus(lead.id, 'quotation_requested');

  const quotationRequest = await quotationRequestService.create({
    customerId,
    leadId: lead.id,
    insuranceInterestId: interest.id,
    conversationId,
    insuranceType,
    rawPayload: ctx,
    normalizedPayload,
  });

  await quotationRequestService.updateStatus(quotationRequest.id, 'queued');

  await quotationQueue.add('process_quotation', {
    quotationRequestId: quotationRequest.id,
    customerId,
    insuranceType,
    normalizedPayload,
  });

  await whatsAppService.sendText(
    conversationId,
    customerId,
    phoneNumber,
    'Got it! We\'re fetching your quotes now. This usually takes under a minute. We\'ll send them to you as soon as they\'re ready.',
  );

  await eventService.log({
    conversationId,
    customerId,
    eventType: 'quotation_requested',
    eventData: { quotation_request_id: quotationRequest.id, insurance_type: insuranceType },
  });
}

// ─── Advisor flow completion ───────────────────────────────────────────────────

async function handleAdvisorConfirmation(
  conversationId: string,
  customerId: string,
  phoneNumber: string,
  ctx: Record<string, unknown>,
): Promise<void> {
  const date = (ctx['custom_date'] ?? ctx['preferred_date']) as string;
  const time = (ctx['custom_time'] ?? ctx['preferred_time']) as string;

  if (!date || !time || date === 'choose_date' || time === 'choose_time') {
    // Still collecting date/time
    const step = await conversationEngine.getCurrentStep(conversationId);
    if (step) await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, messageBuilder.fromStep(step));
    return;
  }

  // Resolve "today"/"tomorrow" to actual dates
  const resolvedDate = resolveRelativeDate(date);
  if (!resolvedDate) return;

  const lead = await leadService.findOrCreate({ customerId, source: 'whatsapp' });
  const appointment = await advisorService.create({
    customerId,
    leadId: lead.id,
    conversationId,
    requestedDate: resolvedDate,
    requestedTime: time,
    timezone: 'Asia/Kolkata',
    source: 'whatsapp',
  });

  await leadService.updateStatus(lead.id, 'advisor_requested');

  const confirmMsg = messageBuilder.appointmentConfirmed(resolvedDate, time);
  await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, confirmMsg);

  await eventService.log({
    conversationId,
    customerId,
    eventType: 'appointment_created',
    eventData: { appointment_id: appointment.id, date: resolvedDate, time },
  });
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

async function sendHomeMenu(conversationId: string, customerId: string, phoneNumber: string): Promise<void> {
  const msg = messageBuilder.homeMenu();
  await conversationEngine.startFlow(conversationId, 'home');
  await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, msg);
}

async function resendCurrentUi(conversationId: string, customerId: string, phoneNumber: string): Promise<void> {
  const step = await conversationEngine.getCurrentStep(conversationId);
  if (step) {
    const msg = messageBuilder.fromStep(step);
    await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, msg);
  } else {
    await sendHomeMenu(conversationId, customerId, phoneNumber);
  }

  await eventService.log({
    conversationId,
    customerId,
    eventType: 'state_resent',
    eventData: { state: (await conversationEngine.getCurrentStep(conversationId))?.key },
  });
}

async function sendQuotationDetails(conversationId: string, customerId: string, phoneNumber: string): Promise<void> {
  const latest = await prisma.quotationRequest.findFirst({
    where: { customerId, status: { in: ['generated', 'partially_generated'] } },
    include: { quotations: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) {
    await whatsAppService.sendText(conversationId, customerId, phoneNumber, 'No quotes found yet. Please request a quotation first.');
    return;
  }

  for (const q of latest.quotations) {
    await whatsAppService.sendText(
      conversationId,
      customerId,
      phoneNumber,
      `*${q.insurerName}* — ${q.planName}\nPremium: ₹${q.premium.toNumber().toLocaleString('en-IN')}/year`,
    );
  }
}

async function sendQuotationComparison(conversationId: string, customerId: string, phoneNumber: string): Promise<void> {
  const latest = await prisma.quotationRequest.findFirst({
    where: { customerId, status: { in: ['generated', 'partially_generated'] } },
    include: { quotations: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest || latest.quotations.length === 0) {
    await whatsAppService.sendText(conversationId, customerId, phoneNumber, 'No quotes available for comparison.');
    return;
  }

  const msg = messageBuilder.quotationComparison(
    latest.quotations.map((q) => ({
      id: q.id,
      title: q.planName,
      premium: q.premium.toNumber(),
      insurer: q.insurerName,
    })),
  );
  await whatsAppService.sendMessage(conversationId, customerId, phoneNumber, msg);
}

// ─── Input extraction ──────────────────────────────────────────────────────────

function extractInput(message: WhatsAppInboundMessage): { inputId?: string; inputText?: string } {
  if (message.interactive?.button_reply) {
    return {
      inputId: message.interactive.button_reply.id,
      inputText: message.interactive.button_reply.title,
    };
  }
  if (message.interactive?.list_reply) {
    return {
      inputId: message.interactive.list_reply.id,
      inputText: message.interactive.list_reply.title,
    };
  }
  if (message.button) {
    return { inputId: message.button.payload, inputText: message.button.text };
  }
  if (message.text?.body) {
    return { inputText: message.text.body };
  }
  return {};
}

// ─── Context → normalized payload ─────────────────────────────────────────────

function buildNormalizedPayloadFromContext(
  insuranceType: InsuranceType,
  ctx: Record<string, unknown>,
): Record<string, unknown> {
  switch (insuranceType) {
    case 'car':
      return {
        car_status: ctx['car_status'],
        vehicle_registration_number: ctx['vehicle_registration'] ?? ctx['vehicle_registration_number'],
        vehicle_make: ctx['vehicle_make'],
        vehicle_model: ctx['vehicle_model'],
        fuel_type: ctx['fuel_type'],
        registration_year: ctx['registration_year'] ? Number(ctx['registration_year']) : undefined,
        rto: ctx['rto'],
        policy_new_or_renewal: ctx['policy_type'],
        previous_claim: ctx['previous_claim'] === 'yes',
        ncb_percentage: ctx['ncb_percentage'] ? Number(ctx['ncb_percentage']) : 0,
      };
    case 'health':
      return {
        policy_type: ctx['policy_type'],
        city: ctx['city'],
        sum_insured: ctx['sum_insured'] ? Number(ctx['sum_insured']) : undefined,
        policy_tenure: ctx['policy_tenure'] ? Number(ctx['policy_tenure']) : 1,
        pre_existing_disease: ctx['pre_existing'] === 'yes',
        members: ctx['members'] ?? [],
      };
    case 'term':
      return {
        date_of_birth: ctx['date_of_birth'],
        gender: ctx['gender'],
        annual_income: ctx['annual_income'] ? Number(ctx['annual_income']) : undefined,
        occupation: ctx['occupation'],
        smoking_tobacco_status: ctx['tobacco'],
        desired_sum_assured: ctx['desired_cover'] ? Number(ctx['desired_cover']) : undefined,
        policy_term: ctx['policy_term'] ? Number(ctx['policy_term']) : undefined,
      };
    case 'life':
      return {
        product_objective: ctx['product_objective'],
        date_of_birth: ctx['date_of_birth'],
        gender: ctx['gender'],
        annual_income: ctx['annual_income'] ? Number(ctx['annual_income']) : undefined,
        smoking_tobacco_status: ctx['tobacco'],
        desired_sum_assured: ctx['desired_cover'] ? Number(ctx['desired_cover']) : undefined,
        policy_term: ctx['policy_term'] ? Number(ctx['policy_term']) : undefined,
        premium_payment_term: ctx['premium_payment_term'] ? Number(ctx['premium_payment_term']) : undefined,
        premium_payment_frequency: ctx['payment_frequency'],
      };
  }
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function resolveRelativeDate(date: string): string | null {
  const today = new Date();
  if (date === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (date === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }
  // Assume it's already a YYYY-MM-DD string or a step key we can't resolve
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return null;
}
