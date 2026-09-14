import {
  ContentfulWebhookPayload,
  gp2 as gp2Contentful,
} from '@asap-hub/contentful';
import { gp2 as gp2Model, WebhookDetail } from '@asap-hub/model';
import { EventBridgeEvent } from 'aws-lambda';
import { createEventBridgeEventMock } from '../helpers/events';
import { getContentfulGraphqlOutput } from './output.fixtures';

export const getUserResponse = (
  overrides: Partial<gp2Model.UserResponse> = {},
): gp2Model.UserResponse => ({
  id: 'user-id-1',
  systemPublishedVersion: 23,
  lastModifiedDate: '2023-07-06T07:23:32.000Z',
  activeCampaignId: '1',
  avatarUrl: 'https://example.com',
  createdDate: '2020-09-23T20:45:22.000Z',
  activatedDate: '2020-09-24T20:45:22.000Z',
  email: 'T@ark.io',
  firstName: 'Tony',
  middleName: 'Edward',
  lastName: 'Stark',
  nickname: 'Iron Man',
  displayName: 'Tony (Iron Man) Stark',
  fullDisplayName: 'Tony (Iron Man) E. Stark',
  region: 'Europe',
  degrees: ['MPH'],
  role: 'Trainee',
  city: 'Madrid',
  stateOrProvince: 'Madrid',
  country: 'Spain',
  positions: [
    {
      role: 'CEO',
      department: 'Research',
      institution: 'Stark Industries',
    },
  ],
  onboarded: true,
  alumniSinceDate: '2022-06-30T00:00:00.000Z',
  alumniLocation: 'London',
  alumniLastUpdated: '2022-06-30T00:00:00.000Z',
  outputs: [
    {
      id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      title: 'Test Proposal 1234',
      shortDescription: 'A nice article',
      sharingStatus: 'Public',
      gp2Supported: 'Yes',
    },
  ],
  projects: [
    {
      id: 'test-project-id',
      members: [
        { role: 'Project co-lead', userId: 'user-id-0' },
        { role: 'Investigator', userId: 'user-id-1' },
      ],

      status: 'Active',
      title: 'Test Project',
    },
  ],
  projectIds: ['test-project-id'],
  workingGroups: [
    {
      id: 'test-working-group-id',
      members: [
        { userId: 'user-id-2', role: 'Lead' },
        { userId: 'user-id-3', role: 'Working group member' },
      ],
      title: 'Steering Committee',
      role: 'Co-lead',
    },
  ],
  workingGroupIds: ['test-working-group-id'],
  fundingStreams: 'A funding stream',
  contributingCohorts: [
    {
      contributingCohortId: 'cohort-id',
      name: 'CALYPSO',
      role: 'Investigator',
      studyUrl: 'http://example.com/study',
    },
  ],
  questions: [
    'What color was Iron Mans original armour?',
    'Who is the Stark family butler?',
  ],
  alternativeEmail: 'tony@stark.com',
  telephone: { countryCode: '+1', number: '212-970-4133' },
  biography: 'a biography of Tony Stark',
  tags: [
    { id: 'tag-1', name: 'BLAAC-PD' },
    { id: 'tag-2', name: 'Cohort' },
  ],
  tagIds: ['tag-1', 'tag-2'],
  social: {
    googleScholar: 'https://scholar.google.com',
    orcid: 'https://orcid.org/1234-5678-9123-4567',
    blog: 'https://www.blogger.com',
    twitter: 'https://twitter.com',
    linkedIn: 'https://www.linkedin.com',
    github: 'https://github.com',
    researchGate: 'https://researchid.com/rid/',
    researcherId: 'https://researcherid.com/rid/',
    blueSky: 'https://bsky.app/profile/yourprofilename',
    threads: 'https://www.threads.net/@yourprofilename',
  },
  orcidWorks: [
    {
      doi: 'test-doi',
      id: '123-456-789',
      lastModifiedDate: '2020-10-26T15:33:18Z',
      publicationDate: {},
      type: 'ANNOTATION',
      title: 'orcid work title',
    },
  ],
  orcid: '1234-5678-9123-4567',
  orcidLastModifiedDate: '2020-09-23T20:45:22.000Z',
  orcidLastSyncDate: '2020-09-23T20:45:22.000Z',
  ...overrides,
});

