import { UserProjectMembership } from '@asap-hub/model';
import { UserProjectsMembershipCard } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UserProjectsMembershipCard> = {
  title: 'Organisms / User Memberships / Projects Card',
  component: UserProjectsMembershipCard,
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: { projects: { control: false } },
};

type Story = StoryObj<typeof UserProjectsMembershipCard>;

const projects: UserProjectMembership[] = [
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
];

const manyProjects: UserProjectMembership[] = [0, 1, 2].flatMap((round) =>
  projects.map((project) => ({
    ...project,
    id: `${project.id}-${round}`,
    title: `${project.title} ${round + 1}`,
  })),
);

export const Empty: Story = { args: { projects: [] } };

export const WithProjects: Story = { args: { projects } };

export const WithViewMore: Story = {
  args: { projects: manyProjects },
  parameters: {
    docs: {
      description: {
        story:
          'More than six projects: the card truncates and shows View More.',
      },
    },
  },
};

export default meta;
