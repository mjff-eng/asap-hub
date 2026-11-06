import { gp2 as gp2Model, UserMetadataResponse } from '@asap-hub/model';
import { Auth0PostLoginApi } from '@vedicium/auth0-actions-sdk';
import nock from 'nock';

import { onExecutePostLogin } from '../post-login-add-metadata';
import type {
  Auth0PostLoginEventWithSecrets,
  DeepPartial,
  User,
} from '../types';

const user: User = {
  created_at: '2020-08-17T14:01:53.691Z',
  email: 'joao.tiago@example.com',
  email_verified: true,
  family_name: 'Tiago',
  given_name: 'Joao',
  identities: [
    {
      provider: 'google-oauth2',
      access_token: 'accessToken',
      expires_in: 3599,
      user_id: 'userId',
      connection: 'google-oauth2',
      isSocial: true,
    },
  ],
  locale: 'en',
  name: 'Joao Tiago',
  nickname: 'joao.tiago',
  picture:
    'https://lh3.googleusercontent.com/a-/AOh14GhcUymAYADTOFTtS7zHdsWbfi2AbCIbpBtxAdNWug',
  updated_at: '2020-08-21T09:19:39.985Z',
  user_id: 'google-oauth2|JTsUserId',
};

const apiUrl = 'http://api.example.com';

const eventBase = {
  request: {
    query: {
      redirect_uri: 'http://example.com',
    },
    body: {},
  },
  client: {
    name: 'ASAP Hub',
    client_id: 'hub_id',
    metadata: {},
  },
  user,
  secrets: {
    API_URL: apiUrl,
    AUTH0_SHARED_SECRET: '',
    BASE_PR_APP_DOMAIN: '',
    AUTH0_ADDITIONAL_CLAIM_DOMAIN: '',
  },
} as DeepPartial<Auth0PostLoginEventWithSecrets> as Auth0PostLoginEventWithSecrets;

const apiBase = {
  access: {
    deny: jest.fn(),
  },
  idToken: {
    setCustomClaim: jest.fn(),
  },
} as Partial<Auth0PostLoginApi> as Auth0PostLoginApi;
beforeEach(() => {
  jest.clearAllMocks();
  nock.cleanAll();
});

describe('For a demo hub login', () => {
  const demoEvent = {
    ...eventBase,
    client: {
      ...eventBase.client,
      name: 'ASAP Demos',
      client_id: 'demo_client_id',
    },
    secrets: {
      ...eventBase.secrets,
      DEMO_CLIENT_ID: 'demo_client_id',
    },
  };

  it('lets the login through without fetching hub metadata', async () => {
    // no nock interceptor is set up, so any HTTP call would throw
    const result = await onExecutePostLogin(demoEvent, apiBase);

    expect(result).toBe(true);
    expect(apiBase.access.deny).not.toHaveBeenCalled();
    expect(apiBase.idToken.setCustomClaim).not.toHaveBeenCalled();
  });

  it('still fetches metadata for other clients when the secret is set', async () => {
    const hubEvent = {
      ...eventBase,
      secrets: {
        ...eventBase.secrets,
        DEMO_CLIENT_ID: 'demo_client_id',
      },
    };
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(404, { error: 'not found' });

    await onExecutePostLogin(hubEvent, apiBase);

    expect(apiBase.access.deny).toHaveBeenCalled();
  });
});

