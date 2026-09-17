import type {
  gp2 as gp2Auth,
  User,
  UserTeamRoles,
  UserWorkingGroupRoles,
} from '@asap-hub/auth';
import type {
  gp2 as gp2Model,
  UserMetadataResponse,
  UserTeam,
  WorkingGroupMembership,
} from '@asap-hub/model';
import { Auth0PostLoginApi } from '@vedicium/auth0-actions-sdk';
import got from 'got';
import { URL, URLSearchParams } from 'url';
import { Auth0PostLoginEventWithSecrets } from './types';

/* eslint-disable no-console */

type Auth0UserResponse = UserMetadataResponse | gp2Model.UserMetadataResponse;

const isUserMetadataResponse = (
  response: UserMetadataResponse | gp2Model.UserMetadataResponse,
): response is UserMetadataResponse => 'teams' in response;

const parseCommonUserMetadata = ({
  id,
  email,
  algoliaApiKey,
  displayName,
  firstName,
  lastName,
  avatarUrl,
  onboarded,
}: Auth0UserResponse) => ({
  id,
  email,
  algoliaApiKey,
  displayName,
  firstName,
  lastName,
  avatarUrl,
  onboarded,
});
const parseGP2UserMetadata = ({
  role,
  workingGroups,
  projects,
}: gp2Model.UserMetadataResponse) => ({
  role,
  workingGroups,
  projects,
});
// Collapse one-row-per-role membership lists into one entry per entity,
// collecting every role the user holds. Keeps the first non-role fields seen.
const groupRolesById = <
  TRole,
  TInput extends { id: string; role: TRole },
  TOutput extends { id: string; roles: TRole[] },
>(
  items: TInput[],
  toEntry: (item: TInput) => TOutput,
): TOutput[] =>
  items.reduce<TOutput[]>((grouped, item) => {
    const existing = grouped.find((entry) => entry.id === item.id);
    if (existing) {
      if (!existing.roles.includes(item.role)) {
        existing.roles.push(item.role);
      }
      return grouped;
    }
    return [...grouped, toEntry(item)];
  }, []);

const groupTeams = (teams: UserTeam[]): UserTeamRoles[] =>
  groupRolesById(teams, ({ id, displayName, inactiveSinceDate, role }) => ({
    id,
    displayName,
    inactiveSinceDate,
    roles: [role],
  }));

const groupWorkingGroups = (
  workingGroups: WorkingGroupMembership[],
): UserWorkingGroupRoles[] =>
  groupRolesById(workingGroups, ({ id, name, active, role }) => ({
    id,
    name,
    active,
    roles: [role],
  }));

// Projects and interest groups carry no role used in the nav, so collapsing
// repeats to one entry per id is lossless.
const uniqueById = <T extends { id: string }>(items: T[]): T[] =>
  items.reduce<T[]>(
    (unique, item) =>
      unique.some((existing) => existing.id === item.id)
        ? unique
        : [...unique, item],
    [],
  );

const parseUserMetadata = ({
  teams,
  workingGroups,
  interestGroups,
  projects,
  role,
  openScienceTeamMember,
  techSupport,
}: UserMetadataResponse) => ({
  teams: groupTeams(teams),
  workingGroups: groupWorkingGroups(workingGroups),
  interestGroups: uniqueById(interestGroups),
  projects: uniqueById(projects),
  role,
  openScienceTeamMember,
  techSupport,
});

const parseKRSyncMetadata = ({
  teams,
  role,
  openScienceTeamMember,
}: UserMetadataResponse) => ({
  teams: groupTeams(teams),
  role,
  openScienceTeamMember,
});
const extractUser = (response: Auth0UserResponse): User | gp2Auth.User => ({
  ...parseCommonUserMetadata(response),
  ...(isUserMetadataResponse(response)
    ? parseUserMetadata(response)
    : parseGP2UserMetadata(response)),
});

