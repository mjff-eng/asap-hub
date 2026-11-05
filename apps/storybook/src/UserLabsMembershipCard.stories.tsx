import {
  LabMembership,
  UserLabsMembershipCard,
} from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UserLabsMembershipCard> = {
  title: 'Organisms / User Memberships / Labs Card',
  component: UserLabsMembershipCard,
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: { labs: { control: false } },
};

type Story = StoryObj<typeof UserLabsMembershipCard>;

const userId = 'u42';

const labs: LabMembership[] = [
  {
    id: 'l1',
    name: 'Mars Lab',
    labPrincipalInvestigatorId: userId,
    team: { id: 't1', displayName: 'Team Alpha' },
  },
  {
    id: 'l2',
    name: 'Ferguson Lab',
    labPrincipalInvestigatorId: 'u7',
    team: { id: 't2', displayName: 'Team Beta' },
  },
  {
    id: 'l3',
    name: 'Chen Lab',
    team: { id: 't3', displayName: 'Team Gamma' },
    inactiveSinceDate: '2023-02-15T12:00:00.000Z',
  },
];

export const Empty: Story = { args: { labs: [], userId, userAlumni: false } };

export const CurrentAndFormer: Story = {
  args: { labs, userId, userAlumni: false },
  parameters: {
    docs: {
      description: {
        story:
          'The user leads Mars Lab. Chen Lab was left in 2023, so it is listed under Former with the date left.',
      },
    },
  },
};

export const WithoutTeamData: Story = {
  args: {
    labs: labs.map(({ team, inactiveSinceDate, ...lab }) => lab),
    userId,
    userAlumni: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'What the API returns today: labs without team or date left. The Team column stays empty until the API provides it.',
      },
    },
  },
};

export const Alumni: Story = {
  args: {
    labs: labs.map((lab) =>
      lab.inactiveSinceDate
        ? lab
        : { ...lab, inactiveSinceDate: '2024-01-01T00:00:00.000Z' },
    ),
    userId,
    userAlumni: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'An alumni user has every lab under Former, each with the date left.',
      },
    },
  },
};

export default meta;