describe('For an ASAP KR-Sync login', () => {
  const krSyncEvent = {
    ...eventBase,
    client: {
      ...eventBase.client,
      name: 'ASAP KR-Sync',
    },
  };

  const baseUser: UserMetadataResponse = {
    onboarded: true,
    displayName: 'Joao Tiago',
    firstName: 'Joao',
    lastName: 'Tiago',
    email: 'joao.tiago@example.com',
    id: 'myRandomId123',
    lastModifiedDate: '2020-08-21T14:23:31.924Z',
    createdDate: '2020-08-21T14:23:31.924Z',
    teams: [
      {
        id: 'team-1',
        displayName: 'Team 1',
        role: 'Lead PI (Core Leadership)',
      },
    ],
    tags: [],
    questions: [],
    workingGroups: [],
    interestGroups: [],
    projects: [],
    role: 'Grantee',
    openScienceTeamMember: false,
    techSupport: false,
    algoliaApiKey: 'test-api-key',
  };

  it('sets team and openScienceTeamMember claims for CRN users', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, id: '42', openScienceTeamMember: true });

    await onExecutePostLogin(krSyncEvent, apiBase);

    expect(nock.isDone()).toBe(true);
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      `${apiUrl}/user`,
      {
        teams: [
          {
            id: 'team-1',
            displayName: 'Team 1',
            inactiveSinceDate: undefined,
            roles: ['Lead PI (Core Leadership)'],
          },
        ],
        role: 'Grantee',
        openScienceTeamMember: true,
      },
    );
    expect(apiBase.access.deny).not.toHaveBeenCalled();
  });

  it('groups multiple roles in the same team into one entry', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, {
        ...baseUser,
        id: '42',
        teams: [
          {
            id: 'team-1',
            displayName: 'Team 1',
            role: 'Lead PI (Core Leadership)',
          },
          { id: 'team-1', displayName: 'Team 1', role: 'Project Manager' },
        ],
      });

    await onExecutePostLogin(krSyncEvent, apiBase);

    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      `${apiUrl}/user`,
      expect.objectContaining({
        teams: [
          {
            id: 'team-1',
            displayName: 'Team 1',
            inactiveSinceDate: undefined,
            roles: ['Lead PI (Core Leadership)', 'Project Manager'],
          },
        ],
      }),
    );
  });

  it('passes the AUTH0_SHARED_SECRET as a basic auth token', async () => {
    const token = 'KR_SYNC_SECRET';
    nock(apiUrl, {
      reqheaders: { authorization: `Basic ${token}` },
    })
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, id: '42' });

    await onExecutePostLogin(
      {
        ...krSyncEvent,
        secrets: { ...krSyncEvent.secrets, AUTH0_SHARED_SECRET: token },
      },
      apiBase,
    );

    expect(nock.isDone()).toBe(true);
  });

  it('denies access for alumni users', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, {
        ...baseUser,
        alumniSinceDate: '2024-01-01',
      });

    await onExecutePostLogin(krSyncEvent, apiBase);

    expect(apiBase.access.deny).toHaveBeenCalledWith(
      'alumni-user-access-denied',
    );
    expect(apiBase.idToken.setCustomClaim).not.toHaveBeenCalled();
  });

  it('denies access if the webhook returns an error (unknown user)', async () => {
    nock(apiUrl).get(`/webhook/users/${user.user_id}`).reply(404);

    await onExecutePostLogin(krSyncEvent, apiBase);

    expect(apiBase.access.deny).toHaveBeenCalledWith(
      'Response code 404 (Not Found)',
    );
    expect(apiBase.idToken.setCustomClaim).not.toHaveBeenCalled();
  });

  it('does not set claims for non-CRN (GP2) users', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { id: '42', role: 'Trainee' });

    await onExecutePostLogin(krSyncEvent, apiBase);

    expect(apiBase.access.deny).not.toHaveBeenCalled();
    expect(apiBase.idToken.setCustomClaim).not.toHaveBeenCalled();
  });
});

it('denies login if the redirect_uri is missing from query and body', async () => {
  await onExecutePostLogin(
    {
      ...eventBase,
      request: {
        ...eventBase.request,
        query: {},
        body: {},
      },
    },
    apiBase,
  );
  expect(apiBase.access.deny).toHaveBeenCalledWith('Missing redirect_uri');
});

it('uses API_URL when the query redirect uri is not a PR URL', async () => {
  const exampleApiUrl = 'http://api2.example.com';
  nock(exampleApiUrl).get(`/webhook/users/${user.user_id}`).reply(200);
  await onExecutePostLogin(
    {
      ...eventBase,
      request: {
        ...eventBase.request,
        query: {
          redirect_uri: 'NOTPR',
        },
        body: {},
      },
      secrets: {
        ...eventBase.secrets,
        API_URL: exampleApiUrl,
      },
    },
    apiBase,
  );
  expect(nock.isDone()).toBe(true);
});

