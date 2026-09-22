import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaticRouter } from 'react-router';

import EventSpeakers from '../EventSpeakers';
import {
  SpeakerExternalGroup,
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from '../speaker-group';

const makeUsers = (
  prefix: string,
  count: number,
  sharedCount = 0,
): SpeakerGroupUser[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-user-${index}`,
    displayName: `${prefix} user ${index}`,
    roles: ['Data Manager'],
    preliminaryFindingsShared: index < sharedCount,
  }));

const makeExternalUsers = (
  count: number,
  sharedCount = 0,
): SpeakerGroupExternalUser[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `external-user-${index}`,
    displayName: `External user ${index}`,
    preliminaryFindingsShared: index < sharedCount,
  }));

const teamGroup = (
  overrides: Partial<SpeakerTeamGroup> = {},
): SpeakerTeamGroup => ({
  id: 'team-0',
  variant: 'team',
  teamName: 'Team Alpha',
  teamType: 'Discovery Team',
  users: makeUsers('team-0', 2, 1),
  ...overrides,
});

const projectGroup = (
  overrides: Partial<SpeakerProjectGroup> = {},
): SpeakerProjectGroup => ({
  id: 'project-0',
  variant: 'project',
  projectName: 'Project Gamma',
  projectType: 'Discovery Project',
  users: makeUsers('project-0', 2, 2),
  ...overrides,
});

const externalGroup = (
  overrides: Partial<SpeakerExternalGroup> = {},
): SpeakerExternalGroup => ({
  id: 'external',
  variant: 'external',
  users: makeExternalUsers(1),
  ...overrides,
});

const renderCard = (
  props: Partial<React.ComponentProps<typeof EventSpeakers>> = {},
) =>
  render(
    <StaticRouter location="/">
      <EventSpeakers
        groups={[teamGroup(), projectGroup(), externalGroup()]}
        hasFinished
        {...props}
      />
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
        onAddSpeaker: jest.fn(),
      });
      expect(
        getByText(/Add the people who presented at this event/i),
      ).toBeVisible();
    });

    it('Should fire onAddSpeaker from the empty-state button', async () => {
      const onAddSpeaker = jest.fn();
      const { getByRole } = renderCard({ groups: [], onAddSpeaker });
      await userEvent.click(getByRole('button', { name: /add speakers/i }));
      expect(onAddSpeaker).toHaveBeenCalled();
    });
  });

  describe('sections', () => {
    it('Should render the three headings in order', () => {
      const { getAllByRole } = renderCard();
      expect(
        getAllByRole('heading', { level: 4 }).map(
          (heading) => heading.textContent,
        ),
      ).toEqual(['From Team Projects', 'From Individual Projects', 'External']);
    });

    it('Should omit the individual projects heading without project speakers', () => {
      const { queryByRole } = renderCard({
        groups: [teamGroup(), externalGroup()],
      });
      expect(
        queryByRole('heading', { name: 'From Individual Projects' }),
      ).not.toBeInTheDocument();
    });

    it('Should omit a section whose only group has no speakers', () => {
      const { queryByRole } = renderCard({
        groups: [teamGroup(), projectGroup({ users: [] })],
      });
      expect(
        queryByRole('heading', { name: 'From Individual Projects' }),
      ).not.toBeInTheDocument();
    });

    it('Should link a team and a project row', () => {
      const { getByRole } = renderCard();
      expect(getByRole('link', { name: 'Team Alpha' })).toHaveAttribute(
        'href',
        expect.stringContaining('team-0'),
      );
      expect(getByRole('link', { name: 'Project Gamma' })).toHaveAttribute(
        'href',
        expect.stringContaining('project-0'),
      );
    });

    it('Should render the inactive badge for an inactive team', () => {
      const { getByText } = renderCard({
        groups: [teamGroup({ isTeamInactive: true })],
      });
      expect(getByText('Inactive Team')).toBeInTheDocument();
    });
  });

  describe('metrics', () => {
    const mixedGroups: SpeakerGroup[] = [
      teamGroup({ users: makeUsers('team-0', 4, 1) }),
      projectGroup({ users: makeUsers('project-0', 2, 2) }),
      externalGroup({ users: makeExternalUsers(2) }),
    ];

    it('Should break the speaker total down by section', () => {
      const { getByText, getAllByText } = renderCard({ groups: mixedGroups });
      expect(getByText('8')).toBeVisible();
      expect(getByText('total speakers')).toBeVisible();
      // "From Individual Projects" and "External" also name their sections, so
      // the tile's copy is one of two.
      expect(getByText('From Teams')).toBeVisible();
      expect(getAllByText('From Individual Projects').length).toBe(2);
      expect(getAllByText('External').length).toBe(2);
      expect(getByText('4')).toBeVisible();
      expect(getAllByText('2').length).toBeGreaterThan(0);
    });

    it('Should count shared speakers, not groups, across all sections', () => {
      const { getByText } = renderCard({ groups: mixedGroups });
      // 1 team + 2 project + 0 external shared of 8 speakers.
      expect(getByText('38%')).toBeVisible();
      // The count and the sentence are separate nodes so only the count is bold.
      expect(getByText(/3 of 8 speakers/)).toBeVisible();
      expect(getByText('shared preliminary findings')).toBeVisible();
    });

    it('Should report zero percent when nobody shared', () => {
      const { getByText } = renderCard({
        groups: [teamGroup({ users: makeUsers('team-0', 2) })],
      });
      expect(getByText('0%')).toBeVisible();
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

  describe('upcoming event', () => {
    it('Should render the total tile and hide every findings affordance', () => {
      const { getByText, queryByText, queryByLabelText } = renderCard({
        hasFinished: false,
      });
      expect(getByText('5')).toBeVisible();
      expect(queryByText('Preliminary findings')).not.toBeInTheDocument();
      expect(queryByText('Preliminary Findings')).not.toBeInTheDocument();
      expect(queryByText(/shared$/)).not.toBeInTheDocument();
      expect(
        queryByLabelText('Shared preliminary findings'),
      ).not.toBeInTheDocument();
      expect(
        queryByLabelText('No preliminary findings'),
      ).not.toBeInTheDocument();
    });

    it('Should expand the first group of the first non-empty section', () => {
      const { getByText, queryByText } = renderCard({ hasFinished: false });
      expect(getByText('team-0 user 0')).toBeVisible();
      expect(queryByText('project-0 user 0')).not.toBeInTheDocument();
    });

    it('Should fall back to the first project group when no team speaks', () => {
      const { getByText } = renderCard({
        hasFinished: false,
        groups: [projectGroup(), externalGroup()],
      });
      expect(getByText('project-0 user 0')).toBeVisible();
    });

    it('Should default to hiding findings when hasFinished is not provided', () => {
      const { queryByText } = render(
        <StaticRouter location="/">
          <EventSpeakers groups={[teamGroup()]} />
        </StaticRouter>,
      );
      expect(queryByText('Preliminary findings')).not.toBeInTheDocument();
    });
  });

  describe('past event', () => {
    it('Should render the findings column header', () => {
      const { getAllByText } = renderCard();
      expect(
        getAllByText(/Preliminary Findings|P\. Findings/),
      ).not.toHaveLength(0);
    });

    it('Should start every group collapsed', () => {
      const { queryByText } = renderCard();
      expect(queryByText('team-0 user 0')).not.toBeInTheDocument();
      expect(queryByText('project-0 user 0')).not.toBeInTheDocument();
    });

    it('Should render a green pill for a group with a shared speaker', () => {
      const { getByText, getByLabelText } = renderCard({
        groups: [teamGroup({ users: makeUsers('team-0', 4, 1) })],
      });
      expect(getByText('1 of 4 shared')).toBeVisible();
      expect(getByLabelText('Shared preliminary findings')).toBeInTheDocument();
    });

    it('Should render a grey pill with the cross icon when nobody shared', () => {
      const { getByText, getByLabelText } = renderCard({
        groups: [teamGroup({ users: makeUsers('team-0', 4) })],
      });
      expect(getByText('0 of 4 shared')).toBeVisible();
      expect(getByLabelText('No preliminary findings')).toBeInTheDocument();
    });

    it('Should render a standalone icon per external speaker instead of a pill', () => {
      const { getAllByLabelText, queryByText } = renderCard({
        groups: [externalGroup({ users: makeExternalUsers(2, 1) })],
      });
      expect(getAllByLabelText('Shared preliminary findings')).toHaveLength(1);
      expect(getAllByLabelText('No preliminary findings')).toHaveLength(1);
      expect(queryByText(/ shared$/)).not.toBeInTheDocument();
    });

    it('Should show a findings icon against each speaker of an expanded group', async () => {
      const { getByRole, getAllByLabelText } = renderCard({
        groups: [teamGroup({ users: makeUsers('team-0', 2, 1) })],
      });
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      // one per speaker, plus the group pill icon.
      expect(getAllByLabelText('Shared preliminary findings')).toHaveLength(2);
      expect(getAllByLabelText('No preliminary findings')).toHaveLength(1);
    });
  });

  describe('speaker cap', () => {
    const bigTeam = teamGroup({ users: makeUsers('team-0', 8, 1) });

    it('Should cap an expanded group at five speakers', async () => {
      const { getByRole, getByText, queryByText } = renderCard({
        groups: [bigTeam],
      });
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      expect(getByText('team-0 user 4')).toBeVisible();
      expect(queryByText('team-0 user 5')).not.toBeInTheDocument();
      expect(
        getByRole('button', { name: 'Show 3 more speakers in Team Alpha' }),
      ).toBeVisible();
    });

    it('Should reveal the remaining speakers', async () => {
      const { getByRole, getByText, queryByRole } = renderCard({
        groups: [bigTeam],
      });
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      await userEvent.click(
        getByRole('button', { name: 'Show 3 more speakers in Team Alpha' }),
      );
      expect(getByText('team-0 user 7')).toBeVisible();
      expect(
        queryByRole('button', { name: /more speakers in Team Alpha/ }),
      ).not.toBeInTheDocument();
    });

    it('Should reset the speaker cap when the group is collapsed', async () => {
      const { getByRole, queryByText } = renderCard({ groups: [bigTeam] });
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      await userEvent.click(
        getByRole('button', { name: 'Show 3 more speakers in Team Alpha' }),
      );
      await userEvent.click(
        getByRole('button', { name: 'Collapse Team Alpha' }),
      );
      await userEvent.click(getByRole('button', { name: 'Expand Team Alpha' }));
      expect(queryByText('team-0 user 5')).not.toBeInTheDocument();
      expect(
        getByRole('button', { name: 'Show 3 more speakers in Team Alpha' }),
      ).toBeVisible();
    });
  });

  describe('row cap', () => {
    const sevenTeams: SpeakerGroup[] = Array.from({ length: 7 }, (_, index) =>
      teamGroup({
        id: `team-${index}`,
        teamName: `Team ${index}`,
        users: makeUsers(`team-${index}`, 1),
      }),
    );

    it('Should cap a section at five rows', () => {
      const { getByRole, queryByRole } = renderCard({ groups: sevenTeams });
      expect(getByRole('link', { name: 'Team 4' })).toBeVisible();
      expect(queryByRole('link', { name: 'Team 5' })).not.toBeInTheDocument();
      expect(
        getByRole('button', { name: 'Show 2 more teams' }),
      ).toBeInTheDocument();
    });

    it('Should reveal the remaining rows of a section', async () => {
      const { getByRole, queryByRole } = renderCard({ groups: sevenTeams });
      await userEvent.click(getByRole('button', { name: 'Show 2 more teams' }));
      expect(getByRole('link', { name: 'Team 6' })).toBeVisible();
      expect(
        queryByRole('button', { name: 'Show 2 more teams' }),
      ).not.toBeInTheDocument();
    });

    it('Should collapse a revealed section again from Show less', async () => {
      const { getByRole, queryByRole } = renderCard({ groups: sevenTeams });
      await userEvent.click(getByRole('button', { name: 'Show 2 more teams' }));
      await userEvent.click(getByRole('button', { name: 'Show less' }));
      expect(queryByRole('link', { name: 'Team 6' })).not.toBeInTheDocument();
      expect(
        getByRole('button', { name: 'Show 2 more teams' }),
      ).toBeInTheDocument();
    });

    it('Should cap the external section at five speakers', async () => {
      const { getByText, getByRole, queryByText } = renderCard({
        groups: [externalGroup({ users: makeExternalUsers(7) })],
      });
      expect(queryByText('External user 5')).not.toBeInTheDocument();
      await userEvent.click(
        getByRole('button', { name: 'Show 2 more speakers' }),
      );
      expect(getByText('External user 6')).toBeVisible();
    });

    it('Should label the project section control with the project noun', () => {
      const { getByRole } = renderCard({
        groups: Array.from({ length: 6 }, (_, index) =>
          projectGroup({
            id: `project-${index}`,
            projectName: `Project ${index}`,
            users: makeUsers(`project-${index}`, 1),
          }),
        ),
      });
      expect(
        getByRole('button', { name: 'Show 1 more project' }),
      ).toBeInTheDocument();
    });
  });

  describe('read-only rows', () => {
    it.each([true, false])(
      'Should never render a delete control, hasFinished %s',
      async (hasFinished) => {
        const { queryByRole } = renderCard({ hasFinished });
        // An upcoming event auto-expands its first group, so only the still
        // collapsed rows have an expand control to click.
        const expandIfCollapsed = async (label: string) => {
          const expand = queryByRole('button', { name: `Expand ${label}` });
          if (expand) {
            await userEvent.click(expand);
          }
        };

        await expandIfCollapsed('Team Alpha');
        await expandIfCollapsed('Project Gamma');
        expect(
          queryByRole('button', { name: /^Remove / }),
        ).not.toBeInTheDocument();
      },
    );
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
});
