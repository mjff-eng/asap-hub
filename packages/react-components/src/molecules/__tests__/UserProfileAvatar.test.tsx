import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import UserProfileAvatar from '../UserProfileAvatar';

const props = {
  avatarUrl: undefined,
  firstName: 'John',
  lastName: 'Doe',
};

it('renders the avatar initials', () => {
  render(<UserProfileAvatar {...props} />);
  expect(screen.getByText('JD')).toBeInTheDocument();
});

it('renders the avatar image when provided', () => {
  render(
    <UserProfileAvatar {...props} avatarUrl="https://example.com/a.png" />,
  );
  expect(
    screen.getByRole('img', { name: 'Profile picture of John Doe' }),
  ).toHaveStyle({ backgroundImage: 'url(https://example.com/a.png)' });
});

describe('upload', () => {
  it('does not render the upload control without a handler', () => {
    render(<UserProfileAvatar {...props} />);
    expect(screen.queryByLabelText(/upload.+avatar/i)).not.toBeInTheDocument();
  });

  it('lets the user upload an avatar', () => {
    const onImageSelect = jest.fn();
    const testFile = new File(['foo'], 'foo.png', { type: 'image/png' });
    render(<UserProfileAvatar {...props} onImageSelect={onImageSelect} />);
    expect(screen.getByLabelText(/edit.+avatar/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/upload.+avatar/i), {
      target: { files: [testFile] },
    });
    expect(onImageSelect).toHaveBeenCalledWith(testFile);
  });

  it('shows a spinner and hides the upload while saving', () => {
    render(
      <UserProfileAvatar {...props} onImageSelect={jest.fn()} avatarSaving />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByLabelText(/upload.+avatar/i)).not.toBeInTheDocument();
  });
});

describe('badge', () => {
  const badge = {
    name: 'Open Science Champion',
    iconUrl: 'badge.png',
    href: '/users/u1/research#badges',
  };

  it('renders the badge linking to its href', () => {
    render(
      <MemoryRouter>
        <UserProfileAvatar {...props} badge={badge} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', {
      name: /open science champion badge/i,
    });
    expect(link).toHaveAttribute('href', badge.href);
    expect(link.querySelector('img')).toHaveAttribute('src', 'badge.png');
  });

  it('scrolls to the badges section on every click', async () => {
    const scrollIntoView = jest.fn();
    const badgesSection = document.createElement('div');
    badgesSection.id = 'badges';
    badgesSection.scrollIntoView = scrollIntoView;
    document.body.appendChild(badgesSection);

    render(
      <MemoryRouter>
        <UserProfileAvatar {...props} badge={badge} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /badge/i });
    await userEvent.click(link);
    await userEvent.click(link);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    badgesSection.remove();
  });

  it('renders no badge when none is given', () => {
    render(<UserProfileAvatar {...props} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
