import { AWS } from '@serverless/typescript';
import {
  activeCampaignAccount,
  activeCampaignToken,
  contentfulEventBridge,
  envAlias,
  eventBusSourceContentful,
  isProd,
  queueArn,
  queueUrl,
  sentryDsnHandlers,
  sesRegion,
} from './shared';

const googleCalendarEnvironment = {
  GOOGLE_API_CREDENTIALS_SECRET_ID: `google-api-credentials-${envAlias}`,
  GOOGLE_API_TOKEN: `\${ssm:google-api-token-${envAlias}}`,
  SENTRY_DSN: sentryDsnHandlers,
  LOG_LEVEL: 'warn',
};

const activeCampaignEnvironment = {
  ACTIVE_CAMPAIGN_ACCOUNT: activeCampaignAccount,
  ACTIVE_CAMPAIGN_TOKEN: activeCampaignToken,
  SENTRY_DSN: sentryDsnHandlers,
};

export const asyncFunctions: AWS['functions'] = {
  gcalSubscribeCalendarContentful: {
    handler: './src/handlers/calendar/gcal-subscribe-handler.handler',
    events: contentfulEventBridge(['CalendarsPublished']),
    environment: googleCalendarEnvironment,
  },
  gcalUnsubscribeCalendarsContentful: {
    handler: './src/handlers/calendar/gcal-unsubscribe-handler.handler',
    timeout: 120,
    events: [
      {
        schedule: 'cron(0 1 * * ? *)',
      },
    ],
    environment: googleCalendarEnvironment,
  },
  syncActiveCampaignContact: {
    // Hits the 16s provider default when ActiveCampaign responds slowly.
    timeout: 120,
    handler: './src/handlers/user/sync-active-campaign-contact.handler',
    events: contentfulEventBridge(['UsersPublished']),
    environment: activeCampaignEnvironment,
  },
  syncActiveCampaignTeamMemberStatus: {
    handler:
      './src/handlers/teams/sync-active-campaign-team-member-status.handler',
    events: contentfulEventBridge(['TeamsPublished']),
    environment: activeCampaignEnvironment,
  },
  syncUserOrcidContentful: {
    // Hits the 16s provider default on slow ORCID responses; matches
    // cronjobSyncOrcidContentful.
    timeout: 120,
    handler: './src/handlers/user/sync-orcid-handler.handler',
    events: contentfulEventBridge(['UsersPublished'], {
      maximumRetryAttempts: 2,
    }),
    environment: {
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
  inviteEventForwarder: {
    handler: 'src/handlers/user/forward-invite-handler.handler',
    events: contentfulEventBridge(['UsersPublished'], {
      maximumRetryAttempts: 2,
    }),
    environment: {
      QUEUE_URL: queueUrl('invite-user-queue'),
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
  inviteUserContentful: {
    timeout: 120,
    handler: 'src/handlers/user/invite-handler.sqsHandler',
    events: [
      {
        sqs: {
          arn: queueArn('invite-user-queue'),
          batchSize: 1,
        },
      },
    ],
    environment: {
      SES_REGION: sesRegion,
      EMAIL_SENDER: `\${ssm:email-invite-sender-${envAlias}}`,
      EMAIL_BCC: `\${ssm:email-invite-bcc-${envAlias}}`,
      EMAIL_RETURN: `\${ssm:email-invite-return-${envAlias}}`,
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
  gcalEventsUpdatedContentfulProcess: {
    // A full calendar resync (invalidated syncToken) takes ~5 minutes and
    // times out at 300.
    timeout: 600,
    handler:
      './src/handlers/webhooks/gcal-webhook-events-updated-process.handler',
    events: [
      {
        sqs: {
          arn: queueArn('google-calendar-event-queue'),
          batchSize: 1,
          maximumConcurrency: 2,
        },
      },
    ],
    environment: {
      GOOGLE_API_CREDENTIALS_SECRET_ID: `google-api-credentials-${envAlias}`,
      SENTRY_DSN: sentryDsnHandlers,
      LOG_LEVEL: 'warn',
    },
  },
  updateContentfulWorkingGroupDeliverables: {
    handler: './src/handlers/working-group/update-deliverables-handler.handler',
    // Shortened: the default name would exceed Lambda's 64-char limit on the
    // production stage.
    name: '${self:service}-${self:provider.stage}-updateWorkingGroupDeliverables',
    events: contentfulEventBridge(['WorkingGroupsPublished']),
    environment: {
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
  syncInterestGroupEventAttendance: {
    handler:
      './src/handlers/event/sync-interest-group-event-attendance-handler.handler',
    name: '${self:service}-${self:provider.stage}-syncIGEventAttendance',
    timeout: 300,
    reservedConcurrency: 1,
    events: contentfulEventBridge([
      'InterestGroupsPublished',
      'InterestGroupsTeamsPublished',
    ]),
    environment: {
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
  ...(isProd && {
    complianceSpreadsheetEntryHandler: {
      handler:
        './src/handlers/compliance-sheet/compliance-entry-handler.handler',
      events: contentfulEventBridge([
        'ManuscriptVersionsPublished',
        'ManuscriptsPublished',
        'ProjectsPublished',
        'ComplianceReportsPublished',
        'UsersPublished',
        'TeamsPublished',
        'LabsPublished',
        'ExternalAuthorsPublished',
        'ImpactPublished',
        'CategoryPublished',
        'ManuscriptVersionsUnpublished',
        'ManuscriptsUnpublished',
        'UsersUnpublished',
        'TeamsUnpublished',
        'ProjectsUnpublished',
        'ComplianceReportsUnpublished',
        'LabsUnpublished',
        'ExternalAuthorsUnpublished',
        'CategoryUnpublished',
        'ImpactUnpublished',
      ]),
      environment: {
        SENTRY_DSN: sentryDsnHandlers,
        COMPLIANCE_DOC_SYNC_QUEUE_URL: queueUrl('compliance-doc-sync-queue'),
      },
    },
    complianceSpreadsheetSyncHandler: {
      handler:
        './src/handlers/compliance-sheet/compliance-spreadsheet-sync-handler.handler',
      timeout: 40,
      reservedConcurrency: 1,
      events: [
        {
          sqs: {
            arn: queueArn('compliance-doc-sync-queue'),
            batchSize: 5,
          },
        },
      ],
      environment: {
        SENTRY_DSN: sentryDsnHandlers,
        COMPLIANCE_LIVE_SHEET_ID: `\${ssm:compliance-live-sheet-id}`,
        GOOGLE_API_CREDENTIALS_SECRET_ID: `google-api-credentials-prod`,
      },
    },
  }),
  contentfulWebhookPoller: {
    handler: './src/handlers/webhooks/webhook-contentful-poller.handler',
    timeout: 20,
    reservedConcurrency: 2,
    events: [
      {
        sqs: {
          arn: queueArn('contentful-poller-queue'),
          batchSize: 1,
          maximumConcurrency: 2,
        },
      },
    ],
    environment: {
      EVENT_BUS: 'asap-events-${self:provider.stage}',
      EVENT_SOURCE: eventBusSourceContentful,
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
  cronjobSyncOrcidContentful: {
    handler: './src/handlers/user/cronjob-sync-orcid.handler',
    timeout: 120,
    events: [
      {
        schedule: 'rate(1 hour)', // run every hour
      },
    ],
    environment: {
      SENTRY_DSN: sentryDsnHandlers,
    },
  },
};
