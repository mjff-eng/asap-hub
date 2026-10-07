/* eslint-disable @typescript-eslint/no-non-null-assertion, no-console */
/**
 * Adds the teams of an event's interest group to the event's attendance
 * (with attended set to false) when they are missing. A team is added when
 * it is not inactive and is a member of the interest group at the point the event ends.
 * Existing attendance entries are not modified or removed.
 *
 * Events are read with the preview API so draft events are included. Draft events are updated but not
 * published.
 *
 * Usage:
 *   CONTENTFUL_SPACE_ID=<spaceId> \
 *   CONTENTFUL_MANAGEMENT_ACCESS_TOKEN=<cma token> \
 *   CONTENTFUL_ACCESS_TOKEN=<delivery token> \
 *   CONTENTFUL_PREVIEW_ACCESS_TOKEN=<preview token> \
 *   CONTENTFUL_ENV_ID=<environmentId> \
 *   DRY_RUN=true \
 *   yarn workspace @asap-hub/contentful migrate-event-attendance-interest-group-teams
 */
import fs from 'fs/promises';
import { resolve } from 'path';
import { RateLimiter } from 'limiter';
import { gql, GraphQLClient } from 'graphql-request';
import * as contentful from 'contentful-management';
import {
  getInterestGroupTeamIdsForEvent,
  InterestGroupTeamMembership,
} from '@asap-hub/model';
import { addLocaleToFields, createLink } from '../src/utils/parse-fields';

const spaceId = process.env.CONTENTFUL_SPACE_ID!;
const contentfulManagementAccessToken =
  process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN!;
const environmentId = process.env.CONTENTFUL_ENV_ID!;
const contentfulAccessToken = process.env.CONTENTFUL_ACCESS_TOKEN!;
const contentfulPreviewAccessToken =
  process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN!;
const dryRun = process.env.DRY_RUN === 'true';

const PAGE_SIZE = 20;
const NESTED_LIMIT = 50;

const createGraphQLClient = (accessToken: string) =>
  new GraphQLClient(
    `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/${environmentId}`,
    {
      errorPolicy: 'ignore',
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );

const graphQLClient = createGraphQLClient(contentfulAccessToken);
const previewGraphQLClient = createGraphQLClient(contentfulPreviewAccessToken);

const client = contentful.createClient({
  accessToken: contentfulManagementAccessToken,
});

const writeRateLimiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 5000,
});

const FETCH_EVENTS = gql`
  query FetchEventsForAttendanceMigration(
    $limit: Int!
    $skip: Int!
    $nestedLimit: Int!
  ) {
    eventsCollection(
      limit: $limit
      skip: $skip
      where: { calendar_exists: true }
      order: sys_id_ASC
      preview: true
    ) {
      total
      items {
        sys {
          id
        }
        title
        endDate
        attendanceCollection(limit: $nestedLimit) {
          items {
            team {
              sys {
                id
              }
            }
          }
        }
        calendar {
          sys {
            id
          }
        }
      }
    }
  }
`;

const FETCH_INTEREST_GROUP_TEAMS = gql`
  query FetchInterestGroupTeamsForAttendanceMigration(
    $calendarId: String!
    $nestedLimit: Int!
  ) {
    calendars(id: $calendarId) {
      linkedFrom {
        interestGroupsCollection(limit: 1) {
          items {
            teamsCollection(limit: $nestedLimit) {
              items {
                startDate
                endDate
                team {
                  sys {
                    id
                  }
                  inactiveSince
                }
              }
            }
          }
        }
      }
    }
  }
`;

type InterestGroupTeamItem = {
  startDate: string | null;
  endDate: string | null;
  team: { sys: { id: string }; inactiveSince: string | null } | null;
} | null;

type EventItem = {
  sys: { id: string };
  title: string | null;
  endDate: string | null;
  attendanceCollection: {
    items: ({ team: { sys: { id: string } } | null } | null)[];
  } | null;
  calendar: { sys: { id: string } } | null;
};

