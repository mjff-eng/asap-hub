import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createUserResponse } from '@asap-hub/fixtures';

import UserProfileOverview from '../UserProfileOverview';

const props: ComponentProps<typeof UserProfileOverview> = {
  ...createUserResponse(),
  role: 'Grantee',
  biography: 'My biography',
  questions: ['First question?'],
};

it('renders every overview card', () => {
  render(<UserProfileOverview {...props} />);

  expect(screen.getByRole('heading', { name: 'Biography' })).toBeVisible();
  expect(
    screen.getByRole('heading', { name: 'Expertise and Resources' }),
  ).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Role' })).toBeVisible();
  expect(
    screen.getByRole('heading', { name: /Recent Publications/ }),
  ).toBeVisible();
});

it('renders the open questions for non staff', () => {
  render(<UserProfileOverview {...props} />);

  expect(screen.getByText('First question?')).toBeVisible();
});

it('hides the open questions for staff', () => {
  render(<UserProfileOverview {...props} role="Staff" />);

  expect(screen.queryByText('First question?')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Open Questions' }),
  ).not.toBeInTheDocument();
});

it('passes each edit href to its card', () => {
  render(
    <UserProfileOverview
      {...props}
      editHrefs={{
        biography: '/edit-biography',
        expertiseAndResources: '/edit-expertise',
        role: '/edit-role',
      }}
    />,
  );

  expect(screen.getByRole('link', { name: 'Edit biography' })).toHaveAttribute(
    'href',
    '/edit-biography',
  );
  expect(
    screen.getByRole('link', { name: 'Edit expertise and resources' }),
  ).toHaveAttribute('href', '/edit-expertise');
  expect(screen.getByRole('link', { name: 'Edit role' })).toHaveAttribute(
    'href',
    '/edit-role',
  );
});
