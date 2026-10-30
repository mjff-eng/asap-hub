import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createUserResponse } from '@asap-hub/fixtures';
import { disable, enable } from '@asap-hub/flags';

import UserProfilePage from '../UserProfilePage';

const boilerplateProps: Omit<
  ComponentProps<typeof UserProfilePage>,
  'children'
> = createUserResponse();

beforeEach(() => {
  disable('NEW_USER_DETAIL_PAGE');
});

it('renders the header', () => {
  render(
    <UserProfilePage {...boilerplateProps} fullDisplayName="John Doe">
      Tab Content
    </UserProfilePage>,
  );
  expect(screen.getByRole('heading', { name: 'John Doe' })).toBeVisible();
});

it('renders the children', () => {
  render(<UserProfilePage {...boilerplateProps}>Tab Content</UserProfilePage>);
  expect(screen.getByText('Tab Content')).toBeVisible();
});

it('renders the current header by default', () => {
  render(<UserProfilePage {...boilerplateProps}>Tab Content</UserProfilePage>);
  expect(screen.getByText('Research')).toBeVisible();
  expect(screen.queryByText('Overview')).not.toBeInTheDocument();
});

it('renders the redesigned header when NEW_USER_DETAIL_PAGE is enabled', () => {
  enable('NEW_USER_DETAIL_PAGE');
  render(<UserProfilePage {...boilerplateProps}>Tab Content</UserProfilePage>);
  expect(screen.getByText('Overview')).toBeVisible();
  expect(screen.queryByText('Research')).not.toBeInTheDocument();
});
