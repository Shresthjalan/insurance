import { metaWhatsAppProvider } from '../../providers/whatsapp/MetaWhatsAppProvider';
import type { WhatsAppProvider } from '../../providers/whatsapp/WhatsAppProvider';
import type { BuiltMessage } from './MessageBuilder';
import { conversationService } from '../conversation/ConversationService';
import { logger } from '../../utils/logger';

export class WhatsAppService {
  constructor(private readonly provider: WhatsAppProvider = metaWhatsAppProvider) {}

  async sendMessage(
    conversationId: string,
    customerId: string,
    phoneNumber: string,
    message: BuiltMessage,
    idempotencyKey?: string,
  ): Promise<string> {
    let result: { providerMessageId: string; status: string };

    switch (message.type) {
      case 'buttons':
      case 'confirmation':
        result = await this.provider.sendButtons({
          to: phoneNumber,
          body: message.body,
          buttons: message.buttons ?? [],
          idempotencyKey,
        });
        break;

      case 'list':
        result = await this.provider.sendList({
          to: phoneNumber,
          body: message.body,
          buttonText: 'View Options',
          sections: message.sections ?? [],
          idempotencyKey,
        });
        break;

      default:
        result = await this.provider.sendText({
          to: phoneNumber,
          body: message.body,
          idempotencyKey,
        });
    }

    // Persist the outbound message
    const saved = await conversationService.saveMessage({
      conversationId,
      customerId,
      channel: 'whatsapp',
      direction: 'outbound',
      messageType: message.type,
      textBody: message.body,
      providerMessageId: result.providerMessageId,
    });

    await conversationService.setLastUiMessage(conversationId, saved.id);

    logger.info('WhatsApp message sent', {
      conversation_id: conversationId,
      customer_id: customerId,
      provider_message_id: result.providerMessageId,
      message_type: message.type,
    });

    return result.providerMessageId;
  }

  async sendDocument(
    conversationId: string,
    customerId: string,
    phoneNumber: string,
    documentUrl: string,
    filename: string,
    caption?: string,
    filePath?: string,
  ): Promise<string> {
    // Prefer uploading the file to WhatsApp (works without a public URL).
    // Fall back to sending by link if no local path is available.
    let result: { providerMessageId: string; status: string };
    if (filePath) {
      const mediaId = await this.provider.uploadMedia(filePath, 'application/pdf', filename);
      result = await this.provider.sendDocument({
        to: phoneNumber,
        documentId: mediaId,
        filename,
        caption,
      });
    } else {
      result = await this.provider.sendDocument({
        to: phoneNumber,
        documentUrl,
        filename,
        caption,
      });
    }

    await conversationService.saveMessage({
      conversationId,
      customerId,
      channel: 'whatsapp',
      direction: 'outbound',
      messageType: 'document',
      textBody: caption,
      providerMessageId: result.providerMessageId,
    });

    return result.providerMessageId;
  }

  async sendText(
    conversationId: string,
    customerId: string,
    phoneNumber: string,
    body: string,
  ): Promise<string> {
    const result = await this.provider.sendText({ to: phoneNumber, body });
    await conversationService.saveMessage({
      conversationId,
      customerId,
      channel: 'whatsapp',
      direction: 'outbound',
      messageType: 'text',
      textBody: body,
      providerMessageId: result.providerMessageId,
    });
    return result.providerMessageId;
  }

  async markRead(phoneNumber: string, messageId: string): Promise<void> {
    await this.provider.markRead(phoneNumber, messageId);
  }
}

export const whatsAppService = new WhatsAppService();