export const getPublicUserResponse = (): gp2Model.PublicUserResponse => {
  const {
    avatarUrl,
    biography,
    city,
    country,
    degrees,
    displayName,
    firstName,
    id,
    lastName,
    lastModifiedDate,
    middleName,
    outputs,
    positions,
    region,
    stateOrProvince,
  } = getUserResponse();
  return {
    avatarUrl,
    biography,
    city,
    country,
    degrees,
    displayName,
    firstName,
    id,
    institution: positions[0]?.institution,
    lastName,
    lastModifiedDate,
    middleName,
    outputs,
    publishDate: '2020-09-23T20:45:22.000Z',
    region,
    stateOrProvince,
    systemPublishedVersion: 23,
    title: positions[0]?.role,
    workingGroups: [
      {
        id: 'test-working-group-id',
        title: 'Steering Committee',
        role: 'Co-lead',
      },
    ],
    tags: ['BLAAC-PD', 'Cohort'],
  };
};

export const getListUsersResponse = (
  overrides: Partial<gp2Model.UserResponse> = {},
): gp2Model.ListUserResponse => ({
  total: 1,
  items: [getUserResponse(overrides)],
});

export const getListPublicUsersResponse =
  (): gp2Model.ListPublicUserResponse => ({
    total: 1,
    items: [getPublicUserResponse()],
  });

export const updateAvatarBody: { avatar: string } = {
  avatar:
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBkRXhpZgAATU0AKgAAAAgABAEGAAMAAAABAAIAAAESAAMAAAABAAEAAAEoAAMAAAABAAIAAIdpAAQAAAABAAAAPgAAAAAAAqACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/4QkhaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA1LjQuMCI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiLz4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+AP/tADhQaG90b3Nob3AgMy4wADhCSU0EBAAAAAAAADhCSU0EJQAAAAAAENQdjNmPALIE6YAJmOz4Qn7/4gI0SUNDX1BST0ZJTEUAAQEAAAIkYXBwbAQAAABtbnRyUkdCIFhZWiAH4QAHAAcADQAWACBhY3NwQVBQTAAAAABBUFBMAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWFwcGzKGpWCJX8QTTiZE9XR6hWCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApkZXNjAAAA/AAAAGVjcHJ0AAABZAAAACN3dHB0AAABiAAAABRyWFlaAAABnAAAABRnWFlaAAABsAAAABRiWFlaAAABxAAAABRyVFJDAAAB2AAAACBjaGFkAAAB+AAAACxiVFJDAAAB2AAAACBnVFJDAAAB2AAAACBkZXNjAAAAAAAAAAtEaXNwbGF5IFAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHRleHQAAAAAQ29weXJpZ2h0IEFwcGxlIEluYy4sIDIwMTcAAFhZWiAAAAAAAADzUQABAAAAARbMWFlaIAAAAAAAAIPfAAA9v////7tYWVogAAAAAAAASr8AALE3AAAKuVhZWiAAAAAAAAAoOAAAEQsAAMi5cGFyYQAAAAAAAwAAAAJmZgAA8qcAAA1ZAAAT0AAACltzZjMyAAAAAAABDEIAAAXe///zJgAAB5MAAP2Q///7ov///aMAAAPcAADAbv/AABEIAAEAAQMBEQACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/3QAEAAH/2gAMAwEAAhEDEQA/AMev53P7QP/Z',
};

export const fetchExpectation: gp2Model.ListUserResponse = {
  total: 2,
  items: [
    getUserResponse(),
    {
      id: 'user-id-2',
      lastModifiedDate: '2022-12-24T23:23:23.000Z',
      systemPublishedVersion: 9,
      createdDate: '2020-09-23T20:45:22.000Z',
      displayName: 'Tony Stark',
      fullDisplayName: 'Tony Stark',
      email: 'T@ark.io',
      firstName: 'Tony',
      lastName: 'Stark',
      region: 'North America',
      degrees: ['MSc'],
      role: 'Network Investigator',
      country: 'Spain',
      stateOrProvince: 'Madrid',
      positions: [
        {
          role: 'CEO',
          department: 'Research',
          institution: 'Stark Industries',
        },
      ],
      onboarded: true,
      outputs: [],
      projects: [],
      projectIds: [],
      workingGroups: [],
      workingGroupIds: [],
      fundingStreams: undefined,
      contributingCohorts: [],
      tags: [],
      tagIds: [],
      questions: [],
    },
  ],
};

