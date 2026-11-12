import { ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { addDays, addMinutes, subDays, subMinutes } from 'date-fns';
import {
  createCalendarResponse,
  createEventResponse,
} from '@asap-hub/fixtures';

import EventDetailPage from '../EventDetailPage';

const aboutHref = '/events/1/about';
const meetingMaterialsHref = '/events/1/meeting-materials';

const props: ComponentProps<typeof EventDetailPage> = {
  ...createEventResponse(),
  hasFinished: false,
  hasSpeakersToBeAnnounced: false,
  tags: [],
  eventOwner: <div>ASAP Team</div>,
  eventConversation: <div>Event Conversation</div>,
  displayCalendar: false,
  calendarOwner: { name: 'Calendar Owner', icon: <span>Owner Icon</span> },
  aboutHref,
  meetingMaterialsHref,
  selectedTab: 'about',
};

const renderPage = (ui: React.ReactElement, path = aboutHref) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

it('renders the event title', () => {
  renderPage(<EventDetailPage {...props} title="My Event" />);
  expect(screen.getByRole('heading', { name: 'My Event' })).toBeVisible();
});

it('does not truncate a long event title', () => {
  const title =
    'A very long event title that would normally get cut off'.padEnd(80, 'x');
  renderPage(<EventDetailPage {...props} title={title} />);
  expect(screen.getByRole('heading', { name: title })).toBeVisible();
});

it('renders breadcrumbs to the events list', () => {
  renderPage(<EventDetailPage {...props} title="My Event" />);
  const breadcrumbs = screen.getByRole('navigation', { name: 'breadcrumbs' });
  expect(
    within(breadcrumbs).getByRole('link', { name: 'Calendar & Events' }),
  ).toHaveAttribute('href', '/events');
  expect(within(breadcrumbs).getByText('My Event')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('renders the cancellation banner for a cancelled event', () => {
  renderPage(<EventDetailPage {...props} status="Cancelled" />);
  expect(screen.getByText('The event has been cancelled.')).toBeVisible();
});

it('renders the live banner with the meeting link while the event is happening', () => {
  renderPage(
    <EventDetailPage
      {...props}
      status="Confirmed"
      meetingLink="http://example.com"
      startDate={addMinutes(new Date(), 1).toISOString()}
      endDate={addMinutes(new Date(), 30).toISOString()}
    />,
  );
  expect(screen.getByText('This event is happening now.')).toBeVisible();
  expect(screen.getByText('Join Meeting Now').closest('a')).toHaveAttribute(
    'href',
    'http://example.com',
  );
});

it('does not render the last updated date', () => {
  renderPage(<EventDetailPage {...props} />);
  expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument();
});

it('falls back to the event dates when hasFinished is not provided', () => {
  renderPage(
    <EventDetailPage
      {...props}
      hasFinished={undefined}
      startDate={subDays(new Date(), 2).toISOString()}
      endDate={subDays(new Date(), 1).toISOString()}
    />,
  );
  expect(screen.getByRole('link', { name: 'About' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Meeting Materials' })).toBeVisible();
});

it('renders the about section with description and tags', () => {
  renderPage(
    <EventDetailPage {...props} description="My Desc" tags={['My Tag']} />,
  );
  expect(screen.getByText('About this event')).toBeVisible();
  expect(screen.getByText('My Desc')).toBeVisible();
  expect(screen.getAllByText('My Tag').length).toBeGreaterThan(0);
});

it('shows the tags only in the about section, not in the hero', () => {
  renderPage(
    <EventDetailPage {...props} description="My Desc" tags={['My Tag']} />,
  );
  expect(screen.getAllByText('My Tag')).toHaveLength(1);
});

it('renders the description without the always-on collapse toggle', () => {
  renderPage(
    <EventDetailPage
      {...props}
      description="My Desc"
      endDate={addDays(new Date(), 1).toISOString()}
    />,
  );
  expect(screen.getByText('My Desc')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: /(show|hide) (more|less)/i }),
  ).not.toBeInTheDocument();
});

it('shows the about section before the children section', () => {
  const { container } = renderPage(
    <EventDetailPage {...props} description="My Desc">
      <div>My Speakers</div>
    </EventDetailPage>,
  );
  const text = container.textContent ?? '';
  expect(text.indexOf('About this event')).toBeGreaterThan(-1);
  expect(text.indexOf('About this event')).toBeLessThan(
    text.indexOf('My Speakers'),
  );
});

it('omits the about section without description and tags', () => {
  renderPage(<EventDetailPage {...props} description="" tags={[]} />);
  expect(screen.queryByText('About this event')).not.toBeInTheDocument();
});

it('does not render a separate join card for an upcoming event', () => {
  renderPage(
    <EventDetailPage
      {...props}
      startDate={addDays(new Date(), 1).toISOString()}
      endDate={addDays(new Date(), 2).toISOString()}
      meetingLink="link"
      hideMeetingLink={false}
    />,
  );
  expect(screen.queryByText(/join this event/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/join the meeting/i)).not.toBeInTheDocument();
});

it('renders About and Meeting Materials tabs for a finished event', () => {
  renderPage(<EventDetailPage {...props} hasFinished />);
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
    'href',
    aboutHref,
  );
  expect(
    screen.getByRole('link', { name: 'Meeting Materials' }),
  ).toHaveAttribute('href', meetingMaterialsHref);
});

it('does not render the tab navigation for an upcoming event', () => {
  renderPage(<EventDetailPage {...props} hasFinished={false} />);
  expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Meeting Materials' }),
  ).not.toBeInTheDocument();
});

it('hides meeting materials on the About tab', () => {
  renderPage(
    <EventDetailPage
      {...props}
      endDate={subDays(new Date(), 100).toISOString()}
      notes="My Notes"
      videoRecording="My Video"
      presentation="My Presentation"
    />,
  );
  expect(
    screen.queryByRole('heading', { name: 'Notes', level: 2 }),
  ).not.toBeInTheDocument();
});

it('renders the event materials once the event has ended on the Meeting Materials tab', () => {
  renderPage(
    <EventDetailPage
      {...props}
      selectedTab="meeting-materials"
      endDate={subDays(new Date(), 100).toISOString()}
      notes="My Notes"
      videoRecording="My Video"
      presentation="My Presentation"
    />,
    meetingMaterialsHref,
  );
  expect(
    screen.getByRole('heading', { name: 'Notes', level: 2 }),
  ).toBeVisible();
  expect(screen.getByText('My Video')).toBeVisible();
  expect(screen.getByText('My Presentation')).toBeVisible();
});

it('renders additional meeting materials once the event has ended', () => {
  renderPage(
    <EventDetailPage
      {...props}
      selectedTab="meeting-materials"
      endDate={subDays(new Date(), 100).toISOString()}
      meetingMaterials={[
        { title: 'Extra Material', url: 'http://example.com' },
      ]}
    />,
    meetingMaterialsHref,
  );
  expect(screen.getByText('Extra Material')).toBeVisible();
});

it('hides the about content on the Meeting Materials tab', () => {
  renderPage(
    <EventDetailPage
      {...props}
      selectedTab="meeting-materials"
      description="My Desc"
      eventSpeakers={<div>Speakers Card</div>}
    />,
    meetingMaterialsHref,
  );
  expect(screen.queryByText('About this event')).not.toBeInTheDocument();
  expect(screen.queryByText('Speakers Card')).not.toBeInTheDocument();
});

it('renders calendar list when displayCalendar is true', () => {
  renderPage(
    <EventDetailPage
      {...props}
      displayCalendar
      calendar={{ ...createCalendarResponse(), name: 'Event Calendar' }}
      calendarOwner={{
        name: 'My Interest Group',
        href: '/network/interest-groups/ig-1',
        icon: <span>Interest Group Icon</span>,
      }}
    />,
  );
  expect(
    screen.getByRole('link', { name: 'My Interest Group' }),
  ).toHaveAttribute('href', '/network/interest-groups/ig-1');
  expect(screen.getByText('Interest Group Icon')).toBeVisible();
  expect(screen.queryByText('Event Calendar')).not.toBeInTheDocument();
  expect(screen.queryByText('●')).not.toBeInTheDocument();
});

it('shows the calendar owner name without a link when there is no href', () => {
  renderPage(
    <EventDetailPage
      {...props}
      displayCalendar
      calendarOwner={{ name: 'Event Calendar', icon: <span>Icon</span> }}
    />,
  );
  expect(screen.getByText('Event Calendar')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Event Calendar' }),
  ).not.toBeInTheDocument();
});

it('renders related research when there are items to display', () => {
  renderPage(
    <EventDetailPage
      {...props}
      relatedResearch={[
        {
          id: '123',
          title: 'My Research',
          type: '3D Printing',
          documentType: 'Article',
          teams: [],
          workingGroups: [],
        },
      ]}
    />,
  );
  expect(
    within(screen.getByTestId('event-related-research')).getByText(
      'My Research',
    ),
  ).toBeVisible();
});

describe('related research table', () => {
  const relatedResearch: ComponentProps<
    typeof EventDetailPage
  >['relatedResearch'] = [
    {
      id: 'preprint-1',
      title: 'A preprint',
      type: 'Preprint',
      documentType: 'Article',
      teams: [{ id: 'team-1', displayName: 'Team A' }],
      workingGroups: [],
    },
    {
      id: 'dataset-1',
      title: 'A dataset',
      type: 'Clinical',
      documentType: 'Dataset',
      teams: [{ id: 'team-1', displayName: 'Team A' }],
      workingGroups: [{ id: 'wg-1', title: 'WG A' }],
    },
    {
      id: 'protocol-1',
      title: 'A protocol',
      type: 'Assay',
      documentType: 'Protocol',
      teams: [
        { id: 'team-1', displayName: 'Team A' },
        { id: 'team-2', displayName: 'Team B' },
      ],
      workingGroups: [],
    },
  ];

  it('shows the output, type and source columns', () => {
    renderPage(
      <EventDetailPage {...props} relatedResearch={relatedResearch} />,
    );
    ['Output', 'Type', 'From'].forEach((title) =>
      expect(screen.getAllByText(title)[0]).toBeInTheDocument(),
    );
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    const table = screen.getByTestId('event-related-research');
    expect(
      within(table).getByRole('link', { name: 'A preprint' }),
    ).toHaveAttribute('href', expect.stringContaining('preprint-1'));
    expect(within(table).getByText('Preprint')).toBeInTheDocument();
    expect(within(table).getByText('Dataset')).toBeInTheDocument();
    expect(within(table).queryByText('Clinical')).not.toBeInTheDocument();
    expect(within(table).queryByText('Assay')).not.toBeInTheDocument();
  });

  it('links to the working group before the teams', () => {
    renderPage(
      <EventDetailPage {...props} relatedResearch={relatedResearch} />,
    );
    expect(screen.getByRole('link', { name: 'WG A' })).toHaveAttribute(
      'href',
      expect.stringContaining('wg-1'),
    );
    expect(screen.getByRole('link', { name: 'Team A' })).toHaveAttribute(
      'href',
      expect.stringContaining('team-1'),
    );
  });

  it('shows multiple teams without a link', () => {
    renderPage(
      <EventDetailPage {...props} relatedResearch={relatedResearch} />,
    );
    expect(screen.getByText('Multiple teams')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Multiple teams' }),
    ).not.toBeInTheDocument();
  });
});

it('renders related tutorials when there are items to display', () => {
  renderPage(
    <EventDetailPage
      {...props}
      relatedTutorials={[
        {
          title: 'Tutorial1',
          id: 'tutorial-1',
          created: new Date(2003, 1, 1, 1).toISOString(),
        },
      ]}
    />,
  );
  expect(screen.getByText('Related Tutorials')).toBeVisible();
  expect(screen.getByText(/Tutorial1/i)).toBeVisible();
});

it('renders the related research and tutorials cards with empty states when there are no items', () => {
  renderPage(
    <EventDetailPage {...props} relatedResearch={[]} relatedTutorials={[]} />,
  );
  expect(screen.getByText('Related Research')).toBeVisible();
  expect(screen.getByText('No related research available.')).toBeVisible();
  expect(screen.getByText('Related Tutorials')).toBeVisible();
  expect(screen.getByText('No related tutorials available.')).toBeVisible();
});

it('renders the children', () => {
  renderPage(<EventDetailPage {...props}>Children</EventDetailPage>);
  expect(screen.getByText('Children')).toBeVisible();
});

it('renders the attendance node when passed', () => {
  renderPage(
    <EventDetailPage {...props} eventAttendance={<div>Attendance Card</div>} />,
  );
  expect(screen.getByText('Attendance Card')).toBeVisible();
});

it('does not render an attendance node when none is passed', () => {
  renderPage(<EventDetailPage {...props} />);
  expect(screen.queryByText('Attendance Card')).not.toBeInTheDocument();
});

it('renders the speakers node when passed', () => {
  renderPage(
    <EventDetailPage {...props} eventSpeakers={<div>Speakers Card</div>} />,
  );
  expect(screen.getByText('Speakers Card')).toBeVisible();
});

it('shows the missing meeting link tooltip below the join button', () => {
  renderPage(
    <EventDetailPage
      {...props}
      status="Confirmed"
      meetingLink={undefined}
      hideMeetingLink={false}
      startDate={subMinutes(new Date(), 1).toISOString()}
      endDate={addMinutes(new Date(), 30).toISOString()}
    />,
  );
  const button = screen.getByText('Join Meeting Now').closest('a')!;
  expect(button.nextElementSibling).toContainElement(
    screen.getByText(/couldn’t find the link to this event/),
  );
});

describe('options for other hubs', () => {
  it('renders the hero banner before the event header', () => {
    renderPage(
      <EventDetailPage
        {...props}
        title="My Event"
        heroBanner={<div>Hero Banner</div>}
      />,
    );
    const article = screen.getByRole('article');
    expect(article.firstElementChild).toHaveTextContent('Hero Banner');
    expect(
      screen.getByRole('heading', { name: 'My Event' }),
    ).toBeInTheDocument();
  });

  it('hides the breadcrumbs', () => {
    renderPage(<EventDetailPage {...props} hideBreadcrumbs />);
    expect(
      screen.queryByRole('navigation', { name: 'breadcrumbs' }),
    ).not.toBeInTheDocument();
  });

  it('renders the hero event without a card when plainHero is set', () => {
    renderPage(<EventDetailPage {...props} title="My Event" plainHero />);
    const heroCard = screen
      .getByRole('heading', { name: 'My Event' })
      .closest('section')!;
    expect(getComputedStyle(heroCard).borderStyle).toBe('none');
  });

  it('renders the event toast above the hero banner when toastAboveBanner is set', () => {
    renderPage(
      <EventDetailPage
        {...props}
        title="My Event"
        status="Cancelled"
        heroBanner={<div>Hero Banner</div>}
        toastAboveBanner
      />,
    );
    const article = screen.getByRole('article');
    expect(article.firstElementChild).toHaveTextContent(
      'The event has been cancelled.',
    );
    expect(article.children[1]).toHaveTextContent('Hero Banner');
    expect(screen.getAllByText('The event has been cancelled.')).toHaveLength(
      1,
    );
  });

  it('renders the event toast inside the hero card by default', () => {
    renderPage(
      <EventDetailPage
        {...props}
        title="My Event"
        status="Cancelled"
        heroBanner={<div>Hero Banner</div>}
      />,
    );
    const heroCard = screen
      .getByRole('heading', { name: 'My Event' })
      .closest('section')!;
    expect(heroCard).toHaveTextContent('The event has been cancelled.');
  });

  it('renders the hero event inside a card by default', () => {
    renderPage(<EventDetailPage {...props} title="My Event" />);
    const heroCard = screen
      .getByRole('heading', { name: 'My Event' })
      .closest('section')!;
    expect(getComputedStyle(heroCard).borderStyle).toBe('solid');
  });

  it('renders a custom related research card in place of the default one', () => {
    renderPage(
      <EventDetailPage
        {...props}
        relatedResearchCard={<div>Custom Related Research</div>}
      />,
    );
    expect(screen.getByText('Custom Related Research')).toBeVisible();
    expect(
      screen.queryByText(
        'Find all shared research outputs related to this event.',
      ),
    ).not.toBeInTheDocument();
  });

  it('does not render the related tutorials card when there are none', () => {
    renderPage(<EventDetailPage {...props} relatedTutorials={undefined} />);
    expect(
      screen.queryByRole('heading', { name: 'Related Tutorials' }),
    ).not.toBeInTheDocument();
  });

  it('hides the calendar instructions in the support section', () => {
    renderPage(<EventDetailPage {...props} hideCalendarInstructions />);
    expect(
      screen.queryByRole('link', { name: 'Apple Calendar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Contact tech support' }),
    ).toBeVisible();
  });
});
