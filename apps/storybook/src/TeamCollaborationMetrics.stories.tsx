import {
  TeamCollaborationMetrics,
  TeamCollaborationMetricsProps,
} from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CenterDecorator } from './layout';

const meta: Meta<typeof TeamCollaborationMetrics> = {
  title: 'Organisms / Team Collaboration Metrics',
  component: TeamCollaborationMetrics,
  decorators: [
    (Story) => (
      <div>
        <Story />
      </div>
    ),
    CenterDecorator,
  ],
};

type Story = StoryObj<typeof TeamCollaborationMetrics>;

const props: TeamCollaborationMetricsProps = {
  withinTeamCoProduction: 62,
};

export const Default: Story = {
  args: props,
};

export const LimitedData: Story = {
  args: {
    withinTeamCoProduction: null,
  },
};

export default meta;
