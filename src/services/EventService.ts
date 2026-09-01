import { prisma } from '../db';
import { logger } from '../utils/logger';

export type ConversationEventType =
  | 'conversation_started'
  | 'language_selected'
  | 'insurance_selected'
  | 'interest_captured'
  | 'quotation_requested'
  | 'quotation_generated'
  | 'quotation_sent'
  | 'button_clicked'
  | 'list_selected'
  | 'form_submitted'
  | 'customer_message'
  | 'advisor_requested'
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'conversation_completed'
  | 'invalid_input'
  | 'state_resent'
  | 'whatsapp_delivered'
  | 'whatsapp_read';

export interface LogEventInput {
  conversationId: string;
  customerId: string;
  eventType: ConversationEventType;
  eventData?: Record<string, unknown>;
  source?: string;
}

export class EventService {
  async log(input: LogEventInput): Promise<void> {
    try {
      await prisma.conversationEvent.create({
        data: {
          conversationId: input.conversationId,
          customerId: input.customerId,
          eventType: input.eventType,
          eventData: input.eventData ?? {},
          source: input.source ?? null,
        },
      });
    } catch (err) {
      // Event logging should never break the main flow
      logger.warn('Failed to log conversation event', {
        conversation_id: input.conversationId,
        event_type: input.eventType,
        error: String(err),
      });
    }
  }

  async getHistory(conversationId: string) {
    return prisma.conversationEvent.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const eventService = new EventService();
