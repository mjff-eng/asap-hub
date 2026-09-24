import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaticRouter } from 'react-router';

import { colour } from '../../colors';
import { rem } from '../../pixels';
import EventAttendance, {
  compareAttendanceTeams,
  EventAttendanceTeam,
} from '../EventAttendance';

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

const teams: EventAttendanceTeam[] = [
  {
    teamId: 't1',
    teamName: 'Team Alpha',
    attended: true,
    teamType: 'Discovery Team',
    isFromInterestGroup: true,
  },
  {
    teamId: 't2',
    teamName: 'Team Beta',
    attended: false,
    isTeamInactive: true,
    teamType: 'Resource Team',
    isFromInterestGroup: true,
  },
  { teamId: 't3', teamName: 'Team Gamma', attended: true },
];

const props = {
  teams,
  interestGroupName: 'Alpha Synuclein',
};

const renderCard = (
  overrides: Partial<typeof props> & Record<string, unknown> = {},
) =>
  render(
    <StaticRouter location="/">
      <EventAttendance {...props} {...overrides} />
    </StaticRouter>,
  );

describe('compareAttendanceTeams', () => {
  it('breaks ties on equal names with a stable teamId order', () => {
    const a: EventAttendanceTeam = {
      teamId: 't-a',
      teamName: 'Same Name',
      attended: true,
    };
    const b: EventAttendanceTeam = {
      teamId: 't-b',
      teamName: 'Same Name',
      attended: true,
    };
    expect(compareAttendanceTeams(a, b)).toBeLessThan(0);
    expect(compareAttendanceTeams(b, a)).toBeGreaterThan(0);
  });

  it('orders numeric-suffixed names naturally (Team 2 before Team 10)', () => {
    const two: EventAttendanceTeam = {
      teamId: 't-2',
      teamName: 'Team 2',
      attended: true,
    };
    const ten: EventAttendanceTeam = {
      teamId: 't-10',
      teamName: 'Team 10',
      attended: true,
    };
    expect(compareAttendanceTeams(two, ten)).toBeLessThan(0);
    expect(compareAttendanceTeams(ten, two)).toBeGreaterThan(0);
  });
});

