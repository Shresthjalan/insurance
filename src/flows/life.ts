import type { FlowDefinition } from '../types';

export const lifeQuotationFlow: FlowDefinition = {
  flow: 'life_quotation',
  version: 1,
  initialStep: 'product_objective',
  steps: [
    {
      key: 'product_objective',
      type: 'button',
      question: 'What is your primary insurance objective?',
      options: [
        { id: 'protection', title: 'Pure Protection' },
        { id: 'savings', title: 'Savings + Protection' },
        { id: 'wealth', title: 'Wealth Creation' },
        { id: 'retirement', title: 'Retirement Planning' },
      ],
      rules: [
        // Pure protection maps to term flow
        { if: { stepKey: 'product_objective', equals: 'protection' }, goto: '__flow:term_quotation' },
      ],
      next: 'date_of_birth',
    },
    {
      key: 'date_of_birth',
      type: 'date',
      question: 'What is your date of birth? (DD/MM/YYYY)',
      validation: { required: true, format: 'date' },
      next: 'gender',
    },
    {
      key: 'gender',
      type: 'button',
      question: 'What is your gender?',
      options: [
        { id: 'male', title: 'Male' },
        { id: 'female', title: 'Female' },
        { id: 'other', title: 'Other' },
      ],
      next: 'annual_income',
    },
    {
      key: 'annual_income',
      type: 'list',
      question: 'What is your annual income?',
      options: [
        { id: '500000', title: 'Up to 5 Lakh' },
        { id: '1000000', title: '5–10 Lakh' },
        { id: '1500000', title: '10–15 Lakh' },
        { id: '2500000', title: '15–25 Lakh' },
        { id: '5000000', title: '25–50 Lakh' },
        { id: '10000000', title: '50 Lakh+' },
      ],
      next: 'tobacco',
    },
    {
      key: 'tobacco',
      type: 'button',
      question: 'Do you smoke or use tobacco products?',
      options: [
        { id: 'non_smoker', title: 'No' },
        { id: 'smoker', title: 'Yes' },
      ],
      next: 'desired_cover',
    },
    {
      key: 'desired_cover',
      type: 'list',
      question: 'What sum assured would you like?',
      options: [
        { id: '1000000', title: '10 Lakh' },
        { id: '2500000', title: '25 Lakh' },
        { id: '5000000', title: '50 Lakh' },
        { id: '10000000', title: '1 Crore' },
        { id: '20000000', title: '2 Crore' },
      ],
      next: 'policy_term',
    },
    {
      key: 'policy_term',
      type: 'list',
      question: 'For how many years do you want this plan?',
      options: [
        { id: '10', title: '10 years' },
        { id: '15', title: '15 years' },
        { id: '20', title: '20 years' },
        { id: '25', title: '25 years' },
        { id: '30', title: '30 years' },
      ],
      next: 'premium_payment_term',
    },
    {
      key: 'premium_payment_term',
      type: 'list',
      question: 'For how many years do you want to pay premiums?',
      options: [
        { id: '5', title: '5 years (Limited Pay)' },
        { id: '10', title: '10 years' },
        { id: '15', title: '15 years' },
        { id: 'same', title: 'Same as policy term' },
      ],
      next: 'payment_frequency',
    },
    {
      key: 'payment_frequency',
      type: 'button',
      question: 'How often would you like to pay premiums?',
      options: [
        { id: 'yearly', title: 'Yearly' },
        { id: 'half_yearly', title: 'Half-Yearly' },
        { id: 'quarterly', title: 'Quarterly' },
        { id: 'monthly', title: 'Monthly' },
      ],
      next: 'confirmation',
    },
    {
      key: 'confirmation',
      type: 'confirmation',
      question: 'Ready to get your life insurance quotes. Shall we proceed?',
      options: [
        { id: 'confirm', title: 'Get Quotes' },
        { id: 'edit', title: 'Edit Details' },
      ],
    },
  ],
};
