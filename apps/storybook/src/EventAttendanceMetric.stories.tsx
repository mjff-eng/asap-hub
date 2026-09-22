import { EventAttendanceMetric } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { fixedState } from './attendance-fixtures';
import { CenterDecorator } from './layout';

const meta: Meta<typeof EventAttendanceMetric> = {
  title: 'Molecules / Event Attendance Metric',
  component: EventAttendanceMetric,
  decorators: [CenterDecorator],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description:
        'Fills the bar and prints the headline number. The tip colour tracks the value: purple low, blue around half, green only once most of the group attended.',
    },
    caption: { control: 'text' },
    captionDetail: { control: 'text' },
    label: {
      control: 'text',
      description: 'Accessible name of the progress bar; not rendered visually',
    },
  },
};

export default meta;

type Story = StoryObj<typeof EventAttendanceMetric>;

export const Default: Story = {
  args: {
    value: 55,
    caption: '11 of 20 teams',
    captionDetail: 'from the interest group',
    label: 'This event',
  },
};

export const Empty: Story = {
  args: { ...Default.args, value: 0, caption: '0 of 20 teams' },
  ...fixedState,
};

export const Full: Story = {
  args: { ...Default.args, value: 100, caption: '20 of 20 teams' },
  ...fixedState,
};

export const SingleTeam: Story = {
  args: { ...Default.args, value: 100, caption: '1 of 1 team' },
  ...fixedState,
};
