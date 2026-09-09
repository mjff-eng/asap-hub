import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Route, Routes, StaticRouter } from 'react-router';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createCalendarResponse,
  createEventResponse,
  createInterestGroupResponse,
  createTeamListItemResponse,
} from '@asap-hub/fixtures';
import { events } from '@asap-hub/routing';
import { disable, enable } from '@asap-hub/flags';
import { subDays } from 'date-fns';
import { EventSpeaker, EventTeamAttendance } from '@asap-hub/model';

import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import Event from '../Event';
import { getEvent, getTeamsForMatching, patchEvent } from '../api';
import { downloadEventSpeakers } from '../export';

jest.mock('../api');
jest.mock('../export');

const mockDownloadEventSpeakers = downloadEventSpeakers as jest.MockedFunction<
  typeof downloadEventSpeakers
>;

globalThis.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as unknown as typeof ResizeObserver;

const id = '42';

const mockGetEvent = getEvent as jest.MockedFunction<typeof getEvent>;
const mockPatchEvent = patchEvent as jest.MockedFunction<typeof patchEvent>;
const mockGetTeamsForMatching = getTeamsForMatching as jest.MockedFunction<
  typeof getTeamsForMatching
>;
beforeEach(() => {
  disable('NEW_EVENT_PAGE');
  mockGetEvent.mockClear();
  mockPatchEvent.mockClear();
  mockGetTeamsForMatching.mockClear();
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    id,
  });
});

const createWrapper =
  (
    user: Parameters<typeof Auth0Provider>[0]['user'] = {},
  ): React.FC<{ children: React.ReactNode }> =>
  ({ children }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <Auth0Provider user={user}>
        <WhenReady>
          <Suspense fallback="Loading...">
            <StaticRouter location={events({}).event({ eventId: id }).$}>
              <Routes>
                <Route
                  path={events.template + events({}).event.template}
                  element={children}
                />
              </Routes>
            </StaticRouter>
          </Suspense>
        </WhenReady>
      </Auth0Provider>
    </QueryClientProvider>
  );

const wrapper = createWrapper();

it('displays the event with given id', async () => {
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    id,
    title: 'Kool Event',
  });
  const { findByText } = render(<Event />, { wrapper });
  expect(await findByText('Kool Event', { exact: false })).toBeVisible();
  expect(mockGetEvent.mock.calls).toEqual([[id, expect.anything()]]);
});

it('renders tags', async () => {
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    id,
    tags: [
      { id: '1', name: 'Tag 1' },
      { id: '2', name: 'Tag 2' },
    ],
  });
  const { findByText } = render(<Event />, { wrapper });
  expect(await findByText('Tag 1')).toBeVisible();
  expect(await findByText('Tag 2')).toBeVisible();
});

it('renders the speakers list', async () => {
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
  });
  const { findByText } = render(<Event />, { wrapper });
  expect(await findByText('Speakers')).toBeVisible();
});

it('shows the interest group thumbnail on the legacy event page', async () => {
  const event = createEventResponse();
  mockGetEvent.mockResolvedValue({
    ...event,
    id,
    title: 'IG Thumb Event',
    thumbnail: undefined,
    interestGroup: {
      ...event.interestGroup!,
      thumbnail: 'https://example.com/ig-thumbnail.png',
    },
  });
  const { findByAltText } = render(<Event />, { wrapper });
  expect(await findByAltText('Thumbnail for "IG Thumb Event"')).toHaveAttribute(
    'src',
    'https://example.com/ig-thumbnail.png',
  );
});

it('generates the back href', async () => {
  const { findByText } = render(<Event />, { wrapper });
  expect((await findByText(/back/i)).closest('a')).toHaveAttribute(
    'href',
    expect.stringMatching(/events$/),
  );
});

it('falls back to the not found page for a missing event', async () => {
  mockGetEvent.mockResolvedValue(undefined);
  const { findByText } = render(<Event />, { wrapper });
  expect(await findByText(/sorry.+page/i)).toBeVisible();
});

