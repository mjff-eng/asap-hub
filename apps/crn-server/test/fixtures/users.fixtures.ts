import {
  ListUserResponse,
  UserCreateDataObject,
  UserDataObject,
  UserPatchRequest,
  UserResponse,
  inactiveUserMembershipStatus,
  UserEvent,
  WebhookDetail,
  UserListItemResponse,
  UserListItemDataObject,
  PublicUserResponse,
  ListPublicUserResponse,
  PublicUserDataObject,
} from '@asap-hub/model';
import {
  ContentfulWebhookPayload,
  FetchUserByIdQuery,
  FetchUsersQuery,
} from '@asap-hub/contentful';
import { EventBridgeEvent } from 'aws-lambda';
import { createEventBridgeEventMock } from '../helpers/events';

export const fetchUserResponseDataObject = (): UserDataObject => ({
  avatarUrl: `https://www.contentful.com/api/assets/asap-crn/contentful-asset-id`,
  createdDate: '2020-09-25T09:42:51.000Z',
  email: 'tony@stark.com',
  expertiseAndResourceDescription: 'some expertiseAndResourceTags',
  firstName: 'Tony',
  id: 'userId',
  institution: 'Stark Industries',
  jobTitle: 'CEO',
  labs: [],
  lastModifiedDate: '2020-09-25T09:42:51.132Z',
  lastName: 'Stark',
  onboarded: true,
  dismissedGettingStarted: false,
  orcid: '363-98-9330',
  orcidWorks: [],
  questions: [],
  reachOut: 'some reach out',
  responsibilities: 'some responsibilities',
  role: 'Grantee',
  openScienceTeamMember: false,
  techSupport: false,
  social: {
    orcid: '363-98-9330',
  },
  teams: [
    {
      displayName: 'Unknown',
      id: 'team-id-1',
      role: 'Lead PI (Core Leadership)',
      inactiveSinceDate: '',
    },
    {
      displayName: 'Unknown',
      id: 'team-id-3',
      role: 'Collaborating PI',
      inactiveSinceDate: '2022-09-25T09:42:51.000Z',
    },
  ],
  workingGroups: [],
  interestGroups: [],
  projects: [],
  researchOutputs: [],
  connections: [],
});

export const updateAvatarBody: { avatar: string } = {
  avatar:
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBkRXhpZgAATU0AKgAAAAgABAEGAAMAAAABAAIAAAESAAMAAAABAAEAAAEoAAMAAAABAAIAAIdpAAQAAAABAAAAPgAAAAAAAqACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/4QkhaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA1LjQuMCI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiLz4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+AP/tADhQaG90b3Nob3AgMy4wADhCSU0EBAAAAAAAADhCSU0EJQAAAAAAENQdjNmPALIE6YAJmOz4Qn7/4gI0SUNDX1BST0ZJTEUAAQEAAAIkYXBwbAQAAABtbnRyUkdCIFhZWiAH4QAHAAcADQAWACBhY3NwQVBQTAAAAABBUFBMAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWFwcGzKGpWCJX8QTTiZE9XR6hWCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApkZXNjAAAA/AAAAGVjcHJ0AAABZAAAACN3dHB0AAABiAAAABRyWFlaAAABnAAAABRnWFlaAAABsAAAABRiWFlaAAABxAAAABRyVFJDAAAB2AAAACBjaGFkAAAB+AAAACxiVFJDAAAB2AAAACBnVFJDAAAB2AAAACBkZXNjAAAAAAAAAAtEaXNwbGF5IFAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHRleHQAAAAAQ29weXJpZ2h0IEFwcGxlIEluYy4sIDIwMTcAAFhZWiAAAAAAAADzUQABAAAAARbMWFlaIAAAAAAAAIPfAAA9v////7tYWVogAAAAAAAASr8AALE3AAAKuVhZWiAAAAAAAAAoOAAAEQsAAMi5cGFyYQAAAAAAAwAAAAJmZgAA8qcAAA1ZAAAT0AAACltzZjMyAAAAAAABDEIAAAXe///zJgAAB5MAAP2Q///7ov///aMAAAPcAADAbv/AABEIAAEAAQMBEQACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/3QAEAAH/2gAMAwEAAhEDEQA/AMev53P7QP/Z',
};

