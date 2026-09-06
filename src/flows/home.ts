import type { FlowDefinition } from '../types';

export const homeFlow: FlowDefinition = {
  flow: 'home',
  version: 1,
  initialStep: 'main_menu',
  steps: [
    {
      key: 'main_menu',
      type: 'button',
      question: 'Welcome to First Advisor! How can we help you today?',
      options: [
        { id: 'get_quote', title: 'Get new Quote' },
        { id: 'talk_advisor', title: 'Talk to Advisor' },
      ],
      rules: [
        { if: { stepKey: 'main_menu', equals: 'get_quote' }, goto: '__flow:insurance_type_selection' },
        { if: { stepKey: 'main_menu', equals: 'talk_advisor' }, goto: '__flow:advisor' },
      ],
    },
  ],
};