export const getUserDataObject = (): Required<gp2Model.UserDataObject> => ({
  id: 'user-id-1',
  systemPublishedVersion: 23,
  activeCampaignId: '1',
  avatarUrl: 'https://example.com',
  createdDate: '2020-09-23T20:45:22.000Z',
  activatedDate: '2020-09-24T20:45:22.000Z',
  lastModifiedDate: '2023-07-06T07:23:32.000Z',
  connections: [{ code: 'some-code' }],
  email: 'T@ark.io',
  firstName: 'Tony',
  middleName: 'Edward',
  lastName: 'Stark',
  nickname: 'Iron Man',
  region: 'Europe',
  degrees: ['MPH'],
  role: 'Trainee',
  country: 'Spain',
  stateOrProvince: 'Madrid',
  city: 'Madrid',
  positions: [
    {
      role: 'CEO',
      department: 'Research',
      institution: 'Stark Industries',
    },
  ],
  onboarded: true,
  alumniSinceDate: '2022-06-30T00:00:00.000Z',
  alumniLocation: 'London',
  alumniLastUpdated: '2022-06-30T00:00:00.000Z',
  outputs: [
    {
      id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      title: 'Test Proposal 1234',
      shortDescription: 'A nice article',
      sharingStatus: 'Public',
      gp2Supported: 'Yes',
    },
  ],
  projects: [
    {
      id: 'test-project-id',
      members: [
        { role: 'Project co-lead', userId: 'user-id-0' },
        { role: 'Investigator', userId: 'user-id-1' },
      ],

      status: 'Active',
      title: 'Test Project',
    },
  ],
  workingGroups: [
    {
      id: 'test-working-group-id',
      members: [
        { userId: 'user-id-2', role: 'Lead' },
        { userId: 'user-id-3', role: 'Working group member' },
      ],
      title: 'Steering Committee',
      role: 'Co-lead',
    },
  ],
  tags: [
    { id: 'tag-1', name: 'BLAAC-PD' },
    { id: 'tag-2', name: 'Cohort' },
  ],
  fundingStreams: 'A funding stream',
  biography: 'a biography of Tony Stark',
  contributingCohorts: [
    {
      role: 'Investigator',
      studyUrl: 'http://example.com/study',
      contributingCohortId: 'cohort-id',
      name: 'CALYPSO',
    },
  ],
  alternativeEmail: 'tony@stark.com',
  telephone: { countryCode: '+1', number: '212-970-4133' },
  questions: [
    'What color was Iron Mans original armour?',
    'Who is the Stark family butler?',
  ],
  social: {
    googleScholar: 'https://scholar.google.com',
    orcid: 'https://orcid.org/1234-5678-9123-4567',
    blog: 'https://www.blogger.com',
    blueSky: 'https://bsky.app/profile/yourprofilename',
    threads: 'https://www.threads.net/@yourprofilename',
    twitter: 'https://twitter.com',
    linkedIn: 'https://www.linkedin.com',
    github: 'https://github.com',
    researcherId: 'https://researcherid.com/rid/',
    researchGate: 'https://researchid.com/rid/',
  },
  orcid: '1234-5678-9123-4567',
  orcidWorks: [
    {
      doi: 'test-doi',
      id: '123-456-789',
      lastModifiedDate: '2020-10-26T15:33:18Z',
      publicationDate: {},
      type: 'ANNOTATION',
      title: 'orcid work title',
    },
  ],
  orcidLastModifiedDate: '2020-09-23T20:45:22.000Z',
  orcidLastSyncDate: '2020-09-23T20:45:22.000Z',
});
export const getUserCreateDataObject = (): gp2Model.UserCreateDataObject => {
  const {
    id: _id,
    createdDate: _createdDate,
    connections: _connections,
    contributingCohorts,
    ...userCreateDataObject
  } = getUserDataObject();

  return {
    ...userCreateDataObject,
    contributingCohorts: contributingCohorts.map(
      ({ contributingCohortId, role, studyUrl }) => ({
        contributingCohortId,
        role,
        studyUrl,
      }),
    ),
  };
};

