import type {
  WhatsAppButton,
  WhatsAppListSection,
  WhatsAppInboundMessage,
  WhatsAppStatusUpdate,
} from '../../types';

export interface SendTextOptions {
  to: string;
  body: string;
  previewUrl?: boolean;
  idempotencyKey?: string;
}

export interface SendDocumentOptions {
  to: string;
  documentUrl?: string;
  documentId?: string;
  filename?: string;
  caption?: string;
  idempotencyKey?: string;
}

export interface SendButtonsOptions {
  to: string;
  body: string;
  buttons: WhatsAppButton[];
  header?: string;
  footer?: string;
  idempotencyKey?: string;
}

export interface SendListOptions {
  to: string;
  body: string;
  buttonText: string;
  sections: WhatsAppListSection[];
  header?: string;
  footer?: string;
  idempotencyKey?: string;
}

export interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: unknown[];
  idempotencyKey?: string;
}

export interface SendMessageResult {
  providerMessageId: string;
  status: string;
}

export interface ParsedWebhook {
  messages: WhatsAppInboundMessage[];
  statuses: WhatsAppStatusUpdate[];
  raw: unknown;
}

export interface WhatsAppProvider {
  sendText(opts: SendTextOptions): Promise<SendMessageResult>;
  sendDocument(opts: SendDocumentOptions): Promise<SendMessageResult>;
  sendButtons(opts: SendButtonsOptions): Promise<SendMessageResult>;
  sendList(opts: SendListOptions): Promise<SendMessageResult>;
  sendTemplate(opts: SendTemplateOptions): Promise<SendMessageResult>;
  markRead(phoneNumber: string, messageId: string): Promise<void>;
  parseWebhook(body: unknown, signature?: string): ParsedWebhook;
  verifyWebhookChallenge(query: Record<string, string>): string | null;
}
