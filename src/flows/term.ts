import type { FlowDefinition } from '../types';

export const termQuotationFlow: FlowDefinition = {
  flow: 'term_quotation',
  version: 1,
  initialStep: 'date_of_birth',
  steps: [
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
      next: 'occupation',
    },
    {
      key: 'occupation',
      type: 'list',
      question: 'What is your occupation?',
      options: [
        { id: 'salaried', title: 'Salaried Employee' },
        { id: 'self_employed', title: 'Self-Employed' },
        { id: 'software_engineer', title: 'Software Engineer' },
        { id: 'doctor', title: 'Doctor' },
        { id: 'lawyer', title: 'Lawyer' },
        { id: 'other_professional', title: 'Other Professional' },
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
      question: 'What sum assured (life cover) do you want?',
      options: [
        { id: '2500000', title: '25 Lakh' },
        { id: '5000000', title: '50 Lakh' },
        { id: '10000000', title: '1 Crore' },
        { id: '15000000', title: '1.5 Crore' },
        { id: '20000000', title: '2 Crore' },
        { id: '50000000', title: '5 Crore' },
      ],
      next: 'policy_term',
    },
    {
      key: 'policy_term',
      type: 'list',
      question: 'For how many years do you want the term cover?',
      options: [
        { id: '10', title: '10 years' },
        { id: '15', title: '15 years' },
        { id: '20', title: '20 years' },
        { id: '25', title: '25 years' },
        { id: '30', title: '30 years' },
        { id: '40', title: '40 years' },
      ],
      next: 'confirmation',
    },
    {
      key: 'confirmation',
      type: 'confirmation',
      question: 'Ready to fetch your term insurance quotes. Shall we proceed?',
      options: [
        { id: 'confirm', title: 'Get Quotes' },
        { id: 'edit', title: 'Edit Details' },
      ],
    },
  ],
};
