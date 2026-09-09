import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaticRouter } from 'react-router';

import EventSpeakers from '../EventSpeakers';
import { SpeakerGroup, SpeakerGroupUser } from '../speaker-group';

// jsdom has no ResizeObserver and does no layout.
globalThis.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as unknown as typeof ResizeObserver;

const mockTableOverflow = (scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(Element.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
};

afterEach(() => mockTableOverflow(0, 0));

const makeUsers = (teamIndex: number, count: number): SpeakerGroupUser[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `user-${teamIndex}-${index}`,
    displayName: `John Doe ${teamIndex}-${index}`,
    roles: ['Data Manager'],
    isAlumni: index === 0,
  }));

const teamGroups: SpeakerGroup[] = [
  {
    id: 'team-0',
    variant: 'team',
    teamName: 'Team Alpha',
    teamType: 'Discovery Team',
    preliminaryFindingsShared: true,
    isTeamInactive: true,
    users: makeUsers(0, 2),
  },
  {
    id: 'team-1',
    variant: 'team',
    teamName: 'Team Beta',
    teamType: 'Resource Team',
    preliminaryFindingsShared: false,
    users: makeUsers(1, 1),
  },
];

const externalGroup: SpeakerGroup = {
  id: 'external',
  variant: 'external',
  preliminaryFindingsShared: false,
  users: [{ id: 'ext-1', displayName: 'External user 1' }],
};

const groups: SpeakerGroup[] = [...teamGroups, externalGroup];

const renderCard = (
  props: Partial<React.ComponentProps<typeof EventSpeakers>> = {},
) =>
  render(
    <StaticRouter location="/">
      <EventSpeakers groups={groups} hasFinished {...props} />
    </StaticRouter>,
  );