const fetchUserMetadata = (
  apiUrl: string,
  event: Auth0PostLoginEventWithSecrets,
) =>
  got(`${apiUrl}/webhook/users/${event.user.user_id}`, {
    headers: {
      Authorization: `Basic ${event.secrets.AUTH0_SHARED_SECRET}`,
    },
    // Auth0 actions are killed at 20s, so this can't go higher even though
    // the auth0FetchByCode lambda now allows 29s.
    timeout: 19000,
  }).json<Auth0UserResponse>();

const getApiUrls = (
  event: Auth0PostLoginEventWithSecrets,
): [string, string] => {
  const queryRedirectUri = new URLSearchParams(event.request.query).get(
    'redirect_uri',
  );
  const redirect_uri = queryRedirectUri ?? event.request.body.redirect_uri;
  if (!redirect_uri) {
    throw new Error('Missing redirect_uri');
  }
  const prUrlRegex = new RegExp(
    `https://(?<pr_number>[0-9]+).${
      event.secrets.BASE_PR_APP_DOMAIN ?? '##BASE_PR_APP_DOMAIN##'
    }`,
  );
  const matches = prUrlRegex.exec(redirect_uri);
  return [
    matches?.groups?.pr_number
      ? `https://api-${matches.groups.pr_number}.${
          event.secrets.BASE_PR_APP_DOMAIN ?? '##BASE_PR_APP_DOMAIN##'
        }`
      : event.secrets.API_URL ?? '##API_URL##',
    redirect_uri,
  ];
};

export const onExecutePostLogin = async (
  event: Auth0PostLoginEventWithSecrets,
  api: Auth0PostLoginApi,
) => {
  // the demo hub manages its own users in DynamoDB, so fetching metadata from
  // the CRN/GP2 API would deny anyone without a Contentful record
  if (
    event.secrets.DEMO_CLIENT_ID &&
    event.client.client_id === event.secrets.DEMO_CLIENT_ID
  ) {
    return true;
  }
  try {
    if (event.client.name === 'ASAP KR-Sync') {
      const apiUrl = event.secrets.API_URL ?? '##API_URL##';
      const response = await fetchUserMetadata(apiUrl, event);

      if (isUserMetadataResponse(response) && response.alumniSinceDate) {
        console.log('Rejecting KR-Sync login: User is alumni');
        return api.access.deny('alumni-user-access-denied');
      }

      if (isUserMetadataResponse(response)) {
        const dataSeerUser = parseKRSyncMetadata(response);
        api.idToken.setCustomClaim(
          new URL('/user', apiUrl).toString(),
          dataSeerUser,
        );
        console.log(
          `KR-Sync user metadata set: ${JSON.stringify(dataSeerUser)}`,
        );
      } else {
        console.log('Successfully verified KR-Sync user');
      }
      return true;
    }
    const [apiUrl, redirect_uri] = getApiUrls(event);
    console.log(
      `requesting metadata from ${apiUrl}/webhook/users/${event.user.user_id}`,
    );
    const response = await fetchUserMetadata(apiUrl, event);
    if (response.alumniSinceDate) {
      return api.access.deny('alumni-user-access-denied');
    }
    const user = extractUser(response);
    api.idToken.setCustomClaim(new URL('/user', redirect_uri).toString(), user);
    if (event.secrets.AUTH0_ADDITIONAL_CLAIM_DOMAIN) {
      api.idToken.setCustomClaim(
        new URL(
          '/user',
          event.secrets.AUTH0_ADDITIONAL_CLAIM_DOMAIN,
        ).toString(),
        user,
      );
    }
    console.log(`Success user metadata: ${JSON.stringify(user)}`);
  } catch (err) {
    console.log(`Error: ${JSON.stringify(err)}`);
    const errorMessage =
      err instanceof Error ? err.message : 'Unexpected Error';

    return api.access.deny(errorMessage);
  }
  return true;
};