it('silently refreshes the event to fetch the meeting link', async () => {
  // Set start date to be within 24 hours so that startRefreshing is true
  const startDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
  const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    id,
    meetingLink: undefined,
    startDate,
    endDate,
    title: 'Kool Event',
  });
  const { findByText, queryByText } = render(<Event />, { wrapper });
  expect(await findByText('Kool Event', { exact: false })).toBeVisible();

  // Verify initial call was made
  expect(mockGetEvent).toHaveBeenCalledWith(id, expect.anything());

  // The actual interval refresh behavior is tested in JoinEvent.test.tsx
  // Here we just verify the event renders correctly without showing loading
  expect(queryByText(/loading/i)).not.toBeInTheDocument();

  expect(mockGetEvent).toHaveBeenCalledWith(id, expect.anything());
});

it('renders calendar list for active groups', async () => {
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    interestGroup: { ...createInterestGroupResponse(), active: true },
    calendar: { ...createCalendarResponse(), name: 'Event Calendar' },
  });
  const { findByText } = render(<Event />, { wrapper });

  expect(await findByText('Event Calendar')).toBeVisible();
});

it('renders calendar list for events with missing group', async () => {
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    interestGroup: undefined,
    calendar: { ...createCalendarResponse(), name: 'Event Calendar' },
  });
  const { findByText } = render(<Event />, { wrapper });

  expect(await findByText('Event Calendar')).toBeVisible();
});
it('renders continue the event conversation when group with slack provided', async () => {
  mockGetEvent.mockResolvedValue({
    ...createEventResponse(),
    interestGroup: {
      ...createInterestGroupResponse(),
      tools: { slack: 'http://slack.com' },
    },
  });
  const { findByTitle } = render(<Event />, { wrapper });

  expect(await findByTitle(/slack/i)).toBeInTheDocument();
});

