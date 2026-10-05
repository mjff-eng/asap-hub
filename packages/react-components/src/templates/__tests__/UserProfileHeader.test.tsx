import { ComponentProps } from 'react';
import { MemoryRouter, StaticRouter } from 'react-router';

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createUserResponse } from '@asap-hub/fixtures';
import { UserProfileContext } from '@asap-hub/react-context';
import { dashboard, network } from '@asap-hub/routing';

import UserProfileHeader from '../UserProfileHeader';

const boilerplateProps: ComponentProps<typeof UserProfileHeader> = {
  ...createUserResponse(),
  role: 'Grantee',
  sharedOutputsCount: 0,
};

it('renders the name as the top-level heading', () => {
  render(
    <UserProfileHeader {...boilerplateProps} fullDisplayName="John Doe" />,
  );
  expect(screen.getByRole('heading')).toHaveTextContent('John Doe');
  expect(screen.getByRole('heading').tagName).toBe('H1');
});

it('generates the mailto link', () => {
  const { getByText } = render(
    <UserProfileHeader {...boilerplateProps} email="me@example.com" />,
  );
  expect(getByText(/contact/i).closest('a')).toHaveAttribute(
    'href',
    'mailto:me@example.com',
  );
});
it('prefers an explicit contact email address', () => {
  const { getByText } = render(
    <UserProfileHeader
      {...boilerplateProps}
      contactEmail="contact@example.com"
    />,
  );
  expect(getByText(/contact/i).closest('a')).toHaveAttribute(
    'href',
    'mailto:contact@example.com',
  );
});
it('copy button adds email to clipboard', async () => {
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn(),
    },
  });
  jest.spyOn(navigator.clipboard, 'writeText');
  render(<UserProfileHeader {...boilerplateProps} email="me@example.com" />);
  const copyButton = screen.getByRole('button', { name: 'Copy' });
  expect(copyButton).toBeVisible();
  await userEvent.click(copyButton);
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('me@example.com');
});
describe('an edit button', () => {
  it('is not rendered by default', () => {
    const { queryByLabelText } = render(
      <UserProfileHeader {...boilerplateProps} />,
    );
    expect(queryByLabelText(/edit/i)).not.toBeInTheDocument();
  });

  it('is rendered for personal info', () => {
    const { getByLabelText } = render(
      <UserProfileHeader
        {...boilerplateProps}
        editPersonalInfoHref="/edit-personal-info"
      />,
    );
    expect(getByLabelText(/edit.+personal/i)).toHaveAttribute(
      'href',
      '/edit-personal-info',
    );
  });

  it('is rendered for contact info', () => {
    const { getByLabelText } = render(
      <UserProfileHeader
        {...boilerplateProps}
        editContactInfoHref="/edit-contact-info"
      />,
    );
    expect(getByLabelText(/edit.+contact/i)).toHaveAttribute(
      'href',
      '/edit-contact-info',
    );
  });

  it('lets the user upload an avatar', async () => {
    const onImageSelect = jest.fn((_file: File) => {});
    const testFile = new File(['foo'], 'foo.png', { type: 'image/png' });
    const { getByLabelText } = render(
      <UserProfileHeader {...boilerplateProps} onImageSelect={onImageSelect} />,
    );
    const uploadOverlay = getByLabelText(/edit.+avatar/i);
    const uploadInput = getByLabelText(/upload.+avatar/i) as HTMLInputElement;
    expect(uploadOverlay).toBeInTheDocument();
    expect(uploadInput).not.toHaveAttribute('disabled');
    fireEvent.change(uploadInput, { target: { files: [testFile] } });
    expect(onImageSelect).toHaveBeenCalledWith(testFile);
  });

  it('shows a spinner and hides the upload while the avatar is saving', () => {
    const { getByRole, queryByLabelText } = render(
      <UserProfileHeader
        {...boilerplateProps}
        onImageSelect={jest.fn()}
        avatarSaving
      />,
    );
    expect(getByRole('progressbar')).toBeInTheDocument();
    expect(queryByLabelText(/upload.+avatar/i)).not.toBeInTheDocument();
  });
});

