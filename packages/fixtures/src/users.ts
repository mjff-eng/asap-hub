import {
  ListUserResponse,
  UserResponse,
  UserTeam,
  UserListItemResponse,
} from '@asap-hub/model';
import { createLabs } from './labs';

const listUserResponseTeam: Omit<UserTeam, 'id'> = {
  displayName: 'Jakobsson, J',
  role: 'Project Manager',
};

export const listUserResponseItem: Omit<
  ListUserResponse['items'][0],
  'id' | 'individualProjects'
> = {
  createdDate: '2020-09-07T17:36:54Z',
  displayName: 'Person A',
  fullDisplayName: 'Person A',
  firstName: 'Agnete',
  lastName: 'Kirkeby',
  email: 'agnete.kirkeby@sund.ku.dk',
  jobTitle: 'Assistant Professor',
  institution: 'University of Copenhagen',
  country: 'Denmark',
  stateOrProvince: 'Capital Region of Denmark',
  city: 'Copenhagen',
  role: 'Grantee',
  openScienceTeamMember: false,
  techSupport: false,
  onboarded: true,
  teams: [],
  labs: [],
  _tags: [],
  orcid: '0000-0001-8203-6901',
};

type FixtureOptions = {
  teams?: number;
  labs?: number;
};

export const createUserTeams = ({
  teams = 1,
}: {
  teams?: number;
}): UserTeam[] =>
  Array.from({ length: teams }, (_, teamIndex) => ({
    ...listUserResponseTeam,
    id: `team-id-${teamIndex}`,
  }));

export const createUserResponse = (
  options: FixtureOptions = {},
  itemIndex = 0,
): UserResponse => ({
  ...listUserResponseItem,
  lastModifiedDate: '2020-09-07T17:36:54Z',
  orcid: '0000-0001-8203-6901',
  orcidWorks: [],
  questions: [],
  social: {
    github: '',
    googleScholar: '',
    linkedIn: '',
    orcid: '',
    researchGate: '',
    researcherId: '',
    twitter: '',
  },
  workingGroups: [],
  interestGroups: [],
  projects: [],

  id: `user-id-${itemIndex}`,
  displayName: `${listUserResponseItem.displayName} ${itemIndex + 1}`,
  fullDisplayName: `${listUserResponseItem.fullDisplayName} ${itemIndex + 1}`,
  teams: createUserTeams(options),
  labs: createLabs(options),
});

export const createUserListItemResponse = (
  options: FixtureOptions = {},
  itemIndex = 0,
): UserListItemResponse => ({
  ...listUserResponseItem,
  id: `user-id-${itemIndex}`,
  displayName: `${listUserResponseItem.displayName} ${itemIndex + 1}`,
  fullDisplayName: `${listUserResponseItem.fullDisplayName} ${itemIndex + 1}`,
  teams: createUserTeams(options),
  labs: createLabs(options),
  individualProjects: [],
});

export const createListUserResponse = (
  items: number,
  options: FixtureOptions = {},
): ListUserResponse => ({
  total: items,
  items: Array.from({ length: items }, (_, itemIndex) =>
    createUserListItemResponse(options, itemIndex),
  ),
});

export default createListUserResponse;