describe('the NEW_EVENT_PAGE flag', () => {
  it('shows the redesigned page with the event status banner when enabled', async () => {
    enable('NEW_EVENT_PAGE');
    mockGetEvent.mockResolvedValue({
      ...createEventResponse(),
      id,
      status: 'Cancelled',
    });
    const { findByText } = render(<Event />, { wrapper });
    expect(await findByText('The event has been cancelled.')).toBeVisible();
  });

  it('keeps the current page without the banner when disabled', async () => {
    disable('NEW_EVENT_PAGE');
    mockGetEvent.mockResolvedValue({
      ...createEventResponse(),
      id,
      status: 'Cancelled',
      title: 'My Event',
    });
    const { findByText, queryByText } = render(<Event />, { wrapper });
    expect(await findByText('My Event')).toBeVisible();
    expect(
      queryByText('The event has been cancelled.'),
    ).not.toBeInTheDocument();
  });

  describe('attendance', () => {
    const pastEndDate = subDays(new Date(), 3).toISOString();

    const createAttendance = (count: number): EventTeamAttendance[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `attendance-${i}`,
        team: { id: `team-${i}`, displayName: `Team ${i}` },
        attended: true,
      }));

    beforeEach(() => {
      enable('NEW_EVENT_PAGE');
    });

    it('shows the attendance card with team names linking to their teams', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [
          {
            id: 'attendance-1',
            team: {
              id: 't1',
              displayName: 'Team One',
              teamType: 'Discovery Team',
            },
            attended: true,
          },
          {
            id: 'attendance-2',
            team: {
              id: 't2',
              displayName: 'Team Two',
              teamType: 'Resource Team',
            },
            attended: false,
          },
          {
            id: 'attendance-3',
            team: { id: 't3', displayName: 'Team Three' },
            attended: false,
          },
        ],
      });
      const { findByText, getByTitle } = render(<Event />, { wrapper });
      const teamOne = await findByText('Team One');
      expect(teamOne).toBeVisible();
      expect(teamOne.closest('a')).toHaveAttribute('href', '/network/teams/t1');
      expect(await findByText('Team Two')).toBeVisible();
      expect(await findByText('Team Three')).toBeVisible();
      expect(getByTitle('Discovery Team Icon')).toBeInTheDocument();
      expect(getByTitle('Resource Team Icon')).toBeInTheDocument();
    });

    it('shows the view more attendees control beyond ten teams', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: createAttendance(11),
      });
      const { findByText } = render(<Event />, { wrapper });
      expect(await findByText('View More Attendees')).toBeVisible();
    });

    it('shows the empty state for a non project manager when no teams attended', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [],
      });
      const { findByText, queryByText } = render(<Event />, { wrapper });
      expect(await findByText('No attendance recorded yet')).toBeVisible();
      expect(queryByText('Add Attendance')).not.toBeInTheDocument();
    });

    it('shows the add attendance cta for a tech support user', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [],
      });
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByText } = render(<Event />, {
        wrapper: techSupportWrapper,
      });
      expect(await findByText('Add Attendance')).toBeVisible();
    });

    it('saves attendance changes for a tech support user', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [
          {
            id: 'attendance-1',
            team: { id: 't1', displayName: 'Team One' },
            attended: false,
          },
        ],
      });
      mockPatchEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
      });
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByRole, getByRole } = render(<Event />, {
        wrapper: techSupportWrapper,
      });

      await userEvent.click(
        await findByRole('button', { name: 'Edit attendance' }),
      );
      await userEvent.click(
        getByRole('checkbox', { name: 'Team One attendance' }),
      );
      await userEvent.click(getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(mockPatchEvent).toHaveBeenCalledWith(
          id,
          {
            attendance: [{ id: 'attendance-1', teamId: 't1', attended: true }],
          },
          expect.anything(),
        ),
      );
    });

    it('shows no matches when searching in the attendance modal', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [
          {
            id: 'attendance-1',
            team: { id: 't1', displayName: 'Team One' },
            attended: false,
          },
        ],
      });
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByRole, getByRole, findByText } = render(<Event />, {
        wrapper: techSupportWrapper,
      });

      await userEvent.click(
        await findByRole('button', { name: 'Edit attendance' }),
      );
      await userEvent.type(getByRole('combobox'), 'zzz');

      expect(await findByText('Sorry, no matches for zzz.')).toBeVisible();
    });

    describe('upload a list', () => {
      const eventWithOneTeam = () => ({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [
          {
            id: 'attendance-1',
            team: { id: 't1', displayName: 'Team One' },
            attended: false,
          },
        ],
      });

      const openUploadList = async () => {
        const rendered = render(<Event />, {
          wrapper: createWrapper({ techSupport: true }),
        });
        await userEvent.click(
          await rendered.findByRole('button', { name: 'Edit attendance' }),
        );
        await userEvent.click(
          rendered.getByRole('button', { name: /Upload a List/i }),
        );
        return rendered;
      };

      const uploadCsv = async (container: HTMLElement, contents: string) => {
        const fileInput = container.querySelector(
          'input[type="file"]',
        ) as HTMLInputElement;
        await userEvent.upload(
          fileInput,
          new File([contents], 'teams.csv', { type: 'text/csv' }),
        );
      };

      it('hides the upload entry point from a non tech support user', async () => {
        mockGetEvent.mockResolvedValue(eventWithOneTeam());

        const { findByText, queryByRole } = render(<Event />, {
          wrapper: createWrapper(),
        });

        expect(await findByText('Team One')).toBeVisible();
        expect(
          queryByRole('button', { name: /Upload a List/i }),
        ).not.toBeInTheDocument();
      });

      it('matches uploaded names and lists the ones the hub does not have', async () => {
        mockGetEvent.mockResolvedValue(eventWithOneTeam());
        mockGetTeamsForMatching.mockResolvedValue([
          { ...createTeamListItemResponse(), id: 't2', displayName: 'Alessi' },
        ]);

        const { container, findByRole, findByText } = await openUploadList();
        await uploadCsv(container, 'Team Name\nTeam Alessi\nNo Such Team\n');

        expect(await findByText('2 Teams')).toBeVisible();
        expect(
          await findByRole('button', {
            name: /will be added and marked if attended/,
          }),
        ).toBeVisible();
        expect(await findByText(/1 not matched/)).toBeVisible();
      });

      it('does not re-add a team already on the list but updates its status on save', async () => {
        mockGetEvent.mockResolvedValue(eventWithOneTeam());
        mockPatchEvent.mockResolvedValue({ ...createEventResponse(), id });
        mockGetTeamsForMatching.mockResolvedValue([
          {
            ...createTeamListItemResponse(),
            id: 't1',
            displayName: 'Team One',
          },
        ]);

        const { container, getByRole } = await openUploadList();
        await uploadCsv(container, 'Team Name,Attendance\nTeam One,Yes\n');

        // Enabled means the upload resolved the team; the wording it shows for
        // an already-added one belongs to the modal's own test.
        await waitFor(() =>
          expect(getByRole('button', { name: 'Add Attendees' })).toBeEnabled(),
        );

        await userEvent.click(getByRole('button', { name: 'Add Attendees' }));
        await userEvent.click(getByRole('button', { name: 'Save' }));

        await waitFor(() =>
          expect(mockPatchEvent).toHaveBeenCalledWith(
            id,
            {
              attendance: [
                { id: 'attendance-1', teamId: 't1', attended: true },
              ],
            },
            expect.anything(),
          ),
        );
      });

      it('saves a new uploaded team with its status and no attendance id', async () => {
        mockGetEvent.mockResolvedValue(eventWithOneTeam());
        mockPatchEvent.mockResolvedValue({ ...createEventResponse(), id });
        mockGetTeamsForMatching.mockResolvedValue([
          { ...createTeamListItemResponse(), id: 't2', displayName: 'Alessi' },
        ]);

        const { container, findByRole, getByRole } = await openUploadList();
        await uploadCsv(container, 'Team Name,Attendance\nAlessi,Yes\n');

        await userEvent.click(
          await findByRole('button', { name: 'Add Attendees' }),
        );
        await userEvent.click(getByRole('button', { name: 'Save' }));

        await waitFor(() =>
          expect(mockPatchEvent).toHaveBeenCalledWith(
            id,
            {
              attendance: [
                { id: 'attendance-1', teamId: 't1', attended: false },
                { id: undefined, teamId: 't2', attended: true },
              ],
            },
            expect.anything(),
          ),
        );
      });
    });

    it('closes the attendance modal without saving when dismissed', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [
          {
            id: 'attendance-1',
            team: { id: 't1', displayName: 'Team One' },
            attended: false,
          },
        ],
      });
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByRole, getByRole, queryByRole } = render(<Event />, {
        wrapper: techSupportWrapper,
      });

      await userEvent.click(
        await findByRole('button', { name: 'Edit attendance' }),
      );
      await userEvent.click(getByRole('button', { name: 'Cancel' }));

      expect(
        queryByRole('heading', { name: 'Edit Attendance' }),
      ).not.toBeInTheDocument();
      expect(mockPatchEvent).not.toHaveBeenCalled();
    });

    it('hides the add attendance cta for a user without tech support', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: [],
      });
      const nonTechSupportWrapper = createWrapper({ techSupport: false });
      const { findByText, queryByText } = render(<Event />, {
        wrapper: nonTechSupportWrapper,
      });
      expect(await findByText('No attendance recorded yet')).toBeVisible();
      expect(queryByText('Add Attendance')).not.toBeInTheDocument();
    });

    it('shows the since last event metric when previous attendance exists', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        attendance: createAttendance(3),
        previousEventAttendance: { teamsAttended: 1, teamsTotal: 4 },
      });
      const { findByText } = render(<Event />, { wrapper });
      expect(await findByText('Since last event')).toBeVisible();
    });

    it('does not show the attendance card for an upcoming event', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        attendance: [
          {
            id: 'attendance-1',
            team: { id: 't1', displayName: 'Team One' },
            attended: true,
          },
        ],
      });
      const { findAllByText, queryByText } = render(<Event />, { wrapper });
      await findAllByText('Speakers');
      expect(queryByText('Team One')).not.toBeInTheDocument();
    });
  });

  describe('speakers', () => {
    const pastEndDate = subDays(new Date(), 3).toISOString();

    const teamSpeaker = (
      teamId: string,
      teamName: string,
      userId: string,
      speakerId = `es-${teamId}-${userId}`,
    ): EventSpeaker => ({
      id: speakerId,
      team: { id: teamId, displayName: teamName },
      user: { id: userId, displayName: `User ${userId}` },
      role: 'Chair',
    });

    beforeEach(() => {
      enable('NEW_EVENT_PAGE');
    });

    it('shows preliminary findings and orders shared teams first on a past event', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        speakers: [
          teamSpeaker('t-alpha', 'Alpha', 'u1'),
          teamSpeaker('t-zeta', 'Zeta', 'u2'),
        ],
        preliminaryDataShared: [
          { team: { id: 't-alpha' }, shared: false },
          { team: { id: 't-zeta' }, shared: true },
        ],
      });
      const { findByText, getAllByRole } = render(<Event />, { wrapper });
      expect(await findByText('Preliminary Findings')).toBeVisible();

      const teamLinks = getAllByRole('link', { name: /^(Alpha|Zeta)$/ });
      expect(teamLinks.map((link) => link.textContent)).toEqual([
        'Zeta',
        'Alpha',
      ]);
    });

    it('does not show the preliminary findings column on an upcoming event', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        speakers: [teamSpeaker('t-alpha', 'Alpha', 'u1')],
      });
      const { findByText, queryByText } = render(<Event />, { wrapper });
      expect(await findByText('Alpha')).toBeVisible();
      expect(queryByText('Preliminary Findings')).not.toBeInTheDocument();
    });

    it('shows the view more speakers control beyond ten teams', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        speakers: Array.from({ length: 11 }, (_, i) =>
          teamSpeaker(`team-${i}`, `Team ${i}`, `user-${i}`),
        ),
      });
      const { findByText } = render(<Event />, { wrapper });
      expect(await findByText('View More Speakers')).toBeVisible();
    });

    it('shows the non project manager empty state when there are no speakers', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        speakers: [],
      });
      const { findByText, queryByText } = render(<Event />, { wrapper });
      expect(
        await findByText('No speakers have been added for this event yet.'),
      ).toBeVisible();
      expect(queryByText('Add Speakers')).not.toBeInTheDocument();
    });

    it('shows the editor empty state with an add speakers button for a tech support user', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        speakers: [],
      });
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByText, findByRole } = render(<Event />, {
        wrapper: techSupportWrapper,
      });
      expect(
        await findByText(/Marking who shared preliminary findings/),
      ).toBeVisible();
      expect(
        await findByRole('button', { name: /add speakers/i }),
      ).toBeVisible();
    });

    it('saves speaker changes for a tech support user', async () => {
      mockGetEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
        endDate: pastEndDate,
        speakers: [teamSpeaker('t1', 'Team One', 'u1', 'es-1')],
        preliminaryDataShared: [{ team: { id: 't1' }, shared: false }],
      });
      mockPatchEvent.mockResolvedValue({
        ...createEventResponse(),
        id,
      });
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByRole, getByRole } = render(<Event />, {
        wrapper: techSupportWrapper,
      });

      await userEvent.click(
        await findByRole('button', { name: 'Edit speakers' }),
      );
      await userEvent.click(
        getByRole('checkbox', {
          name: 'Team One preliminary findings shared',
        }),
      );
      await userEvent.click(getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(mockPatchEvent).toHaveBeenCalledWith(
          id,
          {
            speakersToRemove: [],
            preliminaryDataShared: [{ teamId: 't1', shared: true }],
          },
          expect.anything(),
        ),
      );
    });
  });

  describe('speakers export', () => {
    beforeEach(() => {
      enable('NEW_EVENT_PAGE');
      mockDownloadEventSpeakers.mockClear();
    });

    it('lets a tech support member download the speakers', async () => {
      const techSupportWrapper = createWrapper({ techSupport: true });
      const { findByLabelText } = render(<Event />, {
        wrapper: techSupportWrapper,
      });

      const downloadButton = await findByLabelText('Download speakers');
      await userEvent.click(downloadButton);

      expect(mockDownloadEventSpeakers).toHaveBeenCalledTimes(1);
      expect(mockDownloadEventSpeakers).toHaveBeenCalledWith(
        expect.objectContaining({ id }),
        expect.any(Array),
      );
    });

    it('hides the download from a member who is not tech support', async () => {
      const nonTechSupportWrapper = createWrapper({ techSupport: false });
      const { findAllByText, queryByLabelText } = render(<Event />, {
        wrapper: nonTechSupportWrapper,
      });

      await findAllByText('Event 0', { exact: false });

      expect(queryByLabelText('Download speakers')).not.toBeInTheDocument();
    });

    it('hides the download when the token carries no techSupport value', async () => {
      // test-utils defaults techSupport to false, so the shared wrapper would
      // make this a duplicate of the test above rather than a claim-less token.
      const noClaimWrapper = createWrapper({ techSupport: undefined });
      const { findAllByText, queryByLabelText } = render(<Event />, {
        wrapper: noClaimWrapper,
      });

      await findAllByText('Event 0', { exact: false });

      expect(queryByLabelText('Download speakers')).not.toBeInTheDocument();
    });
  });
});
