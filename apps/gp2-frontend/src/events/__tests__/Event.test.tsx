import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { gp2 } from '@asap-hub/fixtures';
import { disable, enable } from '@asap-hub/flags';
import { events } from '@asap-hub/routing';
import { subDays } from 'date-fns';

import Event from '../Event';
import { getEvent } from '../api';
import { Auth0Provider, WhenReady } from '../../auth/test-utils';

jest.mock('../api');

const id = '42';

const mockGetEvent = getEvent as jest.MockedFunction<typeof getEvent>;
beforeEach(() => {
  jest.resetAllMocks();
  disable('NEW_EVENT_PAGE');
});

const eventRoute = events({}).event({ eventId: id });

const renderEvent = async (path: string = eventRoute.$) => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Auth0Provider user={{}}>
        <WhenReady>
          <Suspense fallback="Loading...">
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route
                  path={`${events.template}${events({}).event.template}/*`}
                  element={<Event />}
                />
              </Routes>
            </MemoryRouter>
          </Suspense>
        </WhenReady>
      </Auth0Provider>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
};

it('displays the event with given id', async () => {
  mockGetEvent.mockResolvedValue({
    ...gp2.createEventResponse(),
    id,
    title: 'Kool Event',
    tags: [
      { id: 'tag-1', name: '10X Genomics' },
      { id: 'tag-1', name: '2D cultures' },
    ],
  });
  await renderEvent();
  expect(screen.getByText('Kool Event', { exact: false })).toBeVisible();
  expect(screen.getByText('10X Genomics', { exact: false })).toBeVisible();
  expect(screen.getByText('2D cultures', { exact: false })).toBeVisible();
  expect(mockGetEvent.mock.calls).toEqual([[id, expect.anything()]]);
});

it('falls back to the not found page for a missing event', async () => {
  mockGetEvent.mockResolvedValue(undefined);
  await renderEvent();
  expect(await screen.findByText(/sorry.+page/i)).toBeVisible();
});
describe('Event Speakers', () => {
  it('displays the speakers section when there are speakers', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse({
        numberOfInternalSpeakers: 1,
        numberOfExternalSpeakers: 0,
        numberOfSpeakersToBeAnnounced: 0,
      }),
      id,
    });
    await renderEvent();
    expect(screen.getAllByText(/Speaker/i)).not.toHaveLength(0);
  });
  it('does not display the speakers section when there are non available', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse({
        numberOfInternalSpeakers: 0,
        numberOfExternalSpeakers: 0,
        numberOfSpeakersToBeAnnounced: 0,
      }),
      id,
      title: 'Kool Event',
    });
    await renderEvent();

    expect(screen.queryByText(/Speaker/i)).not.toBeInTheDocument();
  });
});

