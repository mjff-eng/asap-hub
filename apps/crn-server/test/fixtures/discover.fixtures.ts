import {
  DiscoverDataObject,
  DiscoverResponse,
  UserResponse,
} from '@asap-hub/model';

const getDiscoverMembersResponse = (prefix = ''): UserResponse[] => [
  {
    id: `${prefix}uuid-members-1`,
    onboarded: true,
    createdDate: '2020-10-15T17:55:21.000Z',
    displayName: `${prefix}John (${prefix}Jack) ${prefix}Doe`,
    fullDisplayName: `${prefix}John (${prefix}Jack) ${prefix}Doe`,
    orcid: undefined,
    firstName: `${prefix}John`,
    lastName: `${prefix}Doe`,
    biography: undefined,
    degree: undefined,
    email: `${prefix}john@example.com`,
    contactEmail: undefined,
    country: undefined,
    city: undefined,
    orcidWorks: [],
    questions: [],
    expertiseAndResourceDescription: undefined,
    lastModifiedDate: '2020-10-15T17:55:21Z',
    teams: [],
    social: {},
    avatarUrl: `https://www.contentful.com/api/assets/asap-crn/${prefix}uuid-1`,
    role: 'Guest',
    openScienceTeamMember: false,
    techSupport: false,
    responsibilities: undefined,
    reachOut: undefined,
    labs: [],
    workingGroups: [],
    interestGroups: [],
    projects: [],
  },
  {
    id: `${prefix}uuid-members-2`,
    onboarded: true,
    createdDate: '2020-10-14T17:55:21.000Z',
    orcid: undefined,
    displayName: `${prefix}John (${prefix}Jack) ${prefix}Do`,
    fullDisplayName: `${prefix}John (${prefix}Jack) ${prefix}Do`,
    firstName: `${prefix}John`,
    lastName: `${prefix}Do`,
    biography: undefined,
    degree: undefined,
    email: '',
    contactEmail: undefined,
    country: undefined,
    city: undefined,
    orcidWorks: [],
    questions: [],
    expertiseAndResourceDescription: undefined,
    lastModifiedDate: '2020-10-15T17:55:21Z',
    teams: [],
    social: {},
    role: 'Guest',
    openScienceTeamMember: false,
    techSupport: false,
    responsibilities: undefined,
    reachOut: undefined,
    labs: [],
    workingGroups: [],
    interestGroups: [],
    projects: [],
  },
];

export const getDiscoverDataObject = (): DiscoverDataObject => ({
  aboutUs: '<p>content</p>',
  members: getDiscoverMembersResponse(),
  membersTeamId: 'uuid-team-1',
  scientificAdvisoryBoard: getDiscoverMembersResponse('sab-'),
  asapAreas: [
    {
      id: 'area-1',
      name: 'Events',
      objective: 'Plan and execute scientific meetings.',
      primaryEmail: 'meetings@example.com',
      secondaryEmail: 'cosa@example.com',
      members: [
        {
          id: 'area-user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          displayName: 'Jane Smith',
          avatarUrl: undefined,
        },
        {
          id: 'area-user-1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John (Jack) Doe',
          avatarUrl: 'https://www.contentful.com/api/assets/asap-crn/area-1',
        },
      ],
    },
  ],
});

export const getDiscoverResponse = (): DiscoverResponse =>
  getDiscoverDataObject();

export const getContentfulGraphqlDiscoverResponse = (props = {}) => ({
  discoverCollection: {
    items: [getContentfulGraphqlDiscover(props)],
  },
});

export const getContentfulGraphqlDiscoverMembers = () => [
  {
    sys: {
      id: 'uuid-members-1',
      firstPublishedAt: '2020-10-15T17:55:21.000Z',
      publishedAt: '2020-10-15T17:55:21Z',
    },
    lastUpdated: '2020-10-15T17:55:21Z',
    firstName: 'John',
    nickname: 'Jack',
    lastName: 'Doe',
    email: 'john@example.com',
    avatar: {
      url: `https://www.contentful.com/api/assets/asap-crn/uuid-1`,
    },
  },
  {
    sys: {
      id: 'uuid-members-2',
      firstPublishedAt: '2020-10-14T17:55:21.000Z',
      publishedAt: '2020-10-15T17:55:21Z',
    },
    lastUpdated: '2020-10-15T17:55:21Z',
    firstName: 'John',
    nickname: 'Jack',
    lastName: 'Do',
    email: '',
  },
];

export const getContentfulGraphqlAsapAreaMembership = ({
  id = 'area-user-1',
  firstName = 'John',
  nickname = 'Jack' as string | null,
  lastName = 'Doe',
  avatar = {
    url: 'https://www.contentful.com/api/assets/asap-crn/area-1',
  } as { url: string } | null,
  role = 'Project Manager' as string | null,
  inactiveSinceDate = null as string | null,
  onboarded = true,
  alumniSinceDate = null as string | null,
} = {}) => ({
  role,
  inactiveSinceDate,
  linkedFrom: {
    usersCollection: {
      items: [
        {
          sys: { id },
          onboarded,
          alumniSinceDate,
          firstName,
          nickname,
          lastName,
          avatar,
        },
      ],
    },
  },
});

export const getContentfulGraphqlAsapArea = (props = {}) => ({
  sys: { id: 'area-1' },
  name: 'Events',
  objective: 'Plan and execute scientific meetings.',
  primaryEmail: 'meetings@example.com',
  secondaryEmail: 'cosa@example.com',
  membersCollection: {
    items: [{ sys: { id: 'area-user-2' } }, { sys: { id: 'area-user-1' } }],
  },
  linkedFrom: {
    teamMembershipCollection: {
      items: [
        getContentfulGraphqlAsapAreaMembership(),
        getContentfulGraphqlAsapAreaMembership({
          id: 'area-user-2',
          firstName: 'Jane',
          nickname: null,
          lastName: 'Smith',
          avatar: null,
        }),
      ],
    },
  },
  ...props,
});

export const getContentfulGraphqlDiscover = (props = {}) => ({
  membersCollection: {
    items: getContentfulGraphqlDiscoverMembers(),
  },
  membersTeam: {
    sys: {
      id: 'uuid-team-1',
    },
  },
  scientificAdvisoryBoardCollection: {
    items: [
      {
        sys: {
          id: 'sab-uuid-members-1',
          firstPublishedAt: '2020-10-15T17:55:21.000Z',
          publishedAt: '2020-10-15T17:55:21Z',
        },
        firstName: 'sab-John',
        nickname: 'sab-Jack',
        lastName: 'sab-Doe',
        email: 'sab-john@example.com',
        avatar: {
          url: `https://www.contentful.com/api/assets/asap-crn/sab-uuid-1`,
        },
        lastUpdated: '2020-10-15T17:55:21Z',
      },
      {
        sys: {
          id: 'sab-uuid-members-2',
          firstPublishedAt: '2020-10-14T17:55:21.000Z',
          publishedAt: '2020-10-15T17:55:21Z',
        },
        firstName: 'sab-John',
        nickname: 'sab-Jack',
        lastName: 'sab-Do',
        email: '',
        lastUpdated: '2020-10-15T17:55:21Z',
      },
    ],
  },
  asapAreasCollection: {
    items: [getContentfulGraphqlAsapArea()],
  },
  aboutUs: {
    json: {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            { nodeType: 'text', value: 'content', marks: [], data: {} },
          ],
        },
      ],
    },
    links: {
      entries: {
        inline: [],
      },
      assets: {
        block: [],
      },
    },
  },
  ...props,
});
