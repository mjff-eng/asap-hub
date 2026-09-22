import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { silver } from '../../colors';
import EditEventSpeakersModal, {
  SpeakerSearchOption,
} from '../EditEventSpeakersModal';
import {
  SpeakerExternalGroup,
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from '../speaker-group';

const getUser = (
  overrides: Partial<SpeakerGroupUser> = {},
): SpeakerGroupUser => ({
  id: 'user-1',
  displayName: 'Jane Doe',
  roles: ['Lead PI'],
  preliminaryFindingsShared: false,
  ...overrides,
});

const getExternalUser = (
  overrides: Partial<SpeakerGroupExternalUser> = {},
): SpeakerGroupExternalUser => ({
  id: 'ext-1',
  displayName: 'Guest One',
  preliminaryFindingsShared: false,
  ...overrides,
});

const getTeamGroup = (
  overrides: Partial<SpeakerTeamGroup> = {},
): SpeakerTeamGroup => ({
  id: 'team-1',
  variant: 'team',
  teamName: 'Team Alpha',
  users: [getUser()],
  ...overrides,
});

const getProjectGroup = (
  overrides: Partial<SpeakerProjectGroup> = {},
): SpeakerProjectGroup => ({
  id: 'project-1',
  variant: 'project',
  projectName: 'Project One',
  projectType: 'Discovery Project',
  users: [getUser({ id: 'user-9', displayName: 'Robin Vale' })],
  ...overrides,
});

const getExternalGroup = (
  overrides: Partial<SpeakerExternalGroup> = {},
): SpeakerExternalGroup => ({
  id: 'external',
  variant: 'external',
  users: [getExternalUser()],
  ...overrides,
});

const groups: SpeakerGroup[] = [getTeamGroup()];

const singleAffiliationOption: SpeakerSearchOption = {
  value: 'user-2',
  label: 'John Smith',
  user: {
    userId: 'user-2',
    displayName: 'John Smith',
    affiliationOptions: [
      {
        variant: 'team',
        id: 'team-2',
        name: 'Team Beta',
        role: 'Data Manager',
      },
    ],
  },
};

const multiAffiliationOption: SpeakerSearchOption = {
  value: 'user-3',
  label: 'Alex Kim',
  user: {
    userId: 'user-3',
    displayName: 'Alex Kim',
    affiliationOptions: [
      {
        variant: 'team',
        id: 'team-1',
        name: 'Team Alpha',
        role: 'Project Manager',
      },
      {
        variant: 'team',
        id: 'team-3',
        name: 'Team Gamma',
        role: 'Trainee',
      },
      {
        variant: 'project',
        id: 'project-7',
        name: 'Project Seven',
        projectType: 'Discovery Project',
        role: 'Contributor',
      },
    ],
  },
};

const noAffiliationOption: SpeakerSearchOption = {
  value: 'user-4',
  label: 'Casey Fox',
  user: {
    userId: 'user-4',
    displayName: 'Casey Fox',
    affiliationOptions: [],
  },
};

const loadSearchOptions = jest.fn(async () => [
  singleAffiliationOption,
  multiAffiliationOption,
  noAffiliationOption,
]);
const onSave = jest.fn();
const onDismiss = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  loadSearchOptions.mockImplementation(async () => [
    singleAffiliationOption,
    multiAffiliationOption,
    noAffiliationOption,
  ]);
});

const renderModal = (
  overrides: Partial<ComponentProps<typeof EditEventSpeakersModal>> = {},
) =>
  render(
    <EditEventSpeakersModal
      loadSearchOptions={loadSearchOptions}
      onSave={onSave}
      onDismiss={onDismiss}
      groups={groups}
      isPastEvent
      {...overrides}
    />,
  );

const search = async (term: string, optionName: string) => {
  await userEvent.type(screen.getByRole('combobox'), term);
  await userEvent.click(await screen.findByText(optionName));
};

// Only the "create" search option bolds the typed name, so this keeps picking
// the menu entry once a speaker row already shows that same name.
const searchNonCrn = async (term: string) => {
  await userEvent.type(screen.getByRole('combobox'), term);
  await userEvent.click(await screen.findByText(term, { selector: 'strong' }));
};

