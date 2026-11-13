import { ComponentProps, ReactElement, ReactNode } from 'react';
import {
  render as baseRender,
  RenderResult,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { addDays, formatISO, subDays, subYears } from 'date-fns';
import {
  createCalendarResponse,
  createEventResponse,
} from '@asap-hub/fixtures';

import EventPage from '../EventPage';

const render = (ui: ReactElement, initialEntry = '/'): RenderResult => {
  const wrap = (element: ReactNode) => (
    <MemoryRouter initialEntries={[initialEntry]}>{element}</MemoryRouter>
  );
  const result = baseRender(wrap(ui));
  return {
    ...result,
    rerender: (element: ReactNode) => result.rerender(wrap(element)),
  };
};

const props: ComponentProps<typeof EventPage> = {
  ...createEventResponse(),
  hasFinished: false,
  tags: [],
  eventOwner: <div>ASAP Team</div>,
  eventConversation: <div>ASAP Team</div>,
  displayCalendar: false,
  backHref: '/prev',
  getIconForDocumentType: jest.fn(),
};

it('renders the event info', () => {
  const { getByText } = render(<EventPage {...props} title="My Event" />);
  expect(getByText('My Event')).toBeVisible();
});

it('renders a back link', () => {
  const { getByText } = render(<EventPage {...props} backHref="/prev" />);
  expect(getByText(/back/i).closest('a')).toHaveAttribute('href', '/prev');
});

it('renders the last updated date', () => {
  const { getByText } = render(
    <EventPage
      {...props}
      lastModifiedDate={formatISO(subYears(new Date(), 2))}
    />,
  );
  expect(getByText(/update/i)).toHaveTextContent(/2 year/i);
});

it('renders the event description', () => {
  const { getByText } = render(<EventPage {...props} description="My Desc" />);
  expect(getByText('My Desc')).toBeVisible();
});

it("renders the join event button, when 'hideMeetingLink' is set to false", () => {
  const { rerender } = render(
    <EventPage
      {...props}
      endDate={addDays(new Date(), 100).toISOString()}
      meetingLink={'link'}
      hideMeetingLink={false}
    />,
  );
  expect(screen.getAllByText(/join the meeting/i)).not.toHaveLength(0);

  rerender(
    <EventPage
      {...props}
      endDate={addDays(new Date(), 100).toISOString()}
      meetingLink={'link'}
      hideMeetingLink={true}
    />,
  );
  expect(screen.queryAllByText(/join the meeting/i)).toHaveLength(0);
});

it('renders the event notes', () => {
  const { getByRole } = render(
    <EventPage
      {...props}
      endDate={subDays(new Date(), 100).toISOString()}
      notes="My Notes"
    />,
  );
  expect(getByRole('heading', { name: 'Notes', level: 2 })).toBeVisible();
});

it('renders the video recording', () => {
  const { getByText } = render(
    <EventPage
      {...props}
      endDate={subDays(new Date(), 100).toISOString()}
      videoRecording="My Video"
    />,
  );
  expect(getByText('My Video')).toBeVisible();
});

it('renders the presentation', () => {
  const { getByText } = render(
    <EventPage
      {...props}
      endDate={subDays(new Date(), 100).toISOString()}
      presentation="My Presentation"
    />,
  );
  expect(getByText('My Presentation')).toBeVisible();
});

it('renders additional materials', () => {
  const { getByText } = render(
    <EventPage
      {...props}
      endDate={subDays(new Date(), 100).toISOString()}
      meetingMaterials={[
        { title: 'Example Material', url: 'http://example.com' },
      ]}
    />,
  );
  expect(getByText('Example Material')).toBeVisible();
});

it('renders calendar list when displayCalendar is true', () => {
  const { queryByText } = render(
    <EventPage
      {...props}
      displayCalendar
      calendar={{ ...createCalendarResponse(), name: 'Event Calendar' }}
    />,
  );
  expect(queryByText('Event Calendar')).toBeInTheDocument();
});

it('renders related research when there are items to display', () => {
  const { getByText } = render(
    <EventPage
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
  expect(getByText('My Research')).toBeVisible();
});

it('renders related tutorials when there are items to display', () => {
  const { getByText, rerender, queryByText } = render(
    <EventPage {...props} relatedTutorials={[]} />,
  );
  expect(
    queryByText(/Related Tutorials/i, { selector: 'h2' }),
  ).not.toBeInTheDocument();

  rerender(
    <EventPage
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
  expect(getByText('Related Tutorials')).toBeVisible();
  expect(getByText(/Tutorial1/i)).toBeVisible();
});

it('renders the children', () => {
  const { queryByText } = render(<EventPage {...props}>Children</EventPage>);
  expect(queryByText('Children')).toBeVisible();
});

describe('footer', () => {
  const originalNavigator = window.navigator;
  Object.assign(window.navigator, {
    clipboard: {
      writeText: () => {},
    },
  });

  beforeEach(() => {
    jest.spyOn(window.navigator.clipboard, 'writeText');
  });
  afterEach(() => {
    Object.assign(window.navigator, originalNavigator);
  });

  it('does not render the footer cta when event has finished', () => {
    const { queryByText, queryByTitle } = render(
      <EventPage {...props} hasFinished />,
    );

    expect(queryByText('Contact tech support')).not.toBeInTheDocument();
    expect(queryByTitle(/copy/i)).not.toBeInTheDocument();
  });

  it('renders the footer cta when event has not finished', () => {
    const { getByText } = render(<EventPage {...props} hasFinished={false} />);

    expect(getByText('Contact tech support').parentElement).toHaveAttribute(
      'href',
      'mailto:techsupport@asap.science',
    );
  });

  it('renders the footer cta with the given support email', () => {
    const { getByText } = render(
      <EventPage
        {...props}
        hasFinished={false}
        supportEmail="techsupport@gp2.org"
      />,
    );

    expect(getByText('Contact tech support').parentElement).toHaveAttribute(
      'href',
      'mailto:techsupport@gp2.org',
    );
  });

  it('adds the tech support email to clipboard when user clicks on copy button', async () => {
    const { getByTitle } = render(<EventPage {...props} hasFinished={false} />);

    await userEvent.click(getByTitle(/copy/i));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      expect.stringMatching(/techsupport@asap.science/i),
    );
  });
});

it('scrolls to the material section referenced by the url hash', async () => {
  const { container } = render(
    <EventPage
      {...props}
      notes="My notes"
      endDate={subDays(new Date(), 2).toISOString()}
    />,
    '/events/event-0#event-notes',
  );

  const scrollIntoView = jest.fn();
  Object.assign(container.querySelector('#event-notes')!, { scrollIntoView });

  await waitFor(
    () =>
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      }),
    { timeout: 200 },
  );
});