it('constructs PR backend API from query redirect_uri', async () => {
  nock('https://api-123.hub.example.com')
    .get(`/webhook/users/${user.user_id}`)
    .reply(200);
  await onExecutePostLogin(
    {
      ...eventBase,
      request: {
        ...eventBase.request,
        body: {},
        query: {
          redirect_uri: 'https://123.hub.example.com',
        },
      },
      secrets: {
        ...eventBase.secrets,
        BASE_PR_APP_DOMAIN: 'hub.example.com',
      },
    },
    apiBase,
  );
  expect(nock.isDone()).toBe(true);
});

it('constructs PR backend API from body redirect_uri', async () => {
  nock('https://api-123.hub.example.com')
    .get(`/webhook/users/${user.user_id}`)
    .reply(200);
  await onExecutePostLogin(
    {
      ...eventBase,
      request: {
        ...eventBase.request,
        query: {},
        body: {
          redirect_uri: 'https://123.hub.example.com',
        },
      },
      secrets: {
        ...eventBase.secrets,
        BASE_PR_APP_DOMAIN: 'hub.example.com',
      },
    },
    apiBase,
  );
  expect(nock.isDone()).toBe(true);
});

it('denies login if the backend throws an error', async () => {
  nock(apiUrl).get(`/webhook/users/${user.user_id}`).reply(404);

  await onExecutePostLogin(eventBase, apiBase);
  expect(apiBase.access.deny).toHaveBeenCalledWith(
    'Response code 404 (Not Found)',
  );
});

it('passes the AUTH0_SHARED_SECRET as a bearer token', async () => {
  const token = 'SECRET_KEY';
  nock(apiUrl, {
    reqheaders: {
      authorization: `Basic ${token}`,
    },
  })
    .get(`/webhook/users/${user.user_id}`)
    .reply(200);

  await onExecutePostLogin(
    {
      ...eventBase,
      secrets: {
        ...eventBase.secrets,
        AUTH0_SHARED_SECRET: token,
      },
    },
    apiBase,
  );
  expect(nock.isDone()).toBe(true);
});