it('shows placeholder text for degree on own profile when omitted', () => {
  const { queryByText, rerender } = render(
    <UserProfileContext.Provider value={{ isOwnProfile: false }}>
      <UserProfileHeader {...boilerplateProps} degree={undefined} />,
    </UserProfileContext.Provider>,
  );
  expect(queryByText(/degree/i)).toBeNull();
  rerender(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfileHeader {...boilerplateProps} degree={undefined} />,
    </UserProfileContext.Provider>,
  );
  expect(queryByText(/degree/i)).toBeVisible();
  rerender(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfileHeader {...boilerplateProps} degree="BA" />,
    </UserProfileContext.Provider>,
  );
  expect(queryByText(/, BA/i)).toBeVisible();
});

describe('alumni', () => {
  it('shows the alumni badge when user is alumni', () => {
    const {
      queryAllByText,
      queryByText,
      queryAllByTitle,
      queryByTitle,
      rerender,
    } = render(
      <UserProfileContext.Provider value={{ isOwnProfile: false }}>
        <UserProfileHeader
          {...boilerplateProps}
          alumniSinceDate={new Date().toISOString()}
          degree={undefined}
        />
        ,
      </UserProfileContext.Provider>,
    );
    expect(queryAllByText('Alumni').length).toBeGreaterThan(0);
    expect(queryAllByTitle('Alumni Member').length).toBeGreaterThan(0);

    rerender(
      <UserProfileContext.Provider value={{ isOwnProfile: false }}>
        <UserProfileHeader {...boilerplateProps} degree={undefined} />,
      </UserProfileContext.Provider>,
    );
    expect(queryByText('Alumni')).not.toBeInTheDocument();
    expect(queryByTitle('Alumni Member')).not.toBeInTheDocument();
  });

  it('shows the proper alumni toast message when user is alumni', () => {
    const { queryByText, rerender } = render(
      <UserProfileContext.Provider value={{ isOwnProfile: false }}>
        <UserProfileHeader
          {...boilerplateProps}
          alumniSinceDate={new Date('2022-09-12T12:00:00').toISOString()}
          lastModifiedDate={new Date('2021-09-01T12:00:00').toISOString()}
          degree={undefined}
        />
      </UserProfileContext.Provider>,
    );
    expect(
      queryByText(/Records indicate the individual transitioned to alumni/),
    ).toBeInTheDocument();
    rerender(
      <UserProfileContext.Provider value={{ isOwnProfile: false }}>
        <UserProfileHeader
          {...boilerplateProps}
          alumniSinceDate={new Date('2022-09-12T12:00:00').toISOString()}
          lastModifiedDate={new Date('2021-09-01T12:00:00').toISOString()}
          alumniLocation={'Some University'}
          degree={undefined}
        />
      </UserProfileContext.Provider>,
    );
    expect(
      queryByText(/final affiliation noted at/, { exact: false }),
    ).toBeInTheDocument();
  });

  it('shows alumniLastUpdated date instead of lastModifiedDate when available', () => {
    render(
      <UserProfileContext.Provider value={{ isOwnProfile: false }}>
        <UserProfileHeader
          {...boilerplateProps}
          alumniSinceDate={new Date('2022-09-12T12:00:00').toISOString()}
          alumniLastUpdated={new Date('2023-03-15T12:00:00').toISOString()}
          lastModifiedDate={new Date('2024-01-01T12:00:00').toISOString()}
          degree={undefined}
        />
      </UserProfileContext.Provider>,
    );
    expect(screen.getByText(/15th March 2023/)).toBeInTheDocument();
    expect(screen.queryByText(/1st January 2024/)).not.toBeInTheDocument();
  });

  it('falls back to lastModifiedDate when alumniLastUpdated is not set', () => {
    render(
      <UserProfileContext.Provider value={{ isOwnProfile: false }}>
        <UserProfileHeader
          {...boilerplateProps}
          alumniSinceDate={new Date('2022-09-12T12:00:00').toISOString()}
          lastModifiedDate={new Date('2021-09-01T12:00:00').toISOString()}
          degree={undefined}
        />
      </UserProfileContext.Provider>,
    );
    expect(screen.getByText(/1st September 2021/)).toBeInTheDocument();
  });
});