describe('EventAttendance', () => {
  it('renders the title and the single metric tile', () => {
    const { getByRole, getByText, getAllByRole } = renderCard();
    expect(
      getByRole('heading', { level: 3, name: 'Attendance' }),
    ).toBeVisible();
    expect(getByText('50%')).toBeVisible();
    expect(getByText('1 of 2 teams')).toBeVisible();
    expect(getByText('from the interest group')).toBeVisible();
    expect(getAllByRole('progressbar')).toHaveLength(1);
  });

  it('scopes the metric tile to the interest-group rows', () => {
    const { getByText, queryByText } = renderCard({
      teams: [
        ...teams,
        { teamId: 't4', teamName: 'Team Delta', attended: true },
        { teamId: 't5', teamName: 'Team Epsilon', attended: true },
      ],
    });
    expect(getByText('50%')).toBeVisible();
    expect(queryByText('60%')).not.toBeInTheDocument();
  });

  it('hides the metric tile and every section heading with no interest-group rows', () => {
    const { queryByRole, queryByText, getByText } = renderCard({
      teams: [{ teamId: 't3', teamName: 'Team Gamma', attended: true }],
      interestGroupName: undefined,
    });
    expect(queryByRole('progressbar')).not.toBeInTheDocument();
    expect(queryByText(/^From /)).not.toBeInTheDocument();
    // With a single section there is nothing to tell apart: the count stands
    // on its own, with no heading and no helper line.
    expect(getByText('1 of 1 attended')).toBeVisible();
    expect(queryByText('Additional teams')).not.toBeInTheDocument();
    expect(
      queryByText('Teams from outside the interest group.'),
    ).not.toBeInTheDocument();
  });

  it('names the interest-group section after the group', () => {
    const { getByText } = renderCard();
    expect(getByText('From Alpha Synuclein')).toBeVisible();
    expect(getByText('1 of 2 attended')).toBeVisible();
  });

  it('scopes a section header to the rows it heads', () => {
    const { getByText } = renderCard();
    expect(getByText('From Alpha Synuclein').closest('th')).toHaveAttribute(
      'scope',
      'rowgroup',
    );
  });

  it('falls back to a generic interest-group section title without a name', () => {
    const { getByText } = renderCard({ interestGroupName: undefined });
    expect(getByText('From interest group')).toBeVisible();
  });

  it('labels the additional teams section and explains it', () => {
    const { getByText } = renderCard();
    expect(getByText('Additional teams')).toBeVisible();
    expect(getByText('1 of 1 attended')).toBeVisible();
    expect(getByText('Teams from outside the interest group.')).toBeVisible();
  });

  it('omits the additional teams section when every row came from the group', () => {
    const { queryByText } = renderCard({
      teams: teams.filter(({ isFromInterestGroup }) => isFromInterestGroup),
    });
    expect(queryByText('Additional teams')).not.toBeInTheDocument();
  });

  it('renders the read-only empty state when there are no teams', () => {
    const { getByText, queryByRole } = renderCard({ teams: [] });
    expect(getByText('No attendance recorded yet')).toBeVisible();
    expect(queryByRole('table')).not.toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps the edit control on the empty card for editors', async () => {
    const onEdit = jest.fn();
    const { getByLabelText } = renderCard({ teams: [], onEdit });

    await userEvent.click(getByLabelText('Edit attendance'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders the team-type icon for each team', () => {
    const { getByTitle } = renderCard();
    expect(getByTitle('Discovery Team Icon')).toBeInTheDocument();
    expect(getByTitle('Resource Team Icon')).toBeInTheDocument();
    expect(getByTitle('Team')).toBeInTheDocument();
  });

  it('links each team and shows attended / did-not-attend status', () => {
    const { getByText, getAllByLabelText, getByLabelText } = renderCard();
    expect(getByText('Team Alpha').closest('a')).toHaveAttribute(
      'href',
      '/network/teams/t1',
    );
    expect(getAllByLabelText('Attended')).toHaveLength(2);
    expect(getByLabelText('Did not attend')).toBeInTheDocument();
  });

  it('calls onExport and onEdit when the header buttons are clicked', async () => {
    const onExport = jest.fn();
    const onEdit = jest.fn();
    const { getByLabelText } = renderCard({ onExport, onEdit });

    await userEvent.click(getByLabelText('Download attendance'));
    expect(onExport).toHaveBeenCalledTimes(1);

    await userEvent.click(getByLabelText('Edit attendance'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('shows each header button independently of the other', () => {
    const { queryByLabelText, rerender } = renderCard({ onExport: jest.fn() });

    expect(queryByLabelText('Download attendance')).toBeVisible();
    expect(queryByLabelText('Edit attendance')).not.toBeInTheDocument();

    rerender(
      <StaticRouter location="/">
        <EventAttendance {...props} onEdit={jest.fn()} />
      </StaticRouter>,
    );

    expect(queryByLabelText('Download attendance')).not.toBeInTheDocument();
    expect(queryByLabelText('Edit attendance')).toBeVisible();
  });

  it('does not show a show-more control for 5 or fewer teams in a section', () => {
    const { queryByText } = renderCard();
    expect(queryByText(/Show \d+ more/)).not.toBeInTheDocument();
  });

  const manySectionTeams = (
    prefix: string,
    count: number,
    isFromInterestGroup: boolean,
  ): EventAttendanceTeam[] =>
    Array.from({ length: count }, (_, index) => ({
      teamId: `${prefix}${index + 1}`,
      teamName: `${prefix} ${index + 1}`,
      attended: true,
      isFromInterestGroup,
    }));

  const sectionedTeams = [
    ...manySectionTeams('Group', 7, true),
    ...manySectionTeams('Extra', 6, false),
  ];

  it('collapses each section to 5 rows and expands them independently', async () => {
    const { getByText, queryByText } = renderCard({ teams: sectionedTeams });

    expect(getByText('Group 5')).toBeInTheDocument();
    expect(queryByText('Group 6')).not.toBeInTheDocument();
    expect(getByText('Extra 5')).toBeInTheDocument();
    expect(queryByText('Extra 6')).not.toBeInTheDocument();

    await userEvent.click(getByText('Show 2 more'));

    expect(getByText('Group 6')).toBeInTheDocument();
    expect(getByText('Group 7')).toBeInTheDocument();
    expect(queryByText('Extra 6')).not.toBeInTheDocument();

    await userEvent.click(getByText('Show 1 more'));
    expect(getByText('Extra 6')).toBeInTheDocument();
  });

  it('collapses a section again on show less', async () => {
    const { getByText, queryByText } = renderCard({ teams: sectionedTeams });

    await userEvent.click(getByText('Show 2 more'));
    await userEvent.click(getByText('Show less'));

    expect(queryByText('Group 6')).not.toBeInTheDocument();
    expect(getByText('Show 2 more')).toBeInTheDocument();
  });

  it('divides a row from whatever follows it, and nothing else', () => {
    const divider = `1px solid ${colour.border.tertiary}`;
    const { getByText, rerender } = renderCard();

    expect(getByText('Team Alpha').closest('tr')).toHaveStyleRule(
      'border-bottom',
      divider,
    );
    expect(getByText('Team Beta').closest('tr')).not.toHaveStyleRule(
      'border-bottom',
      divider,
    );

    rerender(
      <StaticRouter location="/">
        <EventAttendance {...props} teams={sectionedTeams} />
      </StaticRouter>,
    );
    expect(getByText('Group 5').closest('tr')).toHaveStyleRule(
      'border-bottom',
      divider,
    );
  });

  it('adds a scroll gutter when the team table overflows horizontally', () => {
    mockTableOverflow(400, 100);
    const { getByRole } = renderCard();
    const wrapper = getByRole('table').parentElement as HTMLElement;
    expect(wrapper).toHaveStyleRule('padding-bottom', rem(8));
  });
});