export const getUserResponse = (): UserResponse => ({
  membershipStatus: [inactiveUserMembershipStatus],
  alumniLastUpdated: '2020-09-23T20:45:22.000Z',
  alumniLocation: 'some alumni location',
  alumniSinceDate: '2020-09-23T20:45:22.000Z',
  id: 'user-id-1',
  biography: 'some bio',
  onboarded: true,
  dismissedGettingStarted: false,
  createdDate: '2020-09-23T20:45:22.000Z',
  questions: ['Question 1', 'Question 2'],
  tags: [
    { id: '1', name: 'expertise 1' },
    { id: '2', name: 'expertise 2' },
    { id: '3', name: 'expertise 3' },
    { id: '4', name: 'expertise 4' },
    { id: '5', name: 'expertise 5' },
  ],
  displayName: 'Tom (Iron Man) Hardy',
  fullDisplayName: 'Tom (Iron Man) E. Hardy',
  institution: 'some institution',
  jobTitle: 'some job title',
  reachOut: 'some reach out',
  responsibilities: 'some responsibilities',
  researchInterests: 'some research interests',
  email: 'H@rdy.io',
  contactEmail: 'T@rdy.io',
  personalEmail: 'personal@rdy.io',
  firstName: 'Tom',
  middleName: 'Edward',
  lastName: 'Hardy',
  nickname: 'Iron Man',
  country: 'United Kingdom',
  city: 'London',
  lastModifiedDate: '2021-09-23T20:45:22.000Z',
  workingGroups: [],
  interestGroups: [],
  projects: [
    {
      id: 'project-id-1',
      title: 'Test Project',
      projectType: 'Discovery Project',
      status: 'Active',
    },
  ],
  researchOutputs: [],
  expertiseAndResourceDescription: 'some expertise and resource description',
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
  orcid: '123-456-789',
  orcidLastModifiedDate: '2020-09-23T20:45:22.000Z',
  orcidLastSyncDate: '2020-09-23T20:45:22.000Z',
  degree: 'MPH',
  social: {
    orcid: '123-456-789',
  },
  teams: [
    {
      id: 'team-id-0',
      teamInactiveSince: '',
      role: 'Lead PI (Core Leadership)',
      displayName: 'Team A',
      proposal: 'proposalId1',
      inactiveSinceDate: undefined,
    },
  ],
  role: 'Grantee',
  openScienceTeamMember: false,
  techSupport: false,
  labs: [
    { id: 'cd7be4902', name: 'Brighton' },
    { id: 'cd7be4903', name: 'Liverpool' },
  ],
  researchTheme: ['PD Functional Genomics'],
});

export const getUserListItemDataObject = (): UserListItemDataObject => ({
  alumniSinceDate: '2020-09-23T20:45:22.000Z',
  avatarUrl: `https://www.contentful.com/api/assets/asap-crn/contentful-asset-id`,
  biography: 'some biography',
  city: 'London',
  contactEmail: 'contact@example.com',
  country: 'United Kingdom',
  createdDate: '2020-09-23T20:45:22.000Z',
  degree: 'MPH',
  dismissedGettingStarted: false,
  email: 'H@rdy.io',
  tags: [
    { id: '1', name: 'expertise 1' },
    { id: '2', name: 'expertise 2' },
    { id: '3', name: 'expertise 3' },
    { id: '4', name: 'expertise 4' },
    { id: '5', name: 'expertise 5' },
  ],
  firstName: 'Tom',
  id: 'user-id-1',
  institution: 'some institution',
  jobTitle: 'some job title',
  labs: [
    { id: 'cd7be4902', name: 'Brighton' },
    { id: 'cd7be4903', name: 'Liverpool' },
  ],
  lastName: 'Hardy',
  membershipStatus: [inactiveUserMembershipStatus],
  middleName: 'Edward',
  nickname: 'Iron Man',
  onboarded: true,
  orcid: '0000-0001-8203-6901',
  role: 'Grantee',
  openScienceTeamMember: false,
  techSupport: false,
  social: {
    website1: 'https://tomhardy.example.com',
    github: 'tomhardy',
    researcherId: 'R-1234-2020',
  },
  _tags: [
    'expertise 1',
    'expertise 2',
    'expertise 3',
    'expertise 4',
    'expertise 5',
  ],
  teams: [
    {
      id: 'team-id-0',
      role: 'Lead PI (Core Leadership)',
      displayName: 'Team A',
    },
  ],
});