const markJaneShared = async () => {
  await userEvent.click(
    screen.getByRole('button', { name: 'Expand Team Alpha' }),
  );
  await userEvent.click(
    screen.getByRole('checkbox', {
      name: 'Jane Doe preliminary findings shared',
    }),
  );
};

describe('EditEventSpeakersModal', () => {
  it('Should render the "Add Speakers" title and empty state with no speakers', () => {
    renderModal({ groups: [] });

    expect(
      screen.getByRole('heading', { name: 'Add Speakers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Add speakers to this event')).toBeInTheDocument();
  });

  it('Should never render a Mark All Shared button on a past event', () => {
    renderModal();

    expect(
      screen.queryByRole('button', { name: /Mark All/ }),
    ).not.toBeInTheDocument();
  });

  it('Should render the "Edit Speakers" title and the group names', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Edit Speakers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
  });

  it('Should not render a member counter next to the group name', () => {
    renderModal();

    expect(screen.queryByText('(1)')).not.toBeInTheDocument();
  });

  it('Should not render a speaker summary line', () => {
    renderModal();

    expect(screen.queryByText('1 Team')).not.toBeInTheDocument();
    expect(screen.queryByText('1 User')).not.toBeInTheDocument();
  });

  it('Should label the table columns on a past event', () => {
    renderModal({ isPastEvent: true });

    expect(screen.getByText('Speakers')).toBeInTheDocument();
    expect(screen.getByText('Preliminary Findings')).toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
  });

  it('Should not label the table columns on an upcoming event', () => {
    renderModal({ isPastEvent: false });

    expect(screen.queryByText('Speakers')).not.toBeInTheDocument();
    expect(screen.queryByText('Preliminary Findings')).not.toBeInTheDocument();
  });

  it('Should render only the sections that have speakers, in order', () => {
    renderModal({ groups: [getTeamGroup(), getExternalGroup()] });

    const headings = screen
      .getAllByRole('heading')
      .map((heading) => heading.textContent);
    expect(headings).toEqual(
      expect.arrayContaining(['From Team Projects', 'External']),
    );
    expect(headings).not.toContain('From Individual Projects');
    expect(headings.indexOf('From Team Projects')).toBeLessThan(
      headings.indexOf('External'),
    );
  });

  it('Should render external speakers as flat rows with no group wrapper', () => {
    renderModal({ groups: [getExternalGroup()] });

    expect(screen.getByText('Guest One')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /External Users/ }),
    ).not.toBeInTheDocument();
  });

  it('Should move the group pill from grey to green when one speaker toggle is turned on, without saving', async () => {
    renderModal({
      groups: [
        getTeamGroup({
          users: [
            getUser(),
            getUser({ id: 'user-2', displayName: 'John Smith' }),
          ],
        }),
      ],
    });

    expect(screen.getByText('0 of 2 shared')).toBeVisible();
    expect(screen.getByTitle('Cross')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Jane Doe preliminary findings shared',
      }),
    );

    expect(screen.getByText('1 of 2 shared')).toBeVisible();
    expect(screen.getByTitle('Tick')).toBeInTheDocument();
    expect(screen.queryByTitle('Cross')).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Should remove the group row once its last speaker is deleted', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Jane Doe' }),
    );

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'From Team Projects' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Add speakers to this event')).toBeInTheDocument();
  });

  it('Should disable Save while a multiple-affiliation banner is unresolved and enable it once an affiliation is picked', async () => {
    renderModal({ groups: [] });

    await search('Alex', 'Alex Kim');

    expect(
      screen.getByText('Pick a team or project to finish adding them.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Team Gamma/ }));

    expect(
      screen.queryByText('Pick a team or project to finish adding them.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
  });

  it('Should cancel the pending addition and re-enable Save when the banner is dismissed', async () => {
    renderModal();

    await markJaneShared();
    await search('Alex', 'Alex Kim');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Alex Kim' }),
    );

    expect(screen.queryByText('Alex Kim')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('Should list an individual project alongside teams and place the speaker in the Individual Projects section', async () => {
    renderModal();

    await search('Alex', 'Alex Kim');

    expect(
      screen.getByRole('button', { name: /Project Seven/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Project Seven/ }),
    );

    expect(
      screen.getByRole('heading', { name: 'From Individual Projects' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Project Seven')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
  });

  it('Should disable the person search while a banner is pending and re-enable it once dismissed', async () => {
    renderModal();

    await search('Alex', 'Alex Kim');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Alex Kim' }),
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Should add a speaker with exactly one affiliation directly and confirm it with a toast', async () => {
    renderModal();

    await search('John', 'John Smith');

    expect(screen.getByText('Added John Smith to Team Beta')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Collapse Team Beta' }),
    ).toBeInTheDocument();
  });

  it('Should remove the just-added speaker and leave no banner open when Undo is clicked', async () => {
    renderModal();

    await search('John', 'John Smith');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Added John Smith to Team Beta'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Pick a team or project to finish adding them.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Should keep the toast until it is dismissed', async () => {
    renderModal();

    await search('John', 'John Smith');
    await userEvent.click(
      within(screen.getByRole('status')).getByRole('button', {
        name: 'Dismiss message',
      }),
    );

    expect(
      screen.queryByText('Added John Smith to Team Beta'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('Should block a CRN user who belongs to no team or project', async () => {
    renderModal();

    await search('Casey', 'Casey Fox');

    expect(
      screen.getByText(
        'This speaker is not a member on any CRN team or individual project. They cannot be added as a speaker until they belong to one.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Keep as External Guest' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Should dismiss the blocked speaker message and free the search again', async () => {
    renderModal();

    await search('Casey', 'Casey Fox');
    await userEvent.click(
      screen.getByRole('button', { name: 'Dismiss message' }),
    );

    expect(screen.queryByText('Casey Fox')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Should keep a name that is not a CRN user as an external guest', async () => {
    renderModal();

    await search('Guest Speaker', 'Guest Speaker');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );

    expect(
      screen.getByRole('heading', { name: 'External' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Guest Speaker')).toBeInTheDocument();
    expect(
      screen.getByText('Added Guest Speaker as an External Guest'),
    ).toBeVisible();
  });

  it('Should add a second external speaker into the existing External section', async () => {
    renderModal({ groups: [getExternalGroup()] });

    await search('Guest Two', 'Guest Two');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );

    expect(screen.getByText('Guest One')).toBeInTheDocument();
    expect(screen.getByText('Guest Two')).toBeInTheDocument();
  });

  it('Should cancel the pending addition when the external banner is dismissed', async () => {
    renderModal();

    await markJaneShared();
    await search('Guest Speaker', 'Guest Speaker');
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Guest Speaker' }),
    );

    expect(screen.queryByText('Guest Speaker')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Should show a Show more control inside a group with more than five speakers and reset it on collapse', async () => {
    renderModal({
      groups: [
        getTeamGroup({
          users: Array.from({ length: 7 }, (_row, index) =>
            getUser({
              id: `user-${index}`,
              displayName: `Speaker ${index}`,
            }),
          ),
        }),
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    expect(screen.queryByText('Speaker 6')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Show 2 more speakers in Team Alpha',
      }),
    );
    expect(screen.getByText('Speaker 6')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );

    expect(screen.queryByText('Speaker 6')).not.toBeInTheDocument();
  });

  it('Should toggle one speaker without touching the others or the other group', async () => {
    renderModal({
      groups: [
        getTeamGroup({
          users: [
            getUser({ id: 'user-a', displayName: 'Ana Reis' }),
            getUser({ id: 'user-b', displayName: 'Bruno Sa' }),
          ],
        }),
        getTeamGroup({ id: 'team-2', teamName: 'Team Beta' }),
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Ana Reis preliminary findings shared',
      }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Ana Reis preliminary findings shared',
      }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: 'Bruno Sa preliminary findings shared',
      }),
    ).not.toBeChecked();
    expect(screen.getByText('1 of 2 shared')).toBeVisible();
    expect(screen.getByText('0 of 1 shared')).toBeVisible();
  });

  it('Should add into the matching group and leave the other groups alone', async () => {
    renderModal({
      groups: [
        getTeamGroup({
          id: 'team-2',
          teamName: 'Team Beta',
          users: [getUser({ id: 'user-c', displayName: 'Carla Mota' })],
        }),
        getTeamGroup(),
      ],
    });

    await search('John', 'John Smith');

    expect(screen.getByText('Added John Smith to Team Beta')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryAllByText('John Smith')).toHaveLength(1);
  });

  it('Should toggle one external speaker without touching the other', async () => {
    renderModal({
      groups: [
        getExternalGroup({
          users: [
            getExternalUser({ id: 'ext-1', displayName: 'Guest One' }),
            getExternalUser({ id: 'ext-2', displayName: 'Guest Two' }),
          ],
        }),
      ],
    });

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Guest One preliminary findings shared',
      }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Guest One preliminary findings shared',
      }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: 'Guest Two preliminary findings shared',
      }),
    ).not.toBeChecked();
  });

  it('Should reveal and re-hide the capped rows of the External section', async () => {
    renderModal({
      groups: [
        getExternalGroup({
          users: Array.from({ length: 7 }, (_row, index) =>
            getExternalUser({
              id: `ext-${index}`,
              displayName: `Guest ${index}`,
            }),
          ),
        }),
      ],
    });

    expect(screen.queryByText('Guest 6')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Show 2 more speakers' }),
    );
    expect(screen.getByText('Guest 6')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Guest 6')).not.toBeInTheDocument();
  });

  it('Should show a Show more control on a section with more than five group rows', async () => {
    renderModal({
      groups: Array.from({ length: 7 }, (_row, index) =>
        getTeamGroup({
          id: `team-${index}`,
          teamName: `Team ${index}`,
          users: [getUser({ id: `user-${index}` })],
        }),
      ),
    });

    expect(screen.queryByText('Team 6')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Show 2 more teams' }),
    );

    expect(screen.getByText('Team 6')).toBeInTheDocument();
  });

  it('Should hide preliminary findings controls on an upcoming event', () => {
    renderModal({ isPastEvent: false, groups: [getTeamGroup()] });

    expect(screen.queryByText('Preliminary Findings')).not.toBeInTheDocument();
    expect(screen.queryByText('0 of 1 shared')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('Should save groups carrying per-speaker findings', async () => {
    renderModal({
      groups: [
        getTeamGroup({
          users: [
            getUser(),
            getUser({ id: 'user-2', displayName: 'John Smith' }),
          ],
        }),
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'John Smith preliminary findings shared',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        {
          id: 'team-1',
          variant: 'team',
          teamName: 'Team Alpha',
          users: [
            expect.objectContaining({
              id: 'user-1',
              preliminaryFindingsShared: false,
            }),
            expect.objectContaining({
              id: 'user-2',
              preliminaryFindingsShared: true,
            }),
          ],
        },
      ]),
    );
  });

  it('Should never render a group with zero members, even when passed in via groups', () => {
    renderModal({
      groups: [
        getTeamGroup(),
        getTeamGroup({ id: 'team-2', teamName: 'Team Beta', users: [] }),
      ],
    });

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
  });

  it('Should remove a speaker from one group without affecting another group or the external speakers', async () => {
    renderModal({
      groups: [
        getTeamGroup(),
        getTeamGroup({
          id: 'team-2',
          teamName: 'Team Beta',
          users: [getUser({ id: 'user-2', displayName: 'John Smith' })],
        }),
        getExternalGroup(),
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Guest One' }),
    );

    expect(screen.queryByText('Guest One')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Beta' }),
    );
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('Should toggle an external speaker’s findings independently', async () => {
    renderModal({ groups: [getExternalGroup()] });

    const toggle = screen.getByRole('checkbox', {
      name: 'Guest One preliminary findings shared',
    });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    expect(
      screen.getByRole('checkbox', {
        name: 'Guest One preliminary findings shared',
      }),
    ).toBeChecked();
  });

  it('Should not duplicate a speaker who is searched and selected twice for the same team', async () => {
    renderModal({ groups: [] });

    await search('John', 'John Smith');
    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Team Beta' }),
    );
    await search('John', 'John Smith');

    expect(
      screen.getByRole('button', { name: 'Collapse Team Beta' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('John Smith')).toHaveLength(1);
  });

  it('Should close immediately on cancel when nothing has changed', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Discard changes' }),
    ).not.toBeInTheDocument();
  });

  it('Should confirm before discarding and call onDismiss on "Discard changes"', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Jane Doe preliminary findings shared',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByText("You'll lose all unsaved changes if you cancel now."),
    ).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Discard changes' }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Should return to editing when "Keep Editing" is clicked', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Jane Doe preliminary findings shared',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Discard changes' }),
    ).not.toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Should disable Save when nothing has changed', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Should enable Save once every speaker has been removed and report the emptied group', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Jane Doe' }),
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'team-1', users: [] }),
      ]),
    );
  });

  it('Should not toast or duplicate a speaker who is already in the group', async () => {
    renderModal({ groups: [] });

    await search('John', 'John Smith');
    expect(screen.getByText('Added John Smith to Team Beta')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Team Beta' }),
    );
    await search('John', 'John Smith');

    expect(
      screen.queryByText('Added John Smith to Team Beta'),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('John Smith')).toHaveLength(1);
  });

  it('Should keep external speaker ids distinct when a speaker is removed between two additions', async () => {
    renderModal();

    await searchNonCrn('Bob');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Jane Doe' }),
    );
    await searchNonCrn('Bob');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );

    const removeButtons = screen.getAllByRole('button', { name: 'Remove Bob' });
    expect(removeButtons).toHaveLength(2);

    await userEvent.click(removeButtons[0] as HTMLElement);

    expect(screen.getAllByRole('button', { name: 'Remove Bob' })).toHaveLength(
      1,
    );
  });

  it('Should drop a group created by an addition that is then undone', async () => {
    renderModal();

    await search('John', 'John Smith');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await markJaneShared();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'team-1' }),
      ]),
    );
  });

  it('Should still report a pre-existing group that an undo leaves empty', async () => {
    renderModal();

    await search('Alex', 'Alex Kim');
    await userEvent.click(
      screen.getByRole('button', { name: 'plus Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Jane Doe' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'team-1', users: [] }),
      ]),
    );
  });

  it('Should keep Save disabled when the groups prop changes under an open modal', async () => {
    const { rerender } = renderModal();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    rerender(
      <EditEventSpeakersModal
        loadSearchOptions={loadSearchOptions}
        onSave={onSave}
        onDismiss={onDismiss}
        isPastEvent
        groups={[
          getTeamGroup(),
          getTeamGroup({
            id: 'team-2',
            teamName: 'Team Beta',
            users: [getUser({ id: 'user-2', displayName: 'John Smith' })],
          }),
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Should drop the external group again when its only speaker is removed with the bin', async () => {
    renderModal();

    await searchNonCrn('Bob');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove Bob' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await markJaneShared();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'team-1' }),
      ]),
    );
  });

  it('Should drop the toast when the speaker it announced is removed with the bin', async () => {
    renderModal();

    await searchNonCrn('Bob');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );
    expect(screen.getByText('Added Bob as an External Guest')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Bob' }));

    expect(
      screen.queryByText('Added Bob as an External Guest'),
    ).not.toBeInTheDocument();
  });

  it('Should show a newly added row that would otherwise sit behind the section cap', async () => {
    renderModal({
      groups: [
        getExternalGroup({
          users: Array.from({ length: 5 }, (_row, index) =>
            getExternalUser({
              id: `ext-${index}`,
              displayName: `Guest ${index}`,
            }),
          ),
        }),
      ],
    });

    await searchNonCrn('Bob');
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    );

    expect(screen.getByText('Bob')).toBeVisible();
  });

  it('Should offer the event teams and projects on the external banner for a name that is not a CRN user', async () => {
    renderModal();

    await searchNonCrn('Bob');

    expect(
      screen.getByText(/Select the team or project they represented/),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Keep as External Guest' }),
    ).toBeVisible();
  });

  it('Should place an external guest into the team picked on the banner', async () => {
    renderModal();

    await searchNonCrn('Bob');
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Team Alpha' }),
    );

    expect(screen.getByText('Added Bob to Team Alpha')).toBeVisible();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('Should render a guest inside a team as an external speaker', async () => {
    renderModal();

    await searchNonCrn('Bob');
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Team Alpha' }),
    );

    // No CRN profile to link to, and "Non CRN" rather than the "No role" a
    // team member with an empty role list would get.
    expect(screen.queryByRole('link', { name: 'Bob' })).not.toBeInTheDocument();
    expect(screen.getByText('Non CRN')).toBeInTheDocument();
    expect(screen.queryByText('No role')).not.toBeInTheDocument();
  });

  it('Should stay usable when saving fails', async () => {
    renderModal({ onSave: jest.fn().mockRejectedValue(new Error('nope')) });

    await markJaneShared();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('Should render both the full and shortened search placeholders (one shown per breakpoint via CSS)', () => {
    renderModal();

    expect(screen.getByText('Search for a person to add…')).toBeInTheDocument();
    expect(screen.getByText('Search for a person…')).toBeInTheDocument();
  });

  it('Should render both the full and shortened "Preliminary Findings" table header labels (one shown per breakpoint via CSS)', () => {
    renderModal();

    expect(screen.getByText('Preliminary Findings')).toBeInTheDocument();
    expect(screen.getByText('P. Findings')).toBeInTheDocument();
  });

  it('Should default to an empty list when groups are omitted', () => {
    render(
      <EditEventSpeakersModal
        loadSearchOptions={loadSearchOptions}
        onSave={onSave}
        onDismiss={onDismiss}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Add Speakers' }),
    ).toBeInTheDocument();
  });

  it('Should render a project group with a link to the project', () => {
    renderModal({ groups: [getProjectGroup()] });

    expect(screen.getByRole('link', { name: 'Project One' })).toHaveAttribute(
      'href',
      expect.stringContaining('project-1'),
    );
  });

  describe('disabled state during cancel confirmation', () => {
    const enterCancelConfirmation = async () => {
      renderModal();
      await userEvent.click(
        screen.getByRole('button', { name: 'Expand Team Alpha' }),
      );
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Jane Doe preliminary findings shared',
        }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    };

    it('Should disable the preliminary findings switch', async () => {
      await enterCancelConfirmation();
      expect(
        screen.getByRole('checkbox', {
          name: 'Jane Doe preliminary findings shared',
        }),
      ).toBeDisabled();
    });

    it('Should change speakers card background', async () => {
      await enterCancelConfirmation();
      expect(screen.getByRole('group', { name: 'Speakers' })).toHaveStyle({
        backgroundColor: silver.rgb,
      });
    });

    it('Should disable the search input', async () => {
      await enterCancelConfirmation();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('Should disable delete buttons on speaker rows', async () => {
      await enterCancelConfirmation();
      expect(
        screen.getByRole('button', { name: 'Remove Jane Doe' }),
      ).toBeDisabled();
    });

    it('Should disable pending speaker card controls', async () => {
      renderModal();
      await userEvent.click(
        screen.getByRole('button', { name: 'Expand Team Alpha' }),
      );
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Jane Doe preliminary findings shared',
        }),
      );
      await search('Alex', 'Alex Kim');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(
        screen.getByRole('button', { name: 'Remove Alex Kim' }),
      ).toBeDisabled();
    });

    it('Should disable external banner controls', async () => {
      renderModal();
      await markJaneShared();
      await search('Guest Speaker', 'Guest Speaker');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Keep as External Guest' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Remove Guest Speaker' }),
      ).toBeDisabled();
    });

    it('Should disable the toast actions', async () => {
      renderModal();
      await search('John', 'John Smith');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
      expect(
        within(screen.getByRole('status')).getByRole('button', {
          name: 'Dismiss message',
        }),
      ).toBeDisabled();
    });

    it('Should re-enable controls when Keep Editing is clicked', async () => {
      await enterCancelConfirmation();
      await userEvent.click(
        screen.getByRole('button', { name: 'Keep Editing' }),
      );
      expect(
        screen.getByRole('checkbox', {
          name: 'Jane Doe preliminary findings shared',
        }),
      ).toBeEnabled();
    });
  });
});
