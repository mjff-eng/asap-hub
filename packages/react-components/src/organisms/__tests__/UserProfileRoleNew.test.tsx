import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';

import UserProfileRoleNew from '../UserProfileRoleNew';

const props: ComponentProps<typeof UserProfileRoleNew> = {
  firstName: 'Tess',
  role: 'Grantee',
  responsibilities: 'My responsibilities',
  researchInterests: 'My research interests',
  reachOut: 'My reach out',
};

it('renders the responsibilities and research interests', () => {
  render(<UserProfileRoleNew {...props} />);
  expect(screen.getByRole('heading', { name: 'Role' })).toBeInTheDocument();
  expect(screen.getByText('Responsibilities')).toBeVisible();
  expect(screen.getByText('My responsibilities')).toBeVisible();
  expect(screen.getByText('Research Interest')).toBeVisible();
  expect(screen.getByText('My research interests')).toBeVisible();
});

it('does not render reach out for non staff', () => {
  render(<UserProfileRoleNew {...props} />);
  expect(screen.queryByText('My reach out')).not.toBeInTheDocument();
});

it('renders reach out instead of research interests for staff', () => {
  render(<UserProfileRoleNew {...props} role="Staff" />);
  expect(screen.getByText('Reach out to Tess for help with...')).toBeVisible();
  expect(screen.getByText('My reach out')).toBeVisible();
  expect(screen.queryByText('My research interests')).not.toBeInTheDocument();
});

it('hides fields without a value', () => {
  render(<UserProfileRoleNew {...props} responsibilities={undefined} />);
  expect(screen.queryByText('Responsibilities')).not.toBeInTheDocument();
});

it('titles the card Former Role for alumni', () => {
  render(
    <UserProfileRoleNew {...props} alumniSinceDate="2024-01-01T00:00:00Z" />,
  );
  expect(
    screen.getByRole('heading', { name: 'Former Role' }),
  ).toBeInTheDocument();
});

it('renders an empty state when there are no role details', () => {
  render(
    <UserProfileRoleNew
      {...props}
      responsibilities={undefined}
      researchInterests={undefined}
    />,
  );
  expect(screen.getByText('No role details yet.')).toBeVisible();
});

it('renders the edit link when an edit href is given', () => {
  render(<UserProfileRoleNew {...props} editHref="/edit" />);
  expect(screen.getByRole('link', { name: 'Edit role' })).toHaveAttribute(
    'href',
    '/edit',
  );
});

it('does not render the edit link without an edit href', () => {
  render(<UserProfileRoleNew {...props} />);
  expect(
    screen.queryByRole('link', { name: 'Edit role' }),
  ).not.toBeInTheDocument();
});