it('shows lab information if the user is in a lab', async () => {
  const { container, rerender } = render(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfileHeader {...boilerplateProps} labs={[]} />,
    </UserProfileContext.Provider>,
  );
  expect(container).not.toHaveTextContent('Lab');

  rerender(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfileHeader
        {...boilerplateProps}
        labs={[
          { name: 'Brighton', id: '1' },
          { name: 'Liverpool', id: '2' },
        ]}
      />
      ,
    </UserProfileContext.Provider>,
  );
  expect(container).toHaveTextContent('Brighton Lab and Liverpool Lab');
});

it('displays number of shared research', async () => {
  render(
    <UserProfileContext.Provider value={{ isOwnProfile: true }}>
      <UserProfileHeader {...boilerplateProps} sharedOutputsCount={5} />,
    </UserProfileContext.Provider>,
  );
  expect(screen.getByText('Shared Outputs (5)')).toBeInTheDocument();
});

it('renders the navigation for active and inactive groups', () => {
  render(
    <UserProfileHeader
      {...boilerplateProps}
      pastEventsCount={1}
      upcomingEventsCount={1}
    />,
  );

  expect(
    within(screen.getByRole('navigation', { name: 'tabs' }))
      .getAllByRole('listitem')
      .map(({ textContent }) => textContent),
  ).toStrictEqual([
    'Research',
    'Background',
    'Shared Outputs (0)',
    'Upcoming Events (1)',
    'Past Events (1)',
  ]);
});

it('displays number of upcoming events', () => {
  render(
    <StaticRouter
      location={network({}).users({}).user({ userId: '1' }).upcoming({}).$}
    >
      <UserProfileHeader {...boilerplateProps} upcomingEventsCount={10} />
    </StaticRouter>,
  );
  expect(screen.queryByText('Upcoming Events (10)')).toBeInTheDocument();
});

it('displays number of past events', () => {
  render(
    <StaticRouter
      location={network({}).users({}).user({ userId: '1' }).upcoming({}).$}
    >
      <UserProfileHeader {...boilerplateProps} pastEventsCount={9} />
    </StaticRouter>,
  );
  expect(screen.queryByText('Past Events (9)')).toBeInTheDocument();
});

describe('award badge', () => {
  const teamsWithAwards = [
    {
      id: 'team-1',
      displayName: 'Team 1',
      role: 'Project Manager' as const,
      awards: [
        { name: 'Open Science Champion', date: '2023-01-01', iconUrl: 'old' },
        { name: 'Open Science Champion', date: '2024-01-01', iconUrl: 'new' },
      ],
    },
  ];

  it('shows the latest award badge linking to the badges section', () => {
    render(
      <StaticRouter location="/">
        <UserProfileHeader
          {...boilerplateProps}
          id="u1"
          teams={teamsWithAwards}
        />
      </StaticRouter>,
    );

    const badgeLink = screen.getByRole('link', {
      name: /open science champion badge/i,
    });
    expect(badgeLink.getAttribute('href')).toContain('#badges');
    expect(badgeLink.querySelector('img')).toHaveAttribute('src', 'new');
  });

  it('scrolls to the badges section on each click, not just the first', async () => {
    const scrollIntoView = jest.fn();
    const badgesSection = document.createElement('div');
    badgesSection.id = 'badges';
    badgesSection.scrollIntoView = scrollIntoView;
    document.body.appendChild(badgesSection);

    render(
      <MemoryRouter>
        <UserProfileHeader
          {...boilerplateProps}
          id="u1"
          teams={teamsWithAwards}
        />
      </MemoryRouter>,
    );

    const badgeLink = screen.getByRole('link', {
      name: /open science champion badge/i,
    });
    await userEvent.click(badgeLink);
    await userEvent.click(badgeLink);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    badgesSection.remove();
  });

  it('shows no award badge when the user has none', () => {
    render(
      <StaticRouter location="/">
        <UserProfileHeader {...boilerplateProps} teams={[]} />
      </StaticRouter>,
    );

    expect(
      screen.queryByRole('link', { name: /badge/i }),
    ).not.toBeInTheDocument();
  });
});

it('renders breadcrumbs to the people list', () => {
  render(
    <UserProfileHeader {...boilerplateProps} fullDisplayName="Phillip Mars" />,
  );

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