export const getUserListItemResponse = (): UserListItemResponse => ({
  ...getUserListItemDataObject(),
  displayName: 'Tom (Iron Man) Hardy',
  fullDisplayName: 'Tom (Iron Man) E. Hardy',
  onboarded: true,
});

export const getPublicUserResponse = (): PublicUserResponse => ({
  id: 'user-id-1',
  biography: 'some bio',
  createdDate: '2020-09-23T20:45:22.000Z',
  alumni: 'No',
  tags: [
    'expertise 1',
    'expertise 2',
    'expertise 3',
    'expertise 4',
    'expertise 5',
  ],
  institution: 'some institution',
  firstName: 'Tom',
  lastName: 'Hardy',
  country: 'United Kingdom',
  city: 'London',
  lastModifiedDate: '2021-09-23T20:45:22.000Z',
  workingGroups: [{ name: 'Active Working Group 1', role: 'Chair' }],
  interestGroups: [{ name: 'Interest Group 1' }],
  orcid: '123-456-789',
  degree: 'MPH',
  personalEmail: 'personal@rdy.io',
  teams: [
    {
      role: 'Lead PI (Core Leadership)',
      displayName: 'Team A',
    },
  ],
  labs: [
    { id: 'cd7be4902', name: 'Brighton' },
    { id: 'cd7be4903', name: 'Liverpool' },
  ],
  researchTheme: ['PD Functional Genomics'],
  researchOutputs: ['research-output-id'],
});

export const fetchExpectation: ListUserResponse = {
  total: 2,
  items: [
    getUserListItemResponse(),
    {
      membershipStatus: [inactiveUserMembershipStatus],
      id: 'user-id-2',
      alumniSinceDate: '2020-09-23T20:45:22Z',
      city: 'some city',
      country: 'some country',
      institution: 'some institution',
      jobTitle: 'some job title',
      onboarded: true,
      createdDate: '2020-09-23T20:45:22.000Z',
      _tags: [],
      displayName: 'Arnold Schwatzneger',
      fullDisplayName: 'Arnold Schwatzneger',
      email: 'arnold@gmail.com',
      firstName: 'Arnold',
      lastName: 'Schwatzneger',
      teams: [
        {
          id: 'team-id-2',
          role: 'Project Manager',
          displayName: 'Team B',
        },
      ],
      role: 'Grantee',
      openScienceTeamMember: false,
      techSupport: false,
      labs: [],
    },
  ],
};

export const getListUserResponse = (): ListUserResponse => ({
  total: 1,
  items: [getUserListItemResponse()],
});

export const getListPublicUserResponse = (): ListPublicUserResponse => ({
  total: 1,
  items: [getPublicUserResponse()],
});

export const getUserDataObjects = () => [getUserDataObject()];

export const userPatchRequest: UserPatchRequest = {
  firstName: 'John',
  middleName: 'Edward',
  lastName: 'Smith',
  nickname: 'Johnny',
  social: { github: 'johnytiago' },
  jobTitle: 'CEO',
  questions: ['To be or not to be?'],
  onboarded: true,
  country: 'United Kingdom',
  city: 'Manchester',
  responsibilities: 'responsibilities',
  researchInterests: 'research interests',
  teams: [
    {
      id: 'team-id-1',
      role: 'Lead PI (Core Leadership)',
      inactiveSinceDate: undefined,
    },
  ],
};