export const fetchUserResponseDataObject = (): gp2Model.UserDataObject => ({
  createdDate: '2020-09-25T09:42:51.000Z',
  lastModifiedDate: '2023-07-06T07:23:32.000Z',
  email: 'peter@parker.com',
  firstName: 'Peter',
  id: 'userId',
  lastName: 'Parker',
  role: 'Trainee',
  region: 'Europe',
  country: 'Spain',
  stateOrProvince: 'Madrid',
  degrees: ['PhD', 'MSc'],
  positions: [
    {
      role: 'Photographer',
      department: 'Newsdesk',
      institution: 'Daily Bugle',
    },
  ],
  onboarded: true,
  outputs: [
    {
      id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
      title: 'Test Proposal 1234',
      shortDescription: 'A nice article',
      sharingStatus: 'Public',
      gp2Supported: 'Yes',
    },
  ],
  projects: [
    {
      id: 'test-project-id',
      members: [
        { role: 'Project co-lead', userId: 'user-id-0' },
        { role: 'Investigator', userId: 'user-id-1' },
      ],

      status: 'Active',
      title: 'Test Project',
    },
  ],
  workingGroups: [
    {
      id: 'test-working-group-id',
      members: [
        { userId: 'user-id-2', role: 'Lead' },
        { userId: 'user-id-3', role: 'Working group member' },
      ],
      title: 'Steering Committee',
      role: 'Co-lead',
    },
  ],
  fundingStreams: undefined,
  contributingCohorts: [],
  alternativeEmail: 'tony@stark.com',
  telephone: { countryCode: '+1', number: '212-970-4133' },
  tags: [],
  questions: ['What was the name of Peter Parkers uncle?'],
});

export const userPatchRequest: gp2Model.UserPatchRequest = {
  onboarded: true,
  firstName: 'John',
  middleName: 'Edward',
  lastName: 'Smith',
  nickname: 'Johnny',
  country: 'United Kingdom',
  city: 'Manchester',
  orcid: '1234-1234-1234-1234',
};

export const getContentfulGraphql = (props = {}) => ({
  Users: () => getContentfulGraphqlUser(props),
  ProjectMembershipCollection: () => getContentfulGraphqlProjectMembership(),
  ProjectsCollection: () => getContentfulGraphqlProjects(),
  ProjectsMembersCollection: () => getContentfulGraphqlProjectMembers(),
  WorkingGroupMembershipCollection: () =>
    getContentfulGraphqlWorkingGroupMembership(),
  WorkingGroupsCollection: () => getContentfulGraphqlWorkingGroup(),
  WorkingGroupsMembersCollection: () =>
    getContentfulGraphqlWorkingGroupMembers(),
});

export const getContentfulGraphqlUser = (
  props = {},
): Required<
  NonNullable<
    NonNullable<
      gp2Contentful.FetchUsersQuery['usersCollection']
    >['items'][number]
  >
