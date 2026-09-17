import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { addDays, addMinutes, subDays } from 'date-fns';
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
  backHref: '/prev',
  getIconForDocumentType: jest.fn(),
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
  expect(screen.getByText(title)).toBeVisible();
});

it('renders a back link', () => {
  renderPage(<EventDetailPage {...props} backHref="/prev" />);
  expect(screen.getByText(/back/i).closest('a')).toHaveAttribute(
    'href',
    '/prev',
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
  expect(screen.queryByText(/join this event/i)).not.toBeInTheDocument();
});

it('omits the speakers and join card when there is nothing to show', () => {
  renderPage(
    <EventDetailPage {...props} hasFinished>
      {false}
    </EventDetailPage>,
  );
  expect(screen.queryByText(/join this event/i)).not.toBeInTheDocument();
});

it('renders the about section with description and tags', () => {
  renderPage(
    <EventDetailPage {...props} description="My Desc" tags={['My Tag']} />,
  );
  expect(screen.getByText('About this event')).toBeVisible();
  expect(screen.getByText('My Desc')).toBeVisible();
  expect(screen.getAllByText('My Tag').length).toBeGreaterThan(0);
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

it('shows the about section before the speakers and join section', () => {
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

it("renders the join event button, when 'hideMeetingLink' is set to false", () => {
  const endDate = addDays(new Date(), 100).toISOString();
  const { rerender } = renderPage(
    <EventDetailPage
      {...props}
      endDate={endDate}
      meetingLink="link"
      hideMeetingLink={false}
    />,
  );
  expect(screen.getAllByText(/join the meeting/i)).not.toHaveLength(0);

  rerender(
    <MemoryRouter initialEntries={[aboutHref]}>
      <EventDetailPage
        {...props}
        endDate={endDate}
        meetingLink="link"
        hideMeetingLink={true}
      />
    </MemoryRouter>,
  );
  expect(screen.queryAllByText(/join the meeting/i)).toHaveLength(0);
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
    />,
  );
  expect(screen.getByText('Event Calendar')).toBeInTheDocument();
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
  expect(screen.getByText('My Research')).toBeVisible();
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
