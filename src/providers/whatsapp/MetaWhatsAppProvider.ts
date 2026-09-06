import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  WhatsAppProvider,
  SendTextOptions,
  SendDocumentOptions,
  SendButtonsOptions,
  SendListOptions,
  SendTemplateOptions,
  SendMessageResult,
  ParsedWebhook,
} from './WhatsAppProvider';
import type { WhatsAppInboundMessage, WhatsAppStatusUpdate } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ProviderError } from '../../utils/errors';

export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly http: AxiosInstance;
  private readonly phoneNumberId: string;

  constructor() {
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.http = axios.create({
      baseURL: `${config.whatsapp.apiBaseUrl}/${config.whatsapp.apiVersion}`,
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async send(payload: Record<string, unknown>): Promise<SendMessageResult> {
    try {
      const { data } = await this.http.post(
        `/${this.phoneNumberId}/messages`,
        { messaging_product: 'whatsapp', ...payload },
      );
      const messageId = data?.messages?.[0]?.id;
      if (!messageId) throw new ProviderError('No message ID in WhatsApp response');
      return { providerMessageId: messageId, status: 'sent' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('WhatsApp send failed', { error: msg });
      throw new ProviderError(`WhatsApp send failed: ${msg}`);
    }
  }

  async sendText({ to, body, previewUrl = false }: SendTextOptions): Promise<SendMessageResult> {
    return this.send({
      to,
      type: 'text',
      text: { body, preview_url: previewUrl },
    });
  }

  async sendDocument({ to, documentUrl, documentId, filename, caption }: SendDocumentOptions): Promise<SendMessageResult> {
    const document: Record<string, unknown> = {};
    if (documentId) document.id = documentId;
    else if (documentUrl) document.link = documentUrl;
    if (filename) document.filename = filename;
    if (caption) document.caption = caption;

    return this.send({ to, type: 'document', document });
  }

  async sendButtons({ to, body, buttons, header, footer }: SendButtonsOptions): Promise<SendMessageResult> {
    return this.send({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(header && { header: { type: 'text', text: header } }),
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  }

  async sendList({ to, body, buttonText, sections, header, footer }: SendListOptions): Promise<SendMessageResult> {
    return this.send({
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(header && { header: { type: 'text', text: header } }),
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          button: buttonText,
          sections: sections.map((s) => ({
            title: s.title,
            rows: s.rows.map((r) => ({
              id: r.id,
              title: r.title,
              ...(r.description && { description: r.description }),
            })),
          })),
        },
      },
    });
  }

  async sendTemplate({ to, templateName, languageCode = 'en', components }: SendTemplateOptions): Promise<SendMessageResult> {
    return this.send({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components && { components }),
      },
    });
  }

  async uploadMedia(filePath: string, mimeType: string, filename?: string): Promise<string> {
    try {
      const bytes = fs.readFileSync(filePath);
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimeType);
      form.append(
        'file',
        new Blob([bytes], { type: mimeType }),
        filename ?? path.basename(filePath),
      );

      const url = `${config.whatsapp.apiBaseUrl}/${config.whatsapp.apiVersion}/${this.phoneNumberId}/media`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` },
        body: form,
      });

      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !data.id) {
        throw new ProviderError(`Media upload failed: ${data.error?.message ?? res.statusText}`);
      }
      return data.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('WhatsApp media upload failed', { error: msg });
      throw new ProviderError(`WhatsApp media upload failed: ${msg}`);
    }
  }

  async markRead(phoneNumber: string, messageId: string): Promise<void> {
    try {
      await this.http.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (err) {
      logger.warn('Mark read failed', { messageId, error: String(err) });
    }
  }

  parseWebhook(body: unknown, signature?: string): ParsedWebhook {
    if (signature && config.whatsapp.appSecret) {
      this.verifySignature(JSON.stringify(body), signature);
    }

    const raw = body as Record<string, unknown>;
    const messages: WhatsAppInboundMessage[] = [];
    const statuses: WhatsAppStatusUpdate[] = [];

    const entries = (raw?.entry ?? []) as unknown[];
    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      const changes = (e?.changes ?? []) as unknown[];
      for (const change of changes) {
        const c = (change as Record<string, unknown>)?.value as Record<string, unknown>;
        if (!c) continue;

        const msgs = (c?.messages ?? []) as unknown[];
        for (const m of msgs) {
          messages.push(m as WhatsAppInboundMessage);
        }

        const sts = (c?.statuses ?? []) as unknown[];
        for (const s of sts) {
          statuses.push(s as WhatsAppStatusUpdate);
        }
      }
    }

    return { messages, statuses, raw };
  }

  verifyWebhookChallenge(query: Record<string, string>): string | null {
    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === config.whatsapp.verifyToken
    ) {
      return query['hub.challenge'] ?? null;
    }
    return null;
  }

  private verifySignature(payload: string, signature: string): void {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', config.whatsapp.appSecret)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new Error('WhatsApp signature verification failed');
    }
  }
}

// Singleton
export const metaWhatsAppProvider = new MetaWhatsAppProvider();
