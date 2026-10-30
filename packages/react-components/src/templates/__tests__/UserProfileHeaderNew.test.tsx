import { ComponentProps } from 'react';
import { StaticRouter } from 'react-router';

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createUserResponse } from '@asap-hub/fixtures';
import { UserProfileContext } from '@asap-hub/react-context';
import { dashboard, network } from '@asap-hub/routing';

import UserProfileHeaderNew from '../UserProfileHeaderNew';

const boilerplateProps: ComponentProps<typeof UserProfileHeaderNew> = {
  ...createUserResponse(),
  firstName: 'John',
  role: 'Grantee',
  sharedOutputsCount: 0,
};

const renderHeader = (
  props: Partial<ComponentProps<typeof UserProfileHeaderNew>> = {},
  { isOwnProfile = false, location = '/' } = {},
) =>
  render(
    <StaticRouter location={location}>
      <UserProfileContext.Provider value={{ isOwnProfile }}>
        <UserProfileHeaderNew {...boilerplateProps} {...props} />
      </UserProfileContext.Provider>
    </StaticRouter>,
  );

it('renders the name as the top-level heading', () => {
  renderHeader({ fullDisplayName: 'John Doe' });
  expect(screen.getByRole('heading')).toHaveTextContent('John Doe');
  expect(screen.getByRole('heading').tagName).toBe('H1');
});

it('renders the location with the map pin icon', () => {
  renderHeader({
    city: 'Toronto',
    stateOrProvince: 'Ontario',
    country: 'Canada',
  });
  expect(screen.getByText('Toronto, Ontario, Canada')).toBeVisible();
  expect(screen.getByTitle('Map Pin')).toBeInTheDocument();
});

it('renders breadcrumbs to the people list', () => {
  renderHeader({ fullDisplayName: 'Phillip Mars' });
  const breadcrumbs = within(
    screen.getByRole('navigation', { name: 'breadcrumbs' }),
  );
  expect(breadcrumbs.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'href',
    dashboard({}).$,
  );
  expect(breadcrumbs.getByRole('link', { name: 'People' })).toHaveAttribute(
    'href',
    network({}).users({}).$,
  );
  expect(breadcrumbs.getByText('Phillip Mars')).toBeVisible();
});

describe('contact', () => {
  it('links the contact button to the email with the first name', () => {
    renderHeader({ email: 'me@example.com', contactEmail: undefined });
    expect(screen.getByRole('link', { name: /contact john/i })).toHaveAttribute(
      'href',
      'mailto:me@example.com',
    );
  });

  it('prefers an explicit contact email address', () => {
    renderHeader({ contactEmail: 'contact@example.com' });
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute(
      'href',
      'mailto:contact@example.com',
    );
  });

  it('copies the email to the clipboard', async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
    renderHeader({ email: 'me@example.com' });
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'me@example.com',
    );
  });
});

describe('edit buttons', () => {
  it('are not rendered by default', () => {
    renderHeader();
    expect(
      screen.queryByRole('link', { name: /edit/i }),
    ).not.toBeInTheDocument();
  });

  it('render the edit profile link', () => {
    renderHeader({ editPersonalInfoHref: '/edit-personal-info' });
    expect(screen.getByRole('link', { name: /edit profile/i })).toHaveAttribute(
      'href',
      '/edit-personal-info',
    );
  });

  it('render the edit contact link', () => {
    renderHeader({ editContactInfoHref: '/edit-contact-info' });
    expect(screen.getByRole('link', { name: /edit contact/i })).toHaveAttribute(
      'href',
      '/edit-contact-info',
    );
  });
});

describe('avatar', () => {
  it('lets the user upload an avatar', () => {
    const onImageSelect = jest.fn();
    const testFile = new File(['foo'], 'foo.png', { type: 'image/png' });
    renderHeader({ onImageSelect });
    fireEvent.change(screen.getByLabelText(/upload.+avatar/i), {
      target: { files: [testFile] },
    });
    expect(onImageSelect).toHaveBeenCalledWith(testFile);
  });

  it('shows the latest award badge linking to the badges section', () => {
    renderHeader({
      id: 'u1',
      teams: [
        {
          id: 'team-1',
          displayName: 'Team 1',
          role: 'Project Manager',
          awards: [
            {
              name: 'Open Science Champion',
              date: '2023-01-01',
              iconUrl: 'old',
            },
            {
              name: 'Open Science Champion',
              date: '2024-01-01',
              iconUrl: 'new',
            },
          ],
        },
      ],
    });
    const badgeLink = screen.getByRole('link', {
      name: /open science champion badge/i,
    });
    expect(badgeLink.getAttribute('href')).toContain('#badges');
    expect(badgeLink.querySelector('img')).toHaveAttribute('src', 'new');
  });
});

