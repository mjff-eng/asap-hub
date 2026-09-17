/* eslint-disable @typescript-eslint/no-non-null-assertion, no-console */
import fs from 'fs/promises';
import { resolve } from 'path';
import { RateLimiter } from 'limiter';
import { gql, GraphQLClient } from 'graphql-request';
import * as contentful from 'contentful-management';
import { addLocaleToFields } from '../src/utils/parse-fields';

const spaceId = process.env.CONTENTFUL_SPACE_ID!;
const contentfulManagementAccessToken =
  process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN!;
const environmentId = process.env.CONTENTFUL_ENV_ID!;
const contentfulAccessToken = process.env.CONTENTFUL_ACCESS_TOKEN!;
const dryRun = process.env.DRY_RUN === 'true';

const PAGE_SIZE = 100;
const NESTED_LIMIT = 100;

const graphQLClient = new GraphQLClient(
  `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/${environmentId}`,
  {
    errorPolicy: 'ignore',
    headers: { authorization: `Bearer ${contentfulAccessToken}` },
  },
);

const client = contentful.createClient({
  accessToken: contentfulManagementAccessToken,
});

const writeRateLimiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 5000,
});

const FETCH_EVENTS = gql`
  query FetchEventsForPreliminaryDataMigration(
    $limit: Int!
    $skip: Int!
    $nestedLimit: Int!
  ) {
    eventsCollection(
      limit: $limit
      skip: $skip
      where: { speakersCollection_exists: true }
      order: sys_id_ASC
    ) {
      total
      items {
        sys {
          id
        }
        title
        speakersCollection(limit: $nestedLimit) {
          total
          items {
            sys {
              id
            }
            team {
              sys {
                id
              }
              displayName
            }
            user {
              __typename
              ... on Users {
                sys {
                  id
                }
                firstName
                lastName
              }
            }
          }
        }
        preliminaryDataSharedCollection(limit: $nestedLimit) {
          total
          items {
            sys {
              id
            }
            team {
              sys {
                id
              }
              displayName
            }
            preliminaryDataShared
          }
        }
      }
    }
  }
`;

type TeamRef = { sys: { id: string }; displayName: string | null } | null;

type SpeakerItem = {
  sys: { id: string };
  team: TeamRef;
  user:
    | ({ __typename: 'Users'; sys: { id: string } } & {
        firstName: string | null;
        lastName: string | null;
      })
    | { __typename: 'ExternalAuthors' }
    | null;
};

type PreliminaryDataSharedItem = {
  sys: { id: string };
  team: TeamRef;
  preliminaryDataShared: boolean | null;
};

type EventItem = {
  sys: { id: string };
  title: string | null;
  speakersCollection: {
    total: number;
    items: (SpeakerItem | null)[];
  } | null;
  preliminaryDataSharedCollection: {
    total: number;
    items: (PreliminaryDataSharedItem | null)[];
  } | null;
};

type FetchEventsResult = {
  eventsCollection: {
    total: number;
    items: (EventItem | null)[];
  } | null;
};

type UpdateError = {
  eventId: string;
  speakerId: string;
  teamId: string;
  value: boolean;
  error: string;
  timestamp: string;
};
const errors: UpdateError[] = [];

