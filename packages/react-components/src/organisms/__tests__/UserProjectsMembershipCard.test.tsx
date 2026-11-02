import { UserProjectMembership } from '@asap-hub/model';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserProjectsMembershipCard from '../UserProjectsMembershipCard';

const projects: UserProjectMembership[] = [
  {
    id: 'discovery-1',
    title: 'Genetic Mechanisms',
    projectType: 'Discovery Project',
    status: 'Active',
  },
  {
    id: 'resource-1',
    title: 'Biobank Resource',
    projectType: 'Resource Project',
    status: 'Closed',
  },
];

it('renders the empty state', () => {
  render(<UserProjectsMembershipCard projects={[]} />);
  expect(screen.getByRole('heading', { name: 'Projects' })).toBeVisible();
  expect(screen.getByText('No projects yet.')).toBeVisible();
});

it('renders one row per project with its type and status', () => {
  render(<UserProjectsMembershipCard projects={projects} />);
  const table = screen.getByTestId('projects-membership-table');

  expect(within(table).getByText('Project Name')).toBeInTheDocument();
  expect(within(table).getByText('Type')).toBeInTheDocument();
  expect(within(table).getByText('Status')).toBeInTheDocument();

  expect(
    within(table).getByRole('link', { name: 'Genetic Mechanisms' }),
  ).toHaveAttribute('href', expect.stringContaining('discovery-1'));
  expect(
    within(table).getByText('Discovery Project', { selector: 'td' }),
  ).toBeInTheDocument();
  expect(within(table).getByText('Active')).toBeInTheDocument();
  expect(within(table).getByText('Closed')).toBeInTheDocument();
});

it('renders a project without a status', () => {
  render(
    <UserProjectsMembershipCard projects={[{ ...projects[0]!, status: '' }]} />,
  );
  const table = screen.getByTestId('projects-membership-table');
  expect(within(table).getByText('Genetic Mechanisms')).toBeInTheDocument();
  expect(within(table).queryByText('Active')).not.toBeInTheDocument();
});

it('truncates after six projects', async () => {
  render(
    <UserProjectsMembershipCard
      projects={Array.from({ length: 7 }, (_, index) => ({
        ...projects[0]!,
        id: `project-${index}`,
        title: `Project ${index}`,
      }))}
    />,
  );
  const table = screen.getByTestId('projects-membership-table');
  expect(within(table).getAllByRole('row')).toHaveLength(7);

  await userEvent.click(screen.getByRole('button', { name: /view more/i }));
  expect(within(table).getAllByRole('row')).toHaveLength(8);
});
