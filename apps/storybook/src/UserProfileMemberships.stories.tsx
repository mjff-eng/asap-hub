import {
  createInterestGroupResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import { InterestGroupResponse } from '@asap-hub/model';
import {
  UserInterestGroupsMembershipCard,
  UserProfileMemberships,
} from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UserProfileMemberships> = {
  title: 'Templates / User Profile / Memberships',
  component: UserProfileMemberships,
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: {
    projects: { control: false },
    teams: { control: false },
    workingGroups: { control: false },
    interestGroupsCard: { control: false },
  },
};

type Story = StoryObj<typeof UserProfileMemberships>;

const userId = 'u42';

const interestGroup = (
  index: number,
  overrides: Partial<InterestGroupResponse> = {},
): InterestGroupResponse => ({
  ...createInterestGroupResponse({}, index),
  name: `Interest Group ${index + 1}`,
  ...overrides,
});

const interestGroupLeader = (
  role: InterestGroupResponse['leaders'][number]['role'],
) => ({
  user: { ...createUserResponse({}, 0), id: userId },
  role,
});

const interestGroups: InterestGroupResponse[] = [
  interestGroup(0, { leaders: [interestGroupLeader('Chair')] }),
  interestGroup(1, { leaders: [interestGroupLeader('Project Manager')] }),
  interestGroup(2),
  interestGroup(3, { active: false }),
  interestGroup(4, {
    leaders: [
      { ...interestGroupLeader('Chair'), inactiveSinceDate: '2023-02-15' },
    ],
  }),
];

export const Empty: Story = {
  args: {
    projects: [],
    teams: [],
    workingGroups: [],
    interestGroupsCard: (
      <UserInterestGroupsMembershipCard
        interestGroups={[]}
        userId={userId}
        userAlumni={false}
      />
    ),
  },
};

export const WithMemberships: Story = {
  args: {
    projects: [
      {
        id: 'discovery-project-1',
        title: 'Understanding Genetic Mechanisms in PD',
        projectType: 'Discovery Project',
        status: 'Active',
      },
      {
        id: 'resource-project-1',
        title: 'PD Biobank Resource',
        projectType: 'Resource Project',
        status: 'Closed',
      },
      {
        id: 'trainee-project-1',
        title: 'Molecular Biology Training Program',
        projectType: 'Trainee Project',
        status: 'Completed',
      },
      {
        id: 'resource-project-2',
        title: 'Open-Source Analysis Pipeline',
        projectType: 'Resource Project',
        status: 'Completed',
      },
    ],
    teams: [
      {
        id: 't1',
        displayName: 'Team Alpha',
        role: 'Lead PI (Core Leadership)',
      },
      { id: 't1', displayName: 'Team Alpha', role: 'Project Manager' },
      { id: 't2', displayName: 'Team Beta', role: 'Collaborating PI' },
      { id: 't3', displayName: 'Team Gamma', role: 'Key Personnel' },
      {
        id: 't4',
        displayName: 'Team Delta',
        role: 'Co-PI (Core Leadership)',
        inactiveSinceDate: '2023-02-15T12:00:00.000Z',
      },
      {
        id: 't5',
        displayName: 'Team Epsilon',
        role: 'Data Manager',
        teamInactiveSince: '2022-11-01T12:00:00.000Z',
      },
    ],
    workingGroups: [
      { id: 'wg1', name: 'Data Sharing', role: 'Chair', active: true },
      {
        id: 'wg2',
        name: 'Open Science',
        role: 'Project Manager',
        active: true,
      },
      { id: 'wg3', name: 'Biomarkers', role: 'Member', active: true },
      { id: 'wg4', name: 'Legacy Protocols', role: 'Member', active: false },
      { id: 'wg5', name: 'Pilot Cohorts', role: 'Chair', active: false },
    ],
    interestGroupsCard: (
      <UserInterestGroupsMembershipCard
        interestGroups={interestGroups}
        userId={userId}
        userAlumni={false}
      />
    ),
  },
};

export const Alumni: Story = {
  args: {
    ...WithMemberships.args,
    alumniSinceDate: '2024-01-01T00:00:00.000Z',
    teams: WithMemberships.args?.teams?.map((team) =>
      team.inactiveSinceDate || team.teamInactiveSince
        ? team
        : { ...team, inactiveSinceDate: '2024-01-01T00:00:00.000Z' },
    ),
    interestGroupsCard: (
      <UserInterestGroupsMembershipCard
        interestGroups={interestGroups}
        userId={userId}
        userAlumni
      />
    ),
  },
};

export default meta;
