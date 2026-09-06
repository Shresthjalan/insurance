import type { FlowDefinition } from '../types';

// Insurance type selection — common entry point from home
export const insuranceTypeSelectionFlow: FlowDefinition = {
  flow: 'insurance_type_selection',
  version: 1,
  initialStep: 'insurance_type',
  steps: [
    {
      key: 'insurance_type',
      type: 'list',
      question: 'Which insurance are you interested in?',
      options: [
        { id: 'car', title: 'Car Insurance' },
        { id: 'health', title: 'Health Insurance' },
        { id: 'term', title: 'Term Insurance' },
        { id: 'life', title: 'Life Insurance' },
      ],
      rules: [
        { if: { stepKey: 'insurance_type', equals: 'car' }, goto: '__flow:car_quotation' },
        { if: { stepKey: 'insurance_type', equals: 'health' }, goto: '__flow:health_quotation' },
        { if: { stepKey: 'insurance_type', equals: 'term' }, goto: '__flow:term_quotation' },
        { if: { stepKey: 'insurance_type', equals: 'life' }, goto: '__flow:life_quotation' },
      ],
    },
  ],
};