it('shows placeholder text for degree on own profile when omitted', () => {
  const { rerender } = renderHeader({ degree: undefined });
  expect(screen.queryByText(/degree/i)).toBeNull();
  rerender(
    <StaticRouter location="/">
      <UserProfileContext.Provider value={{ isOwnProfile: true }}>
        <UserProfileHeaderNew {...boilerplateProps} degree={undefined} />
      </UserProfileContext.Provider>
    </StaticRouter>,
  );
  expect(screen.getByText(/degree/i)).toBeVisible();
});

it('shows the degree after the name', () => {
  renderHeader({ degree: 'PhD' });
  expect(screen.getByText(/, PhD/)).toBeVisible();
});

describe('external profiles', () => {
  it('renders the external profiles row when the user has links', () => {
    renderHeader({ social: { github: 'octocat' } });
    expect(screen.getByText('External profiles:')).toBeVisible();
    expect(
      within(screen.getByRole('list', { name: 'External profiles' })).getByRole(
        'link',
      ),
    ).toHaveAttribute('href', 'https://github.com/octocat');
  });

  it('renders no external profiles row without links', () => {
    renderHeader({ social: {} });
    expect(screen.queryByText('External profiles:')).not.toBeInTheDocument();
  });
});

it('shows lab information if the user is in a lab', () => {
  const { container } = renderHeader({
    labs: [
      { name: 'Brighton', id: '1' },
      { name: 'Liverpool', id: '2' },
    ],
  });
  expect(container).toHaveTextContent('Brighton Lab and Liverpool Lab');
});

describe('tabs', () => {
  it('renders the tabs with counts', () => {
    renderHeader({
      sharedOutputsCount: 5,
      upcomingEventsCount: 1,
      pastEventsCount: 2,
    });
    expect(
      within(screen.getByRole('navigation', { name: 'tabs' }))
        .getAllByRole('listitem')
        .map(({ textContent }) => textContent),
    ).toStrictEqual([
      'Overview',
      'Memberships',
      'Outputs (5)',
      'Upcoming Events (1)',
      'Past Events (2)',
    ]);
  });

  it('points overview and memberships at the research and about routes', () => {
    renderHeader({ id: 'u1' });
    const tabRoutes = network({}).users({}).user({ userId: 'u1' });
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      tabRoutes.research({}).$,
    );
    expect(screen.getByRole('link', { name: 'Memberships' })).toHaveAttribute(
      'href',
      tabRoutes.about({}).$,
    );
  });
});

describe('alumni', () => {
  const alumniProps = {
    alumniSinceDate: new Date('2022-09-12T12:00:00').toISOString(),
    lastModifiedDate: new Date('2021-09-01T12:00:00').toISOString(),
    editContactInfoHref: '/edit-contact-info',
    social: { github: 'octocat' },
  };

  it('shows the alumni tag', () => {
    renderHeader(alumniProps);
    expect(screen.getByText('Alumni')).toBeVisible();
  });

  it('shows the alumni toast', () => {
    renderHeader({ ...alumniProps, alumniLocation: 'Some University' });
    expect(
      screen.getByText(
        /Records indicate the individual transitioned to alumni/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/final affiliation noted at/)).toBeInTheDocument();
    expect(screen.getByText(/1st September 2021/)).toBeInTheDocument();
  });

  it('prefers alumniLastUpdated over lastModifiedDate in the toast', () => {
    renderHeader({
      ...alumniProps,
      alumniLastUpdated: new Date('2023-03-15T12:00:00').toISOString(),
    });
    expect(screen.getByText(/15th March 2023/)).toBeInTheDocument();
    expect(screen.queryByText(/1st September 2021/)).not.toBeInTheDocument();
  });

  it('hides contact, external profiles and the upcoming events tab', () => {
    renderHeader(alumniProps);
    expect(
      screen.queryByRole('link', { name: /contact/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Copy' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /edit contact/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('External profiles:')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'tabs' }))
        .getAllByRole('listitem')
        .map(({ textContent }) => textContent),
    ).toStrictEqual(['Overview', 'Memberships', 'Outputs (0)', 'Past Events']);
  });
});
