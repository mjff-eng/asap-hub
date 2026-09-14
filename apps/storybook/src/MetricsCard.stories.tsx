import { Metric, MetricsCard, MoodStatus } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CenterDecorator } from './layout';

const meta: Meta<typeof MetricsCard> = {
  title: 'Organisms / Metrics Card',
  component: MetricsCard,
  decorators: [
    (Story) => (
      <div>
        <Story />
      </div>
    ),
    CenterDecorator,
  ],
  argTypes: {
    metrics: { control: false },
  },
};

type Story = StoryObj<typeof MetricsCard>;

const metrics: Metric[] = [
  {
    id: 'text-status',
    name: 'Working Group(s) Lead',
    status: 'Y',
    philosophy:
      'ASAP believes in ensuring that credit is given to contributors.',
    definition:
      'The Working Group Leadership Metric recognizes the team for their current and/or prior leadership as a chair of a CRN working group.',
  },
  {
    id: 'mood-icon-status',
    name: 'Speaker Diversity',
    status: <MoodStatus percentage={95} />,
    philosophy:
      'At ASAP, we want to ensure that diverse perspectives are being encouraged and that the entire team is engaged in the work.',
    definition:
      'The Speaker Diversity Metric calculates how many times different speakers from a team have presented for events hosted on the Hub.',
  },
  {
    id: 'limited-data-status',
    name: 'Meeting Rep Attendance',
    status: <MoodStatus percentage={null} />,
    philosophy:
      'ASAP believes in fostering an environment where teams can share their work with others in the network. This sharing enables potential collaboration and can spark new ideas.',
    definition:
      'All teams that are members of an interest group are required to send at least 1 representative to the interest group meeting. The Interest Group Meeting attendance metric gives a snapshot of whether a team is sending a representative to the groups that they are a part of.',
  },
];

export const Default: Story = {
  args: { metrics },
};

export default meta;
