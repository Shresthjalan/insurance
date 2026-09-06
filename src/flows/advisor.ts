import type { FlowDefinition } from '../types';

export const advisorFlow: FlowDefinition = {
  flow: 'advisor',
  version: 1,
  initialStep: 'preferred_date',
  steps: [
    {
      key: 'preferred_date',
      type: 'button',
      question: 'What day would be convenient for an advisor to call you?',
      options: [
        { id: 'today', title: 'Today' },
        { id: 'tomorrow', title: 'Tomorrow' },
        { id: 'choose_date', title: 'Choose a Date' },
      ],
      rules: [
        { if: { stepKey: 'preferred_date', equals: 'choose_date' }, goto: 'custom_date' },
      ],
      next: 'preferred_time',
    },
    {
      key: 'custom_date',
      type: 'date',
      question: 'Please enter your preferred date (DD/MM/YYYY):',
      validation: { required: true, format: 'date' },
      next: 'preferred_time',
    },
    {
      key: 'preferred_time',
      type: 'list',
      question: 'What time would you prefer?',
      options: [
        { id: '10:00', title: '10:00 AM' },
        { id: '13:00', title: '1:00 PM' },
        { id: '15:00', title: '3:00 PM' },
        { id: '18:00', title: '6:00 PM' },
        { id: 'choose_time', title: 'Choose Time' },
      ],
      rules: [
        { if: { stepKey: 'preferred_time', equals: 'choose_time' }, goto: 'custom_time' },
      ],
      next: 'confirmation',
    },
    {
      key: 'custom_time',
      type: 'time',
      question: 'Please enter your preferred time (HH:MM, 24-hour format):',
      validation: { required: true, format: 'time' },
      next: 'confirmation',
    },
    {
      key: 'confirmation',
      type: 'confirmation',
      question: 'Please confirm your appointment:',
      options: [
        { id: 'confirm', title: 'Confirm Appointment' },
        { id: 'change', title: 'Change Date/Time' },
      ],
    },
  ],
};