type FetchInterestGroupTeamsResult = {
  calendars: {
    linkedFrom: {
      interestGroupsCollection: {
        items: ({
          teamsCollection: { items: InterestGroupTeamItem[] } | null;
        } | null)[];
      } | null;
    } | null;
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
  teamIds: string[];
  error: string;
  timestamp: string;
};
const errors: UpdateError[] = [];

const stats = { scanned: 0, updated: 0, attendanceCreated: 0 };

const membershipsByCalendarId = new Map<
  string,
  Promise<InterestGroupTeamMembership[]>
>();

const fetchMemberships = async (
  calendarId: string,
): Promise<InterestGroupTeamMembership[]> => {
  const { calendars } =
    await graphQLClient.request<FetchInterestGroupTeamsResult>(
      FETCH_INTEREST_GROUP_TEAMS,
      { calendarId, nestedLimit: NESTED_LIMIT },
    );
  const interestGroup =
    calendars?.linkedFrom?.interestGroupsCollection?.items[0];

  return (interestGroup?.teamsCollection?.items ?? []).flatMap((item) =>
    item?.team && item.startDate
      ? [
          {
            teamId: item.team.sys.id,
            startDate: item.startDate,
            endDate: item.endDate,
            inactiveSince: item.team.inactiveSince,
          },
        ]
      : [],
  );
};

const getMemberships = (calendarId: string) => {
  if (!membershipsByCalendarId.has(calendarId)) {
    const memberships = fetchMemberships(calendarId);
    // drop failed requests from the cache so the next event retries them
    memberships.catch(() => membershipsByCalendarId.delete(calendarId));
    membershipsByCalendarId.set(calendarId, memberships);
  }
  return membershipsByCalendarId.get(calendarId)!;
};

const getMissingTeamIds = async (event: EventItem): Promise<string[]> => {
  const calendarId = event.calendar?.sys.id;

  if (!calendarId || !event.endDate) {
    return [];
  }

  const memberships = await getMemberships(calendarId);

  const existingTeamIds = new Set(
    (event.attendanceCollection?.items ?? []).flatMap((item) =>
      item?.team ? [item.team.sys.id] : [],
    ),
  );

  return getInterestGroupTeamIdsForEvent(memberships, event.endDate).filter(
    (teamId) => !existingTeamIds.has(teamId),
  );
};

const addAttendance = async (
  environment: contentful.Environment,
  eventId: string,
  teamIds: string[],
) => {
  await writeRateLimiter.removeTokens(1);
  const eventEntry = await environment.getEntry(eventId);
  // only republish events that had no pending draft changes
  const shouldPublish = eventEntry.isPublished() && !eventEntry.isUpdated();

  const links = [];
  for (const teamId of teamIds) {
    await writeRateLimiter.removeTokens(1);
    const attendanceEntry = await environment.createEntry('attendance', {
      fields: addLocaleToFields({ team: createLink(teamId), attended: false }),
    });
    await writeRateLimiter.removeTokens(1);
    await attendanceEntry.publish();
    links.push(createLink(attendanceEntry.sys.id));
    stats.attendanceCreated += 1;
  }

  eventEntry.fields.attendance = {
    'en-US': [...(eventEntry.fields.attendance?.['en-US'] ?? []), ...links],
  };

  await writeRateLimiter.removeTokens(1);
  const updated = await eventEntry.update();

  if (shouldPublish) {
    await writeRateLimiter.removeTokens(1);
    await updated.publish();
  } else {
    console.warn(
      `Event ${eventId} was not published or had draft changes; attendance saved but not published.`,
    );
  }
};

const processEvent = async (
  environment: contentful.Environment | null,
  event: EventItem,
) => {
  stats.scanned += 1;

  let teamIds: string[];
  try {
    teamIds = await getMissingTeamIds(event);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `Failed to fetch interest group teams for event ${event.sys.id}: ${message}`,
    );
    errors.push({
      eventId: event.sys.id,
      teamIds: [],
      error: message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (teamIds.length === 0) {
    return;
  }

  console.log(
    `Event ${event.sys.id} (${event.title}): adding teams ${teamIds.join(
      ', ',
    )}`,
  );
  stats.updated += 1;

  if (dryRun || !environment) {
    return;
  }

  try {
    await addAttendance(environment, event.sys.id, teamIds);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `Failed to add attendance to event ${event.sys.id}: ${message}`,
    );
    errors.push({
      eventId: event.sys.id,
      teamIds,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
};

const fetchEventsPage = (skip: number) =>
  previewGraphQLClient.request<FetchEventsResult>(FETCH_EVENTS, {
    limit: PAGE_SIZE,
    skip,
    nestedLimit: NESTED_LIMIT,
  });

const processPages = async (
  environment: contentful.Environment | null,
): Promise<void> => {
  let skip = 0;
  let total = 0;

  do {
    const { eventsCollection } = await fetchEventsPage(skip);
    total = eventsCollection?.total ?? 0;
    const items = (eventsCollection?.items ?? []).filter(
      (e): e is EventItem => e !== null,
    );

    for (const event of items) {
      await processEvent(environment, event);
    }

    skip += PAGE_SIZE;
    console.log(`Processed ${Math.min(skip, total)}/${total} events`);
  } while (skip < total);
};

const migrate = async () => {
  console.log(
    `Starting event attendance migration${
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
    const path = resolve(__dirname, './event-attendance-migration-errors.json');
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

  console.log(
    `\nScanned ${stats.scanned} events, ${
      dryRun ? 'would update' : 'updated'
    } ${stats.updated}, created ${stats.attendanceCreated} attendance entries.`,
  );
  console.log(`Done${dryRun ? ' (DRY RUN — no writes performed)' : ''}.`);
};

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});
