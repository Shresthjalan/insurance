import { prisma } from '../../db';
import type { Conversation } from '@prisma/client';

export class ConversationService {
  async findById(id: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({ where: { id } });
  }

  async findActiveForCustomer(customerId: string, channel = 'whatsapp'): Promise<Conversation | null> {
    return prisma.conversation.findFirst({
      where: { customerId, channel, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });
  }

  async setLastUiMessage(conversationId: string, messageId: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastUiMessageId: messageId, lastMessageAt: new Date() },
    });
  }

  async complete(conversationId: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'completed', endedAt: new Date() },
    });
  }

  async getMessages(conversationId: string, limit = 50) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async saveMessage(input: {
    conversationId: string;
    customerId: string;
    channel: string;
    direction: 'inbound' | 'outbound';
    messageType: string;
    textBody?: string;
    providerMessageId?: string;
    interactiveType?: string;
    interactiveId?: string;
    rawPayloadReference?: string;
  }) {
    return prisma.message.create({ data: { ...input, sentAt: new Date() } });
  }

  async updateMessageStatus(
    providerMessageId: string,
    status: string,
    timestamp?: string,
  ): Promise<void> {
    const data: Record<string, unknown> = { providerStatus: status };
    if (status === 'delivered') data.deliveredAt = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
    if (status === 'read') data.readAt = timestamp ? new Date(Number(timestamp) * 1000) : new Date();

    await prisma.message.updateMany({ where: { providerMessageId }, data });
  }
}

export const conversationService = new ConversationService();