> => ({
  sys: {
    id: 'user-id-1',
    firstPublishedAt: '2020-09-23T20:45:22.000Z',
    publishedAt: '2023-07-06T07:23:32.000Z',
    publishedVersion: 23,
  },
  activeCampaignId: '1',
  activatedDate: '2020-09-24T20:45:22.000Z',
  avatar: {
    url: 'https://example.com',
  },
  biography: 'a biography of Tony Stark',
  onboarded: true,
  alumniSinceDate: '2022-06-30T00:00:00.000Z',
  connections: ['some-code'],
  alumniLocation: 'London',
  alumniLastUpdated: '2022-06-30T00:00:00.000Z',
  questions: [
    'What color was Iron Mans original armour?',
    'Who is the Stark family butler?',
  ],
  tagsCollection: { ...getContentfulGraphqTags() },
  email: 'T@ark.io',
  alternativeEmail: 'tony@stark.com',
  firstName: 'Tony',
  middleName: 'Edward',
  lastName: 'Stark',
  nickname: 'Iron Man',
  country: 'Spain',
  region: 'Europe',
  stateOrProvince: 'Madrid',
  city: 'Madrid',
  telephoneCountryCode: '+1',
  telephoneNumber: '212-970-4133',
  degrees: ['MPH'],
  github: 'https://github.com',
  googleScholar: 'https://scholar.google.com',
  linkedIn: 'https://www.linkedin.com',
  researchGate: 'https://researchid.com/rid/',
  researcherId: 'https://researcherid.com/rid/',
  blueSky: 'https://bsky.app/profile/yourprofilename',
  threads: 'https://www.threads.net/@yourprofilename',
  twitter: 'https://twitter.com',
  blog: 'https://www.blogger.com',
  orcid: '1234-5678-9123-4567',
  orcidLastModifiedDate: '2020-09-23T20:45:22.000Z',
  orcidLastSyncDate: '2020-09-23T20:45:22.000Z',
  orcidWorks: [
    {
      doi: 'test-doi',
      id: '123-456-789',
      lastModifiedDate: '2020-10-26T15:33:18Z',
      publicationDate: {},
      type: 'ANNOTATION',
      title: 'orcid work title',
    },
  ],
  role: 'Trainee',
  fundingStreams: 'A funding stream',
  positions: [
    { role: 'CEO', department: 'Research', institution: 'Stark Industries' },
  ],
  contributingCohortsCollection: {
    items: [
      {
        contributingCohort: {
          sys: { id: 'cohort-id' },
          name: 'CALYPSO',
          studyLink: 'http://example.com/study',
        },
        role: 'Investigator',
      },
    ],
  },
  linkedFrom: {
    outputsCollection: {
      items: [
        {
          ...getContentfulGraphqlOutput(),
        },
      ],
    },
    projectMembershipCollection: {
      items: [
        {
          ...getContentfulGraphqlProjectMembership().items[0],
          linkedFrom: {
            projectsCollection: {
              items: [
                {
                  ...getContentfulGraphqlProjects().items[0]!,
                  membersCollection: {
                    total: getContentfulGraphqlProjectMembers().items.length,
                    items: getContentfulGraphqlProjectMembers().items,
                  },
                },
              ],
            },
          },
        },
      ],
    },
    workingGroupMembershipCollection: {
      items: [
        {
          ...getContentfulGraphqlWorkingGroupMembership().items[0],
          role: 'Co-lead',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  ...getContentfulGraphqlWorkingGroup().items[0]!,
                  membersCollection: {
                    total:
                      getContentfulGraphqlWorkingGroupMembers().items.length,
                    items: getContentfulGraphqlWorkingGroupMembers().items,
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
  ...props,
});

export const getContentfulGraphqTags = () => ({
  total: 2,
  items: [
    {
      sys: {
        id: 'tag-1',
      },
      name: 'BLAAC-PD',
    },
    {
      sys: {
        id: 'tag-2',
      },
      name: 'Cohort',
    },
  ],
});
export const getContentfulGraphqlWorkingGroupMembership = () => ({
  total: 1,
  items: [
    {
      user: {
        sys: {
          id: '42',
        },
        onboarded: true,
      },
      role: 'Co-lead',
    },
  ],
});
export const getContentfulGraphqlWorkingGroup = () => ({
  total: 1,
  items: [
    {
      sys: {
        id: 'test-working-group-id',
      },
      title: 'Steering Committee',
    },
  ],
});
export const getContentfulGraphqlWorkingGroupMembers = () => ({
  total: 2,
  items: [
    {
      role: 'Lead',
      user: {
        sys: {
          id: 'user-id-2',
        },
        onboarded: true,
      },
    },
    {
      role: 'Working group member',
      user: {
        sys: {
          id: 'user-id-3',
        },
        onboarded: true,
      },
    },
  ],
});
export const getContentfulGraphqlProjectMembership = () => ({
  total: 1,
  items: [
    {
      user: {
        sys: {
          id: '42',
        },
        onboarded: true,
      },
      role: 'Investigator',
    },
  ],
});
export const getContentfulGraphqlProjects = () => ({
  total: 1,
  items: [
    {
      sys: {
        id: 'test-project-id',
      },
      title: 'Test Project',
      status: 'Active',
    },
  ],
});
export const getContentfulGraphqlProjectMembers = () => ({
  total: 2,
  items: [
    {
      role: 'Project co-lead',
      user: {
        sys: {
          id: 'user-id-0',
        },
        onboarded: true,
      },
    },
    {
      role: 'Investigator',
      user: {
        sys: {
          id: 'user-id-1',
        },
        onboarded: true,
      },
    },
  ],
});
export const getContentfulRestUser = () => ({
  fields: {},
  update: () =>
    Promise.resolve({
      publish: jest.fn(),
    }),
});
export const getContentfulUsersGraphqlResponse =
  (): gp2Contentful.FetchUsersQuery => ({
    usersCollection: {
      total: 1,
      items: [getContentfulGraphqlUser()],
    },
  });

export const getContentfulUsersByProjectIds = (
  user1Id?: string,
  user2Id?: string,
) => ({
  projectsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'project-id',
        },
        membersCollection: {
          total: [user1Id, user2Id].filter(Boolean).length,
          items: [
            user1Id && {
              user: {
                sys: {
                  id: user1Id,
                },
              },
            },
            user2Id && { user: { sys: { id: user2Id } } },
          ].filter(Boolean),
        },
      },
    ],
  },
});

export const getContentfulUsersByWorkingGroupIds = (
  user1Id?: string,
  user2Id?: string,
) => ({
  workingGroupsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'working-group-id',
        },
        membersCollection: {
          total: [user1Id, user2Id].filter(Boolean).length,
          items: [
            user1Id && {
              user: {
                sys: {
                  id: user1Id,
                },
              },
            },
            user2Id && { user: { sys: { id: user2Id } } },
          ].filter(Boolean),
        },
      },
    ],
  },
});
export const getContentfulUsersByTagIds = (
  user1Id?: string,
  user2Id?: string,
) => ({
  usersCollection: {
    total: 1,
    items: [
      user1Id && {
        sys: {
          id: user1Id,
        },
      },
      user2Id && { sys: { id: user2Id } },
    ],
  },
});
export const getProjectGraphQL = ({
  status = 'Active',
  role = 'Investigator',
  user = {
    sys: {
      id: '42',
    },
    onboarded: true,
  },
  projectId = '11',
  hasMembers = true,
}: {
  status?: string | null;
  role?: string | null;
  user?: { sys: { id: string }; onboarded: boolean } | null;
  projectId?: string | null;
  hasMembers?: boolean;
} = {}) => ({
  user: {
    sys: {
      id: '42',
    },
  },
  role: 'Project lead',
  linkedFrom: {
    projectsCollection: {
      items: [
        {
          sys: {
            id: projectId,
          },
          title: 'Test Project',
          status,
          membersCollection: hasMembers
            ? {
                items: [
                  {
                    user,
                    role,
                  },
                ],
              }
            : null,
        },
      ],
    },
  },
});

export const getUserWebhookPayload = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'user'>> => ({
  resourceId: id,
  metadata: {
    tags: [],
  },
  sys: {
    type: 'Entry',
    id: 'fc496d00-053f-44fd-9bac-68dd9d959848',
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: '5v6w5j61tndm',
      },
    },
    environment: {
      sys: {
        id: 'an-environment',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'user',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '3ZHvngTJ24kxZUAPDJ8J1z',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '3ZHvngTJ24kxZUAPDJ8J1z',
      },
    },
    revision: 14,
    createdAt: '2023-05-17T13:39:03.250Z',
    updatedAt: '2023-05-18T16:17:36.425Z',
  },
  fields: {
    firstName: {
      'en-US': 'Tony',
    },
  },
});

export const getUserEvent = (
  id: string,
  eventType: gp2Model.UserEvent,
): EventBridgeEvent<
  gp2Model.UserEvent,
  WebhookDetail<ContentfulWebhookPayload<'user'>>
> => createEventBridgeEventMock(getUserWebhookPayload(id), eventType, id);
