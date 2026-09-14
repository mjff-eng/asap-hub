import { TeamAwardMetrics, TeamAward } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CenterDecorator } from './layout';

const meta: Meta<typeof TeamAwardMetrics> = {
  title: 'Organisms / Team Award Metrics',
  component: TeamAwardMetrics,
  decorators: [
    (Story) => (
      <div>
        <Story />
      </div>
    ),
    CenterDecorator,
  ],
  argTypes: {
    awards: { control: false },
  },
};

type Story = StoryObj<typeof TeamAwardMetrics>;

const awards: TeamAward[] = [
  {
    id: 'open-science-champion-award',
    name: 'Open Science Champion Award',
    status: true,
    philosophy:
      'ASAP is built upon strong open science principles. The Open Science Champion award is given to individuals in the network who have demonstrated a strong commitment to open science.',
    metricDefinition:
      'The Open Science Champion Metric provides recognition to teams that have received an Open Science Champion award since the start of the grant.',
  },
  {
    id: 'network-spotlight',
    name: 'Network Spotlight',
    status: false,
    philosophy:
      'ASAP is built upon strong open science principles. The Network Spotlight award recognises teams whose work has been highlighted to the wider network.',
    metricDefinition:
      'The Network Spotlight Metric provides recognition to teams that have been featured in a Network Spotlight since the start of the grant.',
  },
];

export const Default: Story = {
  args: { awards },
};

export default meta;
