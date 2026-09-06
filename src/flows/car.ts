import type { FlowDefinition } from '../types';

export const carQuotationFlow: FlowDefinition = {
  flow: 'car_quotation',
  version: 1,
  initialStep: 'car_status',
  steps: [
    {
      key: 'car_status',
      type: 'button',
      question: 'Is this for a new car or an existing car?',
      options: [
        { id: 'new', title: 'New Car' },
        { id: 'existing', title: 'Existing Car' },
      ],
      rules: [
        { if: { stepKey: 'car_status', equals: 'existing' }, goto: 'vehicle_registration' },
        { if: { stepKey: 'car_status', equals: 'new' }, goto: 'vehicle_make' },
      ],
    },
    {
      key: 'vehicle_registration',
      type: 'text',
      question: 'Please enter your vehicle registration number (e.g. KA01AB1234):',
      validation: { required: true, format: 'registration' },
      next: 'vehicle_make',
    },
    {
      key: 'vehicle_make',
      type: 'text',
      question: 'What is the make of your vehicle? (e.g. Hyundai, Maruti, Tata):',
      validation: { required: true, minLength: 2, maxLength: 50 },
      next: 'vehicle_model',
    },
    {
      key: 'vehicle_model',
      type: 'text',
      question: 'What is the model? (e.g. Creta, Swift, Nexon):',
      validation: { required: true, minLength: 1, maxLength: 50 },
      next: 'fuel_type',
    },
    {
      key: 'fuel_type',
      type: 'list',
      question: 'What is the fuel type?',
      options: [
        { id: 'petrol', title: 'Petrol' },
        { id: 'diesel', title: 'Diesel' },
        { id: 'cng', title: 'CNG' },
        { id: 'electric', title: 'Electric' },
        { id: 'hybrid', title: 'Hybrid' },
      ],
      next: 'registration_year',
    },
    {
      key: 'registration_year',
      type: 'number',
      question: 'What year was the vehicle registered? (e.g. 2022):',
      validation: { required: true, min: 1990, max: 2026, format: 'numeric' },
      next: 'rto',
    },
    {
      key: 'rto',
      type: 'text',
      question: 'Which city/RTO is the vehicle registered in?',
      validation: { required: true, minLength: 2 },
      next: 'policy_type',
    },
    {
      key: 'policy_type',
      type: 'button',
      question: 'Is this a new policy or a renewal?',
      options: [
        { id: 'new', title: 'New Policy' },
        { id: 'renewal', title: 'Renewal' },
      ],
      rules: [
        { if: { stepKey: 'policy_type', equals: 'renewal' }, goto: 'previous_claim' },
        { if: { stepKey: 'policy_type', equals: 'new' }, goto: 'confirmation' },
      ],
    },
    {
      key: 'previous_claim',
      type: 'button',
      question: 'Did you make any claim in the previous policy year?',
      options: [
        { id: 'yes', title: 'Yes' },
        { id: 'no', title: 'No' },
      ],
      rules: [
        { if: { stepKey: 'previous_claim', equals: 'yes' }, goto: 'confirmation' },
        { if: { stepKey: 'previous_claim', equals: 'no' }, goto: 'ncb_percentage' },
      ],
    },
    {
      key: 'ncb_percentage',
      type: 'list',
      question: 'What is your No Claim Bonus (NCB)?',
      options: [
        { id: '0', title: '0% — No NCB' },
        { id: '20', title: '20% — 1 year' },
        { id: '25', title: '25% — 2 years' },
        { id: '35', title: '35% — 3 years' },
        { id: '45', title: '45% — 4 years' },
        { id: '50', title: '50% — 5+ years' },
      ],
      next: 'confirmation',
    },
    {
      key: 'confirmation',
      type: 'confirmation',
      question: 'Please confirm your details are correct and we will get your quotation.',
      options: [
        { id: 'confirm', title: 'Confirm & Get Quote' },
        { id: 'edit', title: 'Edit Details' },
      ],
    },
  ],
};
