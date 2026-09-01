import type { FlowStep, WhatsAppButton, WhatsAppListSection } from '../../types';

export interface BuiltMessage {
  type: 'text' | 'buttons' | 'list' | 'confirmation';
  body: string;
  buttons?: WhatsAppButton[];
  sections?: WhatsAppListSection[];
}

export class MessageBuilder {
  fromStep(step: FlowStep): BuiltMessage {
    switch (step.type) {
      case 'button':
      case 'confirmation':
        return {
          type: 'buttons',
          body: step.question,
          buttons: (step.options ?? []).map((o) => ({ id: o.id, title: o.title })),
        };

      case 'list':
        return {
          type: 'list',
          body: step.question,
          sections: [
            {
              title: 'Options',
              rows: (step.options ?? []).map((o) => ({
                id: o.id,
                title: o.title,
                description: o.description,
              })),
            },
          ],
        };

      default:
        return { type: 'text', body: step.question };
    }
  }

  quotationReady(count: number): BuiltMessage {
    return {
      type: 'buttons',
      body: count === 1
        ? 'Your quotation is ready! Here are the details.'
        : `We found ${count} quotation options for you.`,
      buttons: [
        { id: 'view_quotes', title: 'View Quotes' },
        { id: 'compare_quotes', title: 'Compare' },
        { id: 'talk_advisor', title: 'Talk to Advisor' },
      ],
    };
  }

  quotationComparison(options: Array<{ id: string; title: string; premium: number; insurer: string }>): BuiltMessage {
    return {
      type: 'list',
      body: 'Compare your quotation options:',
      sections: [
        {
          title: 'Quotations',
          rows: options.map((o) => ({
            id: o.id,
            title: `${o.insurer} — ₹${o.premium.toLocaleString('en-IN')}/yr`,
            description: o.title,
          })),
        },
      ],
    };
  }

  appointmentConfirmed(date: string, time: string): BuiltMessage {
    return {
      type: 'text',
      body: `Great! Your appointment has been confirmed for ${date} at ${time}. Our advisor will contact you.`,
    };
  }

  homeMenu(): BuiltMessage {
    return {
      type: 'buttons',
      body: 'Welcome! How can we help you today?',
      buttons: [
        { id: 'get_quote', title: 'Get Insurance Quote' },
        { id: 'existing_quote', title: 'View Existing Quote' },
        { id: 'talk_advisor', title: 'Talk to Advisor' },
      ],
    };
  }
}

export const messageBuilder = new MessageBuilder();
