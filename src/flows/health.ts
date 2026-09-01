import type { FlowDefinition } from '../types';

export const healthQuotationFlow: FlowDefinition = {
  flow: 'health_quotation',
  version: 1,
  initialStep: 'policy_type',
  steps: [
    {
      key: 'policy_type',
      type: 'button',
      question: 'Is this policy for yourself or your family?',
      options: [
        { id: 'individual', title: 'Individual' },
        { id: 'family', title: 'Family Floater' },
      ],
      rules: [
        { if: { stepKey: 'policy_type', equals: 'family' }, goto: 'member_count' },
        { if: { stepKey: 'policy_type', equals: 'individual' }, goto: 'self_age' },
      ],
    },

    // Individual path
    {
      key: 'self_age',
      type: 'number',
      question: 'What is your age?',
      validation: { required: true, min: 18, max: 65, format: 'numeric' },
      next: 'self_gender',
    },
    {
      key: 'self_gender',
      type: 'button',
      question: 'What is your gender?',
      options: [
        { id: 'male', title: 'Male' },
        { id: 'female', title: 'Female' },
        { id: 'other', title: 'Other' },
      ],
      next: 'city',
    },

    // Family path
    {
      key: 'member_count',
      type: 'list',
      question: 'How many members do you want to cover?',
      options: [
        { id: '2', title: '2 members' },
        { id: '3', title: '3 members' },
        { id: '4', title: '4 members' },
        { id: '5', title: '5 members' },
        { id: '6', title: '6+ members' },
      ],
      next: 'members_details',
    },
    {
      key: 'members_details',
      type: 'form',
      question: 'Please provide details for each family member (relationship, age, gender):',
      validation: { required: true },
      next: 'city',
    },

    // Common steps
    {
      key: 'city',
      type: 'text',
      question: 'Which city are you based in?',
      validation: { required: true, minLength: 2 },
      next: 'sum_insured',
    },
    {
      key: 'sum_insured',
      type: 'list',
      question: 'What coverage amount would you prefer?',
      options: [
        { id: '300000', title: '3 Lakh' },
        { id: '500000', title: '5 Lakh' },
        { id: '1000000', title: '10 Lakh' },
        { id: '1500000', title: '15 Lakh' },
        { id: '2000000', title: '20 Lakh' },
        { id: '3000000', title: '30 Lakh' },
        { id: '5000000', title: '50 Lakh' },
      ],
      next: 'policy_tenure',
    },
    {
      key: 'policy_tenure',
      type: 'button',
      question: 'How many years of coverage would you like?',
      options: [
        { id: '1', title: '1 Year' },
        { id: '2', title: '2 Years' },
        { id: '3', title: '3 Years' },
      ],
      next: 'pre_existing',
    },
    {
      key: 'pre_existing',
      type: 'button',
      question: 'Does any member have a pre-existing medical condition?',
      options: [
        { id: 'yes', title: 'Yes' },
        { id: 'no', title: 'No' },
      ],
      rules: [
        { if: { stepKey: 'pre_existing', equals: 'yes' }, goto: 'pre_existing_details' },
        { if: { stepKey: 'pre_existing', equals: 'no' }, goto: 'confirmation' },
      ],
    },
    {
      key: 'pre_existing_details',
      type: 'text',
      question: 'Please briefly describe the pre-existing conditions:',
      validation: { required: true, maxLength: 500 },
      next: 'confirmation',
    },
    {
      key: 'confirmation',
      type: 'confirmation',
      question: 'Your details are ready. Shall we get your health insurance quotes?',
      options: [
        { id: 'confirm', title: 'Get Quotes' },
        { id: 'edit', title: 'Edit Details' },
      ],
    },
  ],
};
