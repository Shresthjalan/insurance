import { supabase, unwrap } from '../../db';
import { Id } from '../../utils/idGenerator';
import type { Conversation, Message } from '../../types';

export class ConversationService {
  async findById(id: string): Promise<Conversation | null> {
    return unwrap<Conversation | null>(await supabase.from('conversations').select('*').eq('id', id).maybeSingle());
  }

  async findActiveForCustomer(customerId: string, channel = 'whatsapp'): Promise<Conversation | null> {
    const results = unwrap<Conversation[]>(
      await supabase
        .from('conversations')
        .select('*')
        .eq('customerId', customerId)
        .eq('channel', channel)
        .eq('status', 'active')
        .order('startedAt', { ascending: false })
        .limit(1),
    );
    return results[0] ?? null;
  }

  async setLastUiMessage(conversationId: string, messageId: string): Promise<void> {
    await supabase
      .from('conversations')
      .update({ lastUiMessageId: messageId, lastMessageAt: new Date().toISOString() })
      .eq('id', conversationId);
  }

  async complete(conversationId: string): Promise<void> {
    await supabase
      .from('conversations')
      .update({ status: 'completed', endedAt: new Date().toISOString() })
      .eq('id', conversationId);
  }

  async getMessages(conversationId: string, limit = 50) {
    return unwrap(
      await supabase
        .from('messages')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: true })
        .limit(limit),
    );
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
  }): Promise<Message> {
    return unwrap<Message>(
      await supabase
        .from('messages')
        .insert({ id: Id.message(), ...input, sentAt: new Date().toISOString() })
        .select()
        .single(),
    );
  }

  async updateMessageStatus(
    providerMessageId: string,
    status: string,
    timestamp?: string,
  ): Promise<void> {
    const updates: Record<string, unknown> = { providerStatus: status };
    if (status === 'delivered') updates.deliveredAt = timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString();
    if (status === 'read') updates.readAt = timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString();

    await supabase.from('messages').update(updates).eq('providerMessageId', providerMessageId);
  }
}

export const conversationService = new ConversationService();