export const getUserDataObject = (): UserDataObject => ({
  membershipStatus: [inactiveUserMembershipStatus],
  id: 'user-id-1',
  biography: 'some bio',
  onboarded: true,
  dismissedGettingStarted: false,
  createdDate: '2020-09-23T20:45:22.000Z',
  connections: [
    {
      code: 'some-code',
    },
  ],
  alumniLastUpdated: '2020-09-23T20:45:22.000Z',
  alumniLocation: 'some alumni location',
  alumniSinceDate: '2020-09-23T20:45:22.000Z',
  expertiseAndResourceDescription: 'some expertise and resource description',
  orcidLastModifiedDate: '2020-09-23T20:45:22.000Z',
  orcidLastSyncDate: '2020-09-23T20:45:22.000Z',
  questions: ['Question 1', 'Question 2'],
  tags: [
    { id: '1', name: 'expertise 1' },
    { id: '2', name: 'expertise 2' },
    { id: '3', name: 'expertise 3' },
    { id: '4', name: 'expertise 4' },
    { id: '5', name: 'expertise 5' },
  ],
  researchTheme: ['PD Functional Genomics'],
  researchOutputs: [],
  institution: 'some institution',
  jobTitle: 'some job title',
  reachOut: 'some reach out',
  responsibilities: 'some responsibilities',
  researchInterests: 'some research interests',
  email: 'H@rdy.io',
  contactEmail: 'T@rdy.io',
  personalEmail: 'personal@rdy.io',
  firstName: 'Tom',
  middleName: 'Edward',
  lastName: 'Hardy',
  nickname: 'Iron Man',
  country: 'United Kingdom',
  city: 'London',
  lastModifiedDate: '2021-09-23T20:45:22.000Z',
  workingGroups: [],
  interestGroups: [],
  projects: [
    {
      id: 'project-id-1',
      title: 'Test Project',
      projectType: 'Discovery Project',
      status: 'Active',
    },
  ],
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
  orcid: '123-456-789',
  degree: 'MPH',
  social: {
    orcid: '123-456-789',
  },
  teams: [
    {
      id: 'team-id-0',
      teamInactiveSince: '',
      role: 'Lead PI (Core Leadership)',
      displayName: 'Team A',
      proposal: 'proposalId1',
      inactiveSinceDate: undefined,
    },
  ],
  role: 'Grantee',
  openScienceTeamMember: false,
  techSupport: false,
  labs: [
    { id: 'cd7be4902', name: 'Brighton' },
    { id: 'cd7be4903', name: 'Liverpool' },
  ],
});

export const getPublicUserDataObject = (): PublicUserDataObject => ({
  ...getUserDataObject(),
  alumni: 'No',
  researchOutputs: ['research-output-id'],
  teams: [
    {
      role: 'Lead PI (Core Leadership)',
      displayName: 'Team A',
    },
  ],
  interestGroups: [
    {
      id: 'interest-group-1',
      name: 'Interest Group 1',
      active: true,
    },
  ],
  workingGroups: [
    {
      name: 'Active Working Group 1',
      role: 'Chair',
    },
  ],
  tags: [
    'expertise 1',
    'expertise 2',
    'expertise 3',
    'expertise 4',
    'expertise 5',
  ],
});

export const getUserCreateDataObject = (): UserCreateDataObject => {
  const {
    id: _id,
    onboarded,
    labs,
    lastModifiedDate: _lastModifiedDate,
    createdDate: _createdDate,
    social: _social,
    workingGroups,
    interestGroups,
    connections,
    alumniLastUpdated,
    alumniLocation,
    alumniSinceDate,
    membershipStatus,
    ...createDataObject
  } = getUserDataObject();

  return {
    ...createDataObject,
    avatar: 'eb87e50d-cf67-49b5-b5e1-ec2c7df20bc5',
    onboarded: typeof onboarded === 'boolean' ? onboarded : undefined,
    labIds: labs.map((lab) => lab.id),
  };
};

export const getContentfulGraphql = (
  props = {},
  isListItem: boolean = false,
) => {
  return {
    Users: () =>
      isListItem
        ? getContentfulGraphqlUserListItem(props)
        : getContentfulGraphqlUser(props),
    InterestGroupsCollection: () => getInterestGroupsCollection(),
    WorkingGroupMembersCollection: () => getWorkingGroupMembersCollection(),
    WorkingGroupLeadersCollection: () => getWorkingGroupLeadersCollection(),
    WorkingGroupsCollection: () => getWorkingGroupCollection(),
  };
};

