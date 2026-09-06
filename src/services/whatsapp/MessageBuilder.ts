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

  quotationReadyGreeting(count: number): string {
    return count === 1
      ? 'Thanks for choosing First Advisor! There is 1 quote ready for you.'
      : `Thanks for choosing First Advisor! There are ${count} quotes ready for you.`;
  }

  quotationReady(count: number): BuiltMessage {
    return {
      type: 'text',
      body: this.quotationReadyGreeting(count),
    };
  }

  talkToAdvisor(): BuiltMessage {
    return {
      type: 'buttons',
      body: 'Would you like to speak with one of our advisors or request another quote?',
      buttons: [
        { id: 'get_quote', title: 'Get new Quote' },
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
      body: 'Welcome to First Advisor! How can we help you today?',
      buttons: [
        { id: 'get_quote', title: 'Get new Quote' },
        { id: 'talk_advisor', title: 'Talk to Advisor' },
      ],
    };
  }
}

export const messageBuilder = new MessageBuilder();