describe('the NEW_EVENT_PAGE flag', () => {
  beforeEach(() => {
    enable('NEW_EVENT_PAGE');
  });

  it('shows the redesigned page on the About tab', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      title: 'Kool Event',
    });
    await renderEvent();

    expect(
      await screen.findByRole('heading', { name: 'Kool Event' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'About this event' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Speakers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Related Research' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Subscribe to this group’s calendar',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This event comes from the calendar of the group below/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Calendar & Events')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/set up your calendar manually/i),
    ).not.toBeInTheDocument();
  });

  it('does not show the speakers card when the event has no speakers', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse({
        numberOfInternalSpeakers: 0,
        numberOfExternalSpeakers: 0,
        numberOfSpeakersToBeAnnounced: 0,
      }),
      id,
      title: 'Speakerless Event',
    });
    await renderEvent();

    expect(
      await screen.findByRole('heading', { name: 'Speakerless Event' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Speakers' }),
    ).not.toBeInTheDocument();
  });

  it('links the calendar subscription to the working group', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      title: 'Kool Event',
      workingGroup: { id: 'wg-1', title: 'My Working Group' },
    });
    await renderEvent();

    const heading = await screen.findByRole('heading', {
      name: 'Subscribe to this group’s calendar',
    });
    const card = heading.parentElement!.parentElement!;
    expect(
      within(card).getByRole('link', { name: 'My Working Group' }),
    ).toHaveAttribute('href', expect.stringMatching(/wg-1$/));
  });

  it('hides the calendar subscription when the project is completed', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      title: 'Kool Event',
      project: { id: 'project-1', title: 'A Project', status: 'Completed' },
    });
    await renderEvent();

    expect(
      await screen.findByRole('heading', { name: 'Kool Event' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: 'Subscribe to this group’s calendar',
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the calendar subscription when the project is completed but the event belongs to a working group', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      title: 'Kool Event',
      project: { id: 'project-1', title: 'A Project', status: 'Completed' },
      workingGroup: { id: 'wg-1', title: 'A Working Group' },
    });
    await renderEvent();

    expect(
      await screen.findByRole('heading', {
        name: 'Subscribe to this group’s calendar',
      }),
    ).toBeInTheDocument();
  });

  it.each(['Active', 'Paused'] as const)(
    'shows the calendar subscription when the project is %s',
    async (status) => {
      mockGetEvent.mockResolvedValue({
        ...gp2.createEventResponse(),
        id,
        title: 'Kool Event',
        project: { id: 'project-1', title: 'A Project', status },
      });
      await renderEvent();

      expect(
        await screen.findByRole('heading', {
          name: 'Subscribe to this group’s calendar',
        }),
      ).toBeInTheDocument();
    },
  );

  it('keeps the current page when disabled', async () => {
    disable('NEW_EVENT_PAGE');
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      title: 'Kool Event',
    });
    await renderEvent();

    expect(await screen.findByText('Kool Event')).toBeVisible();
    expect(
      screen.queryByText(
        /This event comes from the calendar of the group below/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Related Research' }),
    ).not.toBeInTheDocument();
  });

  it('lists the related outputs with their status and source', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      relatedOutputs: [
        {
          id: 'output-1',
          title: 'A research article',
          documentType: 'Article',
          type: 'Research',
          entity: { id: 'project-1', title: 'A project', type: 'Projects' },
        },
      ],
    });
    await renderEvent();

    const table = await screen.findByTestId('event-related-research');
    expect(
      within(table).getByRole('link', { name: 'A research article' }),
    ).toHaveAttribute('href', expect.stringContaining('output-1'));
    expect(within(table).getByText('Research')).toBeInTheDocument();
    expect(
      within(table).getByRole('link', { name: 'A project' }),
    ).toHaveAttribute('href', expect.stringContaining('project-1'));
  });

  it('shows the meeting materials tabs once the event has finished', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      startDate: subDays(new Date(), 3).toISOString(),
      endDate: subDays(new Date(), 3).toISOString(),
      notes: 'My Notes',
    });
    await renderEvent();

    expect(await screen.findByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      eventRoute.about({}).$,
    );
    expect(
      screen.getByRole('link', { name: 'Meeting Materials' }),
    ).toHaveAttribute('href', eventRoute.meetingMaterials({}).$);
    expect(
      screen.queryByRole('heading', { name: 'Notes' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle(/paper/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Recording')).not.toBeInTheDocument();
  });

  it('shows the meeting materials on the Meeting Materials tab', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      startDate: subDays(new Date(), 3).toISOString(),
      endDate: subDays(new Date(), 3).toISOString(),
      notes: 'My Notes',
    });
    await renderEvent(eventRoute.meetingMaterials({}).$);

    expect(
      await screen.findByRole('heading', { name: 'Notes' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'About this event' }),
    ).not.toBeInTheDocument();
  });

  it('shows the event toast above the banner', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id,
      title: 'Kool Event',
      status: 'Cancelled',
    });
    await renderEvent();

    const article = await screen.findByRole('article');
    expect(article.firstElementChild).toHaveTextContent(
      'The event has been cancelled.',
    );
    expect(article.children[1]).toHaveAttribute('role', 'presentation');
  });

  it('expands and collapses a speaker row', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse({ numberOfInternalSpeakers: 2 }),
      id,
    });
    await renderEvent();

    const firstToggle = await screen.findByRole('button', {
      name: 'Show details for John Doe 0',
    });
    expect(firstToggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(firstToggle);
    expect(
      screen.getByRole('button', { name: 'Hide details for John Doe 0' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'Show details for John Doe 1' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