export const getContentfulGraphqlUser = (
  props: Partial<NonNullable<NonNullable<FetchUserByIdQuery>['users']>> = {},
): NonNullable<NonNullable<FetchUserByIdQuery>['users']> => ({
  sys: {
    id: 'user-id-1',
    firstPublishedAt: '2021-09-23T20:45:22.000Z',
    publishedAt: '2021-09-23T20:45:22.000Z',
  },
  lastUpdated: '2021-09-23T20:45:22.000Z',
  avatar: null,
  biography: 'some bio',
  onboarded: true,
  createdDate: '2020-09-23T20:45:22.000Z',
  dismissedGettingStarted: false,
  connections: ['some-code'],
  alumniLastUpdated: '2020-09-23T20:45:22.000Z',
  alumniLocation: 'some alumni location',
  alumniSinceDate: '2020-09-23T20:45:22.000Z',
  expertiseAndResourceDescription: 'some expertise and resource description',
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
  questions: ['Question 1', 'Question 2'],
  researchTagsCollection: {
    items: [
      { sys: { id: '1' }, name: 'expertise 1' },
      { sys: { id: '2' }, name: 'expertise 2' },
      { sys: { id: '3' }, name: 'expertise 3' },
      { sys: { id: '4' }, name: 'expertise 4' },
      { sys: { id: '5' }, name: 'expertise 5' },
    ],
  },
  institution: 'some institution',
  jobTitle: 'some job title',
  reachOut: 'some reach out',
  responsibilities: 'some responsibilities',
  researchInterests: 'some research interests',
  email: 'H@rdy.io',
  contactEmail: 'T@rdy.io',
  personalEmail: 'personal@rdy.io',
  firstName: 'Tom',
  middleName: 'Edward',
  lastName: 'Hardy',
  nickname: 'Iron Man',
  country: 'United Kingdom',
  city: 'London',
  orcid: '123-456-789',
  degree: 'MPH',
  userSocials: {
    github: null,
    twitter: null,
    blueSky: null,
    website1: null,
    website2: null,
    researchGate: null,
    researcherId: null,
    googleScholar: null,
    linkedIn: null,
  },
  role: 'Grantee',
  labsCollection: {
    items: [
      { sys: { id: 'cd7be4902' }, name: 'Brighton' },
      { sys: { id: 'cd7be4903' }, name: 'Liverpool' },
    ],
  },
  teamsCollection: {
    items: [
      {
        role: 'Lead PI (Core Leadership)',
        inactiveSinceDate: null,
        team: {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          linkedFrom: {
            interestGroupsTeamsCollection: {
              items: [
                {
                  linkedFrom: {
                    interestGroupsCollection: getInterestGroupsCollection(),
                  },
                },
              ],
            },
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'project-id-1',
                          },
                          title: 'Test Project',
                          projectType: 'Discovery Project',
                          status: 'Active',
                          proposal: {
                            sys: {
                              id: 'proposalId1',
                            },
                          },
                        } as any,
                      ],
                    },
                  },
                },
              ],
            },
          },
          researchTheme: {
            name: 'PD Functional Genomics',
          },
          // proposal: {
          //   sys: {
          //     id: 'proposalId1',
          //   },
          // },
        },
      },
    ],
  },
  linkedFrom: {
    workingGroupMembersCollection: getWorkingGroupMembersCollection(),
    workingGroupLeadersCollection: getWorkingGroupLeadersCollection(),
    interestGroupLeadersCollection: getInterestGroupLeadersCollection(),
  },
  ...props,
});

export const getContentfulGraphqlUserListItem = (
  props: Partial<
    NonNullable<
      NonNullable<FetchUsersQuery>['usersCollection']
    >['items'][number]
  > = {},
): NonNullable<
  NonNullable<FetchUsersQuery>['usersCollection']
