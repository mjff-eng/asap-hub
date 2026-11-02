import { UserTeam } from '@asap-hub/model';
import { UserTeamsMembershipCard } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UserTeamsMembershipCard> = {
  title: 'Organisms / User Memberships / Teams Card',
  component: UserTeamsMembershipCard,
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: { teams: { control: false } },
};

type Story = StoryObj<typeof UserTeamsMembershipCard>;

const teams: UserTeam[] = [
  { id: 't1', displayName: 'Team Alpha', role: 'Lead PI (Core Leadership)' },
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
];

export const Empty: Story = { args: { teams: [], userAlumni: false } };

export const CurrentAndFormer: Story = {
  args: { teams, userAlumni: false },
  parameters: {
    docs: {
      description: {
        story:
          'Team Alpha has two roles. Team Delta was left by the user and Team Epsilon became inactive, so both are listed under Former with the date left.',
      },
    },
  },
};

export const Alumni: Story = {
  args: {
    teams: teams.map((team) =>
      team.inactiveSinceDate || team.teamInactiveSince
        ? team
        : { ...team, inactiveSinceDate: '2024-01-01T00:00:00.000Z' },
    ),
    userAlumni: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'An alumni user has every team under Former, each with the date left.',
      },
    },
  },
};

export const WithViewMore: Story = {
  args: {
    userAlumni: false,
    teams: Array.from({ length: 8 }, (_, index) => ({
      id: `team-${index}`,
      displayName: `Team ${index + 1}`,
      role: 'Key Personnel',
    })),
  },
};

export default meta;