describe('For a CRN login', () => {
  const baseUser: UserMetadataResponse = {
    onboarded: true,
    displayName: 'Joao Tiago',
    firstName: 'Joao',
    lastName: 'Tiago',
    email: 'joao.tiago@example.com',
    id: 'myRandomId123',
    lastModifiedDate: '2020-08-21T14:23:31.924Z',
    createdDate: '2020-08-21T14:23:31.924Z',
    teams: [
      {
        id: 'team-1',
        displayName: 'Team 1',
        role: 'Lead PI (Core Leadership)',
      },
    ],
    tags: [],
    questions: [],
    workingGroups: [],
    interestGroups: [],
    projects: [],
    role: 'Grantee',
    openScienceTeamMember: false,
    techSupport: false,
    algoliaApiKey: 'test-api-key',
  };
  it('adds the user metadata on successful fetch for crn', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, id: '42' });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({ id: '42' }),
    );
  });

  it('groups multiple roles in the same team and working group into one entry', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, {
        ...baseUser,
        id: '42',
        teams: [
          {
            id: 'team-1',
            displayName: 'Team 1',
            role: 'Lead PI (Core Leadership)',
          },
          { id: 'team-1', displayName: 'Team 1', role: 'Project Manager' },
        ],
        workingGroups: [
          { id: 'wg-1', name: 'WG 1', role: 'Chair', active: true },
          { id: 'wg-1', name: 'WG 1', role: 'Member', active: true },
        ],
      });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({
        teams: [
          {
            id: 'team-1',
            displayName: 'Team 1',
            inactiveSinceDate: undefined,
            roles: ['Lead PI (Core Leadership)', 'Project Manager'],
          },
        ],
        workingGroups: [
          {
            id: 'wg-1',
            name: 'WG 1',
            active: true,
            roles: ['Chair', 'Member'],
          },
        ],
      }),
    );
  });

  it('deduplicates repeated projects by id', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, {
        ...baseUser,
        id: '42',
        projects: [
          {
            id: 'project-1',
            title: 'Project 1',
            projectType: 'Discovery Project',
            status: 'Active',
          },
          {
            id: 'project-1',
            title: 'Project 1',
            projectType: 'Discovery Project',
            status: 'Active',
          },
        ],
      });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({
        projects: [
          {
            id: 'project-1',
            title: 'Project 1',
            projectType: 'Discovery Project',
            status: 'Active',
          },
        ],
      }),
    );
  });

  it('deduplicates repeated interest groups by id', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, {
        ...baseUser,
        id: '42',
        interestGroups: [
          { id: 'ig-1', name: 'Interest Group 1', active: true },
          { id: 'ig-1', name: 'Interest Group 1', active: true },
        ],
      });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({
        interestGroups: [
          { id: 'ig-1', name: 'Interest Group 1', active: true },
        ],
      }),
    );
  });

  it('rejects the login for alumni users', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, alumniSinceDate: 'date' });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.access.deny).toHaveBeenCalledWith(
      'alumni-user-access-denied',
    );
  });

  it('adds additional claim when AUTH0_ADDITIONAL_CLAIM_DOMAIN is set', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, id: '42' });

    await onExecutePostLogin(
      {
        ...eventBase,
        secrets: {
          ...eventBase.secrets,
          AUTH0_ADDITIONAL_CLAIM_DOMAIN: 'https://v2.example.com',
        },
      },
      apiBase,
    );
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({ id: '42' }),
    );
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'https://v2.example.com/user',
      expect.objectContaining({ id: '42' }),
    );
  });
});
describe('For a GP2 login', () => {
  const baseUser: gp2Model.UserMetadataResponse = {
    onboarded: true,
    displayName: 'Joao Tiago',
    firstName: 'Joao',
    lastName: 'Tiago',
    email: 'joao.tiago@example.com',
    id: 'myRandomId123',
    createdDate: '2020-08-21T14:23:31.924Z',
    role: 'Trainee',
    region: 'Europe',
    country: 'Portugal',
    stateOrProvince: 'Estremadura',
    degrees: [],
    outputs: [],
    positions: [],
    projects: [],
    projectIds: [],
    workingGroups: [],
    workingGroupIds: [],
    contributingCohorts: [],
    fundingStreams: undefined,
    tags: [],
    tagIds: [],
    questions: [],
    algoliaApiKey: 'test-api-key',
  };
  it('adds the user metadata on successful fetch for crn', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, id: '42' });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({ id: '42' }),
    );
  });

  it('rejects the login for alumni users', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, alumniSinceDate: '2026-06-16' });

    await onExecutePostLogin(eventBase, apiBase);
    expect(apiBase.access.deny).toHaveBeenCalledWith(
      'alumni-user-access-denied',
    );
    expect(apiBase.idToken.setCustomClaim).not.toHaveBeenCalled();
  });
  it('adds additional claim when AUTH0_ADDITIONAL_CLAIM_DOMAIN is set', async () => {
    nock(apiUrl)
      .get(`/webhook/users/${user.user_id}`)
      .reply(200, { ...baseUser, id: '42' });

    await onExecutePostLogin(
      {
        ...eventBase,
        secrets: {
          ...eventBase.secrets,
          AUTH0_ADDITIONAL_CLAIM_DOMAIN: 'https://v2.example.com',
        },
      },
      apiBase,
    );
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'http://example.com/user',
      expect.objectContaining({ id: '42' }),
    );
    expect(apiBase.idToken.setCustomClaim).toHaveBeenCalledWith(
      'https://v2.example.com/user',
      expect.objectContaining({ id: '42' }),
    );
  });
});
