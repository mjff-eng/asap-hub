import { validateInput } from '@asap-hub/server-common';
import { JSONSchemaType } from 'ajv';

type ReminderParameters = {
  timezone: string;
  isNewEventPageEnabled?: boolean;
};

const reminderParametersValidationSchema: JSONSchemaType<ReminderParameters> = {
  type: 'object',
  properties: {
    timezone: { type: 'string' },
    isNewEventPageEnabled: { type: 'boolean', nullable: true },
  },
  required: ['timezone'],
  additionalProperties: false,
};

export const validateReminderParameters = validateInput(
  reminderParametersValidationSchema,
  {
    skipNull: false,
    coerce: true,
  },
);
