import { Meta, StoryObj } from '@storybook/react-vite';

import { ReminderItem } from '@asap-hub/react-components';
import type { ReminderEntity } from '@asap-hub/react-components';

const meta: Meta<typeof ReminderItem> = {
  component: ReminderItem,
  argTypes: {
    entity: {
      options: ['Manuscript', 'Research Output', 'Event', 'Milestone'],
      control: { type: 'select' },
    },
    description: {
      control: { type: 'text' },
    },
    subtext: {
      control: { type: 'text' },
    },
    date: {
      control: { type: 'date' },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ReminderItem>;

export const ReminderWithoutDate: Story = {
  render: (args) => <ReminderItem {...args} />,
  args: {
    entity: 'Event' as ReminderEntity,
    description:
      'Today there is the Chris Shoemaker mito911 Webinar event happening at 5.00 PM.',
  },
};

export const ReminderWithDate: Story = {
  render: (args) => <ReminderItem {...args} />,
  args: {
    entity: 'Manuscript' as ReminderEntity,
    description:
      '**John Doe** on **Team Alessi** replied to a quick check on the manuscript:',
    subtext: `RAB32 Ser71Arg in autosomal dominant Parkinson's disease: linkage, association, and functional analyses',`,
    date: '2024-12-19T15:47:34.678Z',
  },
};