const updateSpeaker = async (
  environment: contentful.Environment | null,
  speakerId: string,
  value: boolean,
  context: {
    eventId: string;
    teamId: string;
  },
  options: { onlyIfUnset?: boolean } = {},
) => {
  if (dryRun || !environment) {
    return;
  }
  try {
    await writeRateLimiter.removeTokens(1);
    const speakerEntry = await environment.getEntry(speakerId);

    const current = speakerEntry.fields.preliminaryDataShared?.['en-US'] as
      | boolean
      | undefined
      | null;

    if (current === value) {
      return;
    }

    if (options.onlyIfUnset && current !== undefined && current !== null) {
      console.warn(
        `Skipping speaker ${speakerId} (event ${context.eventId}, team ${context.teamId}): keeping existing value ${current} instead of defaulting to ${value}.`,
      );
      return;
    }

    speakerEntry.fields = {
      ...speakerEntry.fields,
      ...addLocaleToFields({ preliminaryDataShared: value }),
    };

    await writeRateLimiter.removeTokens(1);
    const updated = await speakerEntry.update();

    await writeRateLimiter.removeTokens(1);
    await updated.publish();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `Failed to set preliminaryDataShared=${value} on speaker ${speakerId} (event ${context.eventId}, team ${context.teamId}): ${message}`,
    );
    errors.push({
      eventId: context.eventId,
      speakerId,
      teamId: context.teamId,
      value,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
};

const processEvent = async (
  environment: contentful.Environment | null,
  event: EventItem,
) => {
  const eventId = event.sys.id;

  const rawSpeakers = event.speakersCollection?.items ?? [];
  const rawPrelim = event.preliminaryDataSharedCollection?.items ?? [];
  const speakers = rawSpeakers.filter((s): s is SpeakerItem => s !== null);
  const prelimItems = rawPrelim.filter(
    (p): p is PreliminaryDataSharedItem => p !== null,
  );

  const prelimByTeam = prelimItems.reduce(
    (acc: Record<string, boolean | null>, item) => {
      const teamId = item.team?.sys.id;

      if (!teamId) return acc;

      if (teamId in acc) {
        console.warn(
          `There are two or more entries from the same team ${teamId} on event ${event.sys.id}`,
        );
      }

      acc[teamId] = item.preliminaryDataShared;
      return acc;
    },
    {} as Record<string, boolean | null>,
  );

  await Promise.all(
    speakers.map(async (speaker) => {
      const teamId = speaker.team?.sys.id;

      // If no team, default Prelim. Shared to "No"
      if (!teamId) {
        await updateSpeaker(
          environment,
          speaker.sys.id,
          false,
          { eventId, teamId: '' },
          { onlyIfUnset: true },
        );
        return;
      }

      if (!(teamId in prelimByTeam) || prelimByTeam[teamId] === null) {
        // When no old Prelim. Shared default to "No"
        await updateSpeaker(
          environment,
          speaker.sys.id,
          false,
          { eventId, teamId },
          { onlyIfUnset: true },
        );
        return;
      }

      // Populate new Prelim. Shared with previous value of Event Prelim. Shared from Event
      await updateSpeaker(
        environment,
        speaker.sys.id,
        Boolean(prelimByTeam[teamId]),
        {
          eventId,
          teamId,
        },
      );
    }),
  );
};

const fetchEventsPage = (skip: number) =>
  graphQLClient.request<FetchEventsResult>(FETCH_EVENTS, {
    limit: PAGE_SIZE,
    skip,
    nestedLimit: NESTED_LIMIT,
  });

const processPages = async (
  environment: contentful.Environment | null,
  skip = 0,
  processed = 0,
): Promise<void> => {
  const { eventsCollection } = await fetchEventsPage(skip);
  const total = eventsCollection?.total ?? 0;
  const items = (eventsCollection?.items ?? []).filter(
    (e): e is EventItem => e !== null,
  );

  await Promise.all(items.map((event) => processEvent(environment, event)));

  const nextProcessed = processed + items.length;
  console.log(`Processed ${nextProcessed}/${total} events`);

  const nextSkip = skip + PAGE_SIZE;
  if (items.length > 0 && nextSkip < total) {
    await processPages(environment, nextSkip, nextProcessed);
  }
};

const migrate = async () => {
  console.log(
    `Starting event speakers preliminaryDataShared migration${
      dryRun ? ' (DRY RUN — no writes performed)' : ''
    }...`,
  );

  let environment: contentful.Environment | null = null;
  if (!dryRun) {
    const space = await client.getSpace(spaceId);
    environment = await space.getEnvironment(environmentId);
  }

  await processPages(environment);

  if (errors.length > 0) {
    const path = resolve(
      __dirname,
      './event-speakers-preliminary-migration-errors.json',
    );
    await fs.writeFile(
      path,
      JSON.stringify(
        {
          totalErrors: errors.length,
          timestamp: new Date().toISOString(),
          errors,
        },
        null,
        2,
      ),
    );
    console.log(`\n${errors.length} update errors saved to: ${path}`);
  }

  console.log(`\nDone${dryRun ? ' (DRY RUN — no writes performed)' : ''}.`);
};

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});