>['items'][number] => ({
  sys: {
    id: 'user-id-1',
  },
  avatar: {
    url: 'https://www.contentful.com/api/assets/asap-crn/contentful-asset-id',
  },
  biography: 'some biography',
  contactEmail: 'contact@example.com',
  onboarded: true,
  dismissedGettingStarted: false,
  createdDate: '2020-09-23T20:45:22.000Z',
  alumniSinceDate: '2020-09-23T20:45:22.000Z',
  researchTagsCollection: {
    items: [
      { sys: { id: '1' }, name: 'expertise 1' },
      { sys: { id: '2' }, name: 'expertise 2' },
      { sys: { id: '3' }, name: 'expertise 3' },
      { sys: { id: '4' }, name: 'expertise 4' },
      { sys: { id: '5' }, name: 'expertise 5' },
    ],
  },
  institution: 'some institution',
  jobTitle: 'some job title',
  firstName: 'Tom',
  middleName: 'Edward',
  lastName: 'Hardy',
  nickname: 'Iron Man',
  email: 'H@rdy.io',
  country: 'United Kingdom',
  city: 'London',
  degree: 'MPH',
  role: 'Grantee',
  orcid: '0000-0001-8203-6901',
  userSocials: {
    website1: 'https://tomhardy.example.com',
    website2: null,
    linkedIn: null,
    researcherId: 'R-1234-2020',
    twitter: null,
    blueSky: null,
    github: 'tomhardy',
    googleScholar: null,
    researchGate: null,
  },
  labsCollection: {
    items: [
      { sys: { id: 'cd7be4902' }, name: 'Brighton' },
      { sys: { id: 'cd7be4903' }, name: 'Liverpool' },
    ],
  },
  teamsCollection: {
    items: [
      {
        role: 'Lead PI (Core Leadership)',
        team: {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
        },
      },
    ],
  },
  ...props,
});

export const getContentfulRestUser = () => ({
  fields: {},
  update: () =>
    Promise.resolve({
      publish: jest.fn(),
    }),
});

const getInterestGroupsCollection = () => ({
  items: [
    { sys: { id: 'ig-1' }, name: 'interest-group-1', active: true },
    { sys: { id: 'ig-2' }, name: 'interest-group-2', active: false },
  ],
});
const getWorkingGroupMembersCollection = () => ({
  items: [
    {
      inactiveSinceDate: '',
      linkedFrom: {
        workingGroupsCollection: {
          items: [
            {
              sys: {
                id: 'wg-1',
              },
              title: 'working-group-1',
              complete: false,
            },
          ],
        },
      },
      user: {
        lastName: 'simpson',
      },
    },
  ],
});

const getWorkingGroupLeadersCollection = () => ({
  items: [
    {
      inactiveSinceDate: '',
      role: 'Project Manager',
      linkedFrom: {
        workingGroupsCollection: {
          items: [
            {
              sys: {
                id: 'wg-1',
              },
              title: 'working-group-1',
              complete: false,
            },
          ],
        },
      },
      user: {
        lastName: 'simpson',
      },
    },
  ],
});

const getWorkingGroupCollection = () => ({
  items: [
    {
      sys: {
        id: 'wg-1',
      },
      title: 'working-group-1',
      complete: true,
    },
  ],
});

type InterestGroupLeadersCollection = NonNullable<
  NonNullable<NonNullable<FetchUserByIdQuery>['users']>['linkedFrom']
>['interestGroupLeadersCollection'];

export const getInterestGroupLeadersCollection = ({
  groupId = 'interest-group-leader-1',
  groupName = 'Interest Group Leader 1',
  inactiveSinceDate,
}: {
  groupId?: string;
  groupName?: string;
  inactiveSinceDate?: string;
} = {}): InterestGroupLeadersCollection => ({
  items: [
    {
      role: 'Project Manager',
      inactiveSinceDate: inactiveSinceDate ?? null,
      linkedFrom: {
        interestGroupsCollection: {
          items: [
            {
              sys: {
                id: groupId,
              },
              active: true,
              name: groupName,
            },
          ],
        },
      },
    },
  ],
});

export const getUserContentfulWebhookDetail = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'users'>> => ({
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
        id: 'crn-3046',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'users',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    revision: 14,
    createdAt: '2023-05-17T13:39:03.250Z',
    updatedAt: '2023-05-18T16:17:36.425Z',
  },
  fields: {},
});

export const getUserEvent = (
  id: string,
  eventType: UserEvent,
): EventBridgeEvent<
  UserEvent,
  WebhookDetail<ContentfulWebhookPayload<'users'>>
> =>
  createEventBridgeEventMock(getUserContentfulWebhookDetail(id), eventType, id);
