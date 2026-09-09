import { EventUpdateDetailsRequest, FetchEventsOptions } from '@asap-hub/model';
import {
  fetchOptionsValidationSchema,
  validateInput,
} from '@asap-hub/server-common';
import { JSONSchemaType } from 'ajv';

const eventFetchValidationSchema: JSONSchemaType<FetchEventsOptions> = {
  type: 'object',
  properties: {
    ...fetchOptionsValidationSchema.properties,
    groupId: { type: 'string', nullable: true },
    sortBy: {
      type: 'string',
      enum: ['startDate', 'endDate'],
      default: 'startDate',
    },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
    before: { type: 'string', format: 'date-time' },
    after: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
  required: [],
  dependencies: {
    sortBy: ['sortOrder'],
    sortOrder: ['sortBy'],
  },
};

export const validateEventFetchParameters = validateInput(
  eventFetchValidationSchema,
  {
    skipNull: true,
    coerce: true,
  },
);

type EventParameters = {
  eventId: string;
};

const eventParametersValidationSchema: JSONSchemaType<EventParameters> = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
  },
  required: ['eventId'],
  additionalProperties: false,
};

export const validateEventParameters = validateInput(
  eventParametersValidationSchema,
  {
    skipNull: false,
    coerce: true,
  },
);

const eventUpdateDetailsValidationSchema: JSONSchemaType<EventUpdateDetailsRequest> =
  {
    type: 'object',
    properties: {
      attendance: {
        type: 'array',
        nullable: true,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', nullable: true },
            teamId: { type: 'string' },
            attended: { type: 'boolean' },
          },
          required: ['teamId', 'attended'],
          additionalProperties: false,
        },
      },
      speakersToRemove: {
        type: 'array',
        nullable: true,
        items: { type: 'string' },
      },
      preliminaryDataShared: {
        type: 'array',
        nullable: true,
        items: {
          type: 'object',
          properties: {
            teamId: { type: 'string' },
            shared: { type: 'boolean' },
          },
          required: ['teamId', 'shared'],
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
    required: [],
  };

export const validateEventUpdateDetailsPayload = validateInput(
  eventUpdateDetailsValidationSchema,
  {
    skipNull: true,
    coerce: true,
  },
);
