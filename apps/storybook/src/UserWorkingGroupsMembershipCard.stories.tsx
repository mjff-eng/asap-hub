import { WorkingGroupMembership } from '@asap-hub/model';
import { UserWorkingGroupsMembershipCard } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UserWorkingGroupsMembershipCard> = {
  title: 'Organisms / User Memberships / Working Groups Card',
  component: UserWorkingGroupsMembershipCard,
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: { workingGroups: { control: false } },
};

type Story = StoryObj<typeof UserWorkingGroupsMembershipCard>;

const workingGroups: WorkingGroupMembership[] = [
  { id: 'wg1', name: 'Data Sharing', role: 'Chair', active: true },
  { id: 'wg2', name: 'Open Science', role: 'Lead', active: true },
  { id: 'wg3', name: 'Biomarkers', role: 'Member', active: true },
  { id: 'wg4', name: 'Genetics Resources', role: 'Co-lead', active: true },
  { id: 'wg5', name: 'Clinical Outcomes', role: 'Member', active: true },
  { id: 'wg6', name: 'Imaging', role: 'Project Manager', active: true },
  { id: 'wg7', name: 'Legacy Protocols', role: 'Member', active: false },
];

export const Empty: Story = {
  args: { workingGroups: [], userAlumni: false },
};

export const ActiveAndPast: Story = {
  args: { workingGroups, userAlumni: false },
  parameters: {
    docs: {
      description: {
        story:
          'Six active memberships, so the card truncates to five and shows View More. Legacy Protocols is a past membership.',
      },
    },
  },
};

export const Alumni: Story = { args: { workingGroups, userAlumni: true } };

export default meta;