describe('EventSpeakers', () => {
  describe('empty state', () => {
    it('Should show the read-only message for a non-editor', () => {
      const { getByText } = renderCard({ groups: [] });
      expect(
        getByText('No speakers have been added for this event yet.'),
      ).toBeVisible();
    });

    it('Should default to the empty state when groups are omitted', () => {
      const { getByText } = render(
        <StaticRouter location="/">
          <EventSpeakers />
        </StaticRouter>,
      );
      expect(
        getByText('No speakers have been added for this event yet.'),
      ).toBeVisible();
    });

    it('Should prompt an editor to add speakers for an upcoming event', () => {
      const { getByText, getByRole } = renderCard({
        groups: [],
        hasFinished: false,
        onAddSpeaker: jest.fn(),
      });
      expect(
        getByText(/Marking who shared preliminary findings becomes available/i),
      ).toBeVisible();
      expect(getByRole('button', { name: /add speakers/i })).toBeVisible();
    });

    it('Should prompt an editor to add presenters for a past event', () => {
      const { getByText } = renderCard({
        groups: [],
        hasFinished: true,
        onAddSpeaker: jest.fn(),
      });
      expect(
        getByText(/Add the people who presented at this event/i),
      ).toBeVisible();
    });

    it('Should fire onAddSpeaker from the empty-state button', async () => {
      const onAddSpeaker = jest.fn();
      const { getByRole } = renderCard({
        groups: [],
        onAddSpeaker,
      });
      await userEvent.click(getByRole('button', { name: /add speakers/i }));
      expect(onAddSpeaker).toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('Should derive the speaker and preliminary-findings metrics', () => {
      const { getByText } = renderCard();
      // 2 + 1 team members + 1 external = 4 total, 3 from teams, 1 non-CRN
      expect(getByText('4')).toBeVisible();
      expect(getByText('3 from teams • 1 non-CRN')).toBeVisible();
      // 1 of 2 teams shared findings = 50%
      expect(getByText('50%')).toBeVisible();
      expect(getByText('1 of 2 teams')).toBeVisible();
    });

    it('Should give the findings progress indicators an accessible name', () => {
      const { container } = renderCard();
      const progressbars = container.querySelectorAll('[role="progressbar"]');
      expect(progressbars.length).toBeGreaterThan(0);
      progressbars.forEach((bar) =>
        expect(bar).toHaveAttribute('aria-label', 'Preliminary findings'),
      );
    });
  });

  describe('findings column label', () => {
    it('Should render the compact "P. Findings" label when the table fits', () => {
      const { getByText } = renderCard();
      expect(getByText('P. Findings')).toBeInTheDocument();
    });

    it('Should drop the compact label and only show "Preliminary Findings" when the table overflows', () => {
      mockTableOverflow(400, 100);
      const { getByText, queryByText } = renderCard();
      expect(getByText('Preliminary Findings')).toBeInTheDocument();
      expect(queryByText('P. Findings')).not.toBeInTheDocument();
    });
  });

  describe('upcoming event', () => {
    it('Should hide preliminary findings before the event has taken place', () => {
      const { getByText, queryByText, queryByLabelText } = renderCard({
        hasFinished: false,
      });
      // Speaker count stays; the findings metric, header and ticks disappear.
      expect(getByText('4')).toBeVisible();
      expect(queryByText('Preliminary findings')).not.toBeInTheDocument();
      expect(queryByText('50%')).not.toBeInTheDocument();
      expect(
        queryByLabelText('Shared preliminary findings'),
      ).not.toBeInTheDocument();
      expect(
        queryByLabelText('No preliminary findings'),
      ).not.toBeInTheDocument();
    });

    it('Should still expand a team to reveal members when findings are hidden', async () => {
      const { getByRole, getByText } = renderCard({ hasFinished: false });
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      expect(getByText('John Doe 0-0')).toBeVisible();
    });

    it('Should default to hiding findings when hasFinished is not provided', () => {
      const { queryByText } = render(
        <StaticRouter location="/">
          <EventSpeakers groups={groups} />
        </StaticRouter>,
      );
      expect(queryByText('Preliminary findings')).not.toBeInTheDocument();
    });
  });

  describe('team rows', () => {
    it('Should render team links, counts, inactive badge and findings status', () => {
      const { getByRole, getByText, getByLabelText, getAllByLabelText } =
        renderCard();
      expect(getByRole('link', { name: 'Team Alpha' })).toHaveAttribute(
        'href',
        expect.stringContaining('team-0'),
      );
      expect(getByText('(2)')).toBeVisible();
      expect(getByText('Inactive Team')).toBeInTheDocument();
      expect(getByLabelText('Shared preliminary findings')).toBeInTheDocument();
      expect(getAllByLabelText('No preliminary findings')).toHaveLength(1);
    });

    it('Should expand a team to reveal its members with roles', async () => {
      const { getByRole, queryByRole, getAllByText } = renderCard();
      expect(
        queryByRole('link', { name: 'John Doe 0-0' }),
      ).not.toBeInTheDocument();
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      expect(getByRole('link', { name: 'John Doe 0-0' })).toHaveAttribute(
        'href',
        expect.stringContaining('user-0-0'),
      );
      expect(getAllByText('Data Manager')[0]).toBeVisible();
    });

    it('Should collapse an expanded team', async () => {
      const { getByRole, queryByRole } = renderCard();
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      expect(getByRole('link', { name: 'John Doe 0-0' })).toBeInTheDocument();
      await userEvent.click(
        getByRole('button', { name: 'Collapse Team Alpha' }),
      );
      expect(
        queryByRole('link', { name: 'John Doe 0-0' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('teams without speakers', () => {
    it('Should hide teams that have no speakers and exclude them from the findings count', () => {
      const { queryByRole, getByText } = renderCard({
        groups: [
          ...teamGroups,
          {
            id: 'team-empty',
            variant: 'team',
            teamName: 'Empty Team',
            preliminaryFindingsShared: true,
            users: [],
          },
        ],
      });
      expect(
        queryByRole('link', { name: 'Empty Team' }),
      ).not.toBeInTheDocument();
      // Only Team Alpha + Team Beta count; Team Alpha shared → 1 of 2.
      expect(getByText('1 of 2 teams')).toBeVisible();
    });
  });

  describe('external-only event', () => {
    it('Should render with zero-team findings when there are only external users', () => {
      const { getByText } = renderCard({ groups: [externalGroup] });
      expect(getByText('0%')).toBeVisible();
      expect(getByText('0 of 0 teams')).toBeVisible();
      expect(getByText('External Users')).toBeVisible();
    });
  });

  describe('external users row', () => {
    it('Should render and expand the external users row', async () => {
      const { getByRole, getByText, getByTitle, queryByText } = renderCard();
      expect(getByText('External Users')).toBeVisible();
      expect(queryByText('External user 1')).not.toBeInTheDocument();
      await userEvent.click(
        getByRole('button', { name: 'Expand External Users' }),
      );
      expect(getByText('External user 1')).toBeVisible();
      expect(getByText('Non CRN')).toBeVisible();
      expect(getByTitle('User Placeholder')).toBeInTheDocument();
    });
  });

  describe('admin actions', () => {
    it('Should render and fire the edit and export buttons when provided', async () => {
      const onEdit = jest.fn();
      const onExport = jest.fn();
      const { getByRole } = renderCard({ onEdit, onExport });
      await userEvent.click(getByRole('button', { name: 'Edit speakers' }));
      await userEvent.click(getByRole('button', { name: 'Download speakers' }));
      expect(onEdit).toHaveBeenCalled();
      expect(onExport).toHaveBeenCalled();
    });

    it('Should not render admin buttons for a read-only viewer', () => {
      const { queryByRole } = renderCard();
      expect(
        queryByRole('button', { name: 'Edit speakers' }),
      ).not.toBeInTheDocument();
      expect(
        queryByRole('button', { name: 'Download speakers' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('overflow', () => {
    const manyTeamGroups: SpeakerGroup[] = Array.from(
      { length: 14 },
      (_, index) => ({
        id: `team-${index}`,
        variant: 'team',
        teamName: `Team ${index + 1}`,
        preliminaryFindingsShared: true,
        users: makeUsers(index, 1),
      }),
    );

    it('Should not render the footer with 10 or fewer rows', () => {
      const { queryByRole } = renderCard({
        groups: manyTeamGroups.slice(0, 10),
      });
      expect(
        queryByRole('button', { name: /view more speakers/i }),
      ).not.toBeInTheDocument();
    });

    it('Should reveal the remaining rows on View More', async () => {
      const { getByRole, queryByRole } = renderCard({
        groups: manyTeamGroups,
      });
      expect(
        queryByRole('button', { name: 'Expand Team 14' }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        getByRole('button', { name: /view more speakers/i }),
      );
      expect(
        getByRole('button', { name: 'Expand Team 14' }),
      ).toBeInTheDocument();
      expect(
        queryByRole('button', { name: /view more speakers/i }),
      ).not.toBeInTheDocument();
    });

    it('Should collapse the extra rows again on View Less', async () => {
      const { getByRole, queryByRole } = renderCard({
        groups: manyTeamGroups,
      });
      await userEvent.click(
        getByRole('button', { name: /view more speakers/i }),
      );
      await userEvent.click(
        getByRole('button', { name: /view less speakers/i }),
      );
      expect(
        queryByRole('button', { name: 'Expand Team 14' }),
      ).not.toBeInTheDocument();
      expect(
        getByRole('button', { name: /view more speakers/i }),
      ).toBeInTheDocument();
    });

    it('Should still expand the last visible team above the footer', async () => {
      const { getByRole, getByText } = renderCard({
        groups: manyTeamGroups,
      });
      // Team 10 is the last visible row while the footer is shown.
      await userEvent.click(getByRole('button', { name: 'Expand Team 10' }));
      expect(getByText('John Doe 9-0')).toBeVisible();
    });
  });
});
