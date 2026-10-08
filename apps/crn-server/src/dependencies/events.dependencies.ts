import { getGraphQLClient as getContentfulGraphQLClient } from '@asap-hub/contentful';
import { AlertsSentry } from '@asap-hub/server-common';
import * as Sentry from '@sentry/serverless';
import {
  contentfulAccessToken,
  contentfulEnvId,
  contentfulSpaceId,
} from '../config';
import { EventContentfulDataProvider } from '../data-providers/contentful/event.data-provider';
import { EventDataProvider } from '../data-providers/types';
import { getContentfulRestClientFactory } from './clients.dependencies';

export const getEventDataProvider = (): EventDataProvider => {
  const contentfulGraphQLClient = getContentfulGraphQLClient({
    space: contentfulSpaceId,
    accessToken: contentfulAccessToken,
    environment: contentfulEnvId,
  });

  return new EventContentfulDataProvider(
    contentfulGraphQLClient,
    getContentfulRestClientFactory,
    new AlertsSentry(Sentry.captureException.bind(Sentry)),
  );
};
