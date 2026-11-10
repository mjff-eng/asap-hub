import {
  createInterestGroupResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import { InterestGroupResponse } from '@asap-hub/model';
import { UserInterestGroupsMembershipCard } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UserInterestGroupsMembershipCard> = {
  title: 'Organisms / User Memberships / Interest Groups Card',
  component: UserInterestGroupsMembershipCard,
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: { interestGroups: { control: false } },
};

type Story = StoryObj<typeof UserInterestGroupsMembershipCard>;

const userId = 'u42';

const group = (
  index: number,
  overrides: Partial<InterestGroupResponse> = {},
): InterestGroupResponse => ({
  ...createInterestGroupResponse({}, index),
  name: `Interest Group ${index + 1}`,
  ...overrides,
});

const leader = (role: InterestGroupResponse['leaders'][number]['role']) => ({
  user: { ...createUserResponse({}, 0), id: userId },
  role,
});

const interestGroups: InterestGroupResponse[] = [
  group(0, { leaders: [leader('Chair')] }),
  group(1, { leaders: [leader('Project Manager')] }),
  group(2),
  group(3, { active: false }),
  group(4, {
    leaders: [{ ...leader('Chair'), inactiveSinceDate: '2023-02-15' }],
  }),
];

export const Empty: Story = {
  args: { interestGroups: [], userId, userAlumni: false },
};

export const ActiveAndPast: Story = {
  args: { interestGroups, userId, userAlumni: false },
  parameters: {
    docs: {
      description: {
        story:
          'The user chairs group 1, manages group 2 and is a member of group 3. Group 4 is inactive and the user left group 5, so both are past memberships.',
      },
    },
  },
};

export const Alumni: Story = {
  args: { interestGroups, userId, userAlumni: true },
};

export default meta;
