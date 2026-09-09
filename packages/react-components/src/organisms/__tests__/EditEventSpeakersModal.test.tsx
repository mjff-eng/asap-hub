import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { silver } from '../../colors';
import EditEventSpeakersModal, {
  SpeakerSearchOption,
} from '../EditEventSpeakersModal';
import { SpeakerGroup } from '../speaker-group';

const groups: SpeakerGroup[] = [
  {
    id: 'team-1',
    variant: 'team',
    teamName: 'Team Alpha',
    preliminaryFindingsShared: true,
    users: [{ id: 'user-1', displayName: 'Jane Doe', roles: ['Lead PI'] }],
  },
];

const singleTeamOption: SpeakerSearchOption = {
  value: 'user-2',
  label: 'John Smith',
  user: {
    userId: 'user-2',
    displayName: 'John Smith',
    teamOptions: [
      { teamId: 'team-2', teamName: 'Team Beta', role: 'Data Manager' },
    ],
  },
};

const multiTeamOption: SpeakerSearchOption = {
  value: 'user-3',
  label: 'Alex Kim',
  user: {
    userId: 'user-3',
    displayName: 'Alex Kim',
    teamOptions: [
      { teamId: 'team-1', teamName: 'Team Alpha', role: 'Project Manager' },
      { teamId: 'team-3', teamName: 'Team Gamma', role: 'Trainee' },
    ],
  },
};

const loadSearchOptions = jest.fn(async () => [
  singleTeamOption,
  multiTeamOption,
]);
const onSave = jest.fn();
const onDismiss = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  loadSearchOptions.mockImplementation(async () => [
    singleTeamOption,
    multiTeamOption,
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

describe('EditEventSpeakersModal', () => {
  it('Should render the "Add Speakers" title and empty state with no speakers', () => {
    renderModal({ groups: [] });

    expect(
      screen.getByRole('heading', { name: 'Add Speakers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Add speakers to this event')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Search for a person to add them to this event. Once the event has taken place, you'll be able to mark whether each speaker shared preliminary findings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mark All Shared' }),
    ).not.toBeInTheDocument();
  });

  it('Should disable Save until at least one speaker has been added', async () => {
    renderModal({ groups: [] });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(screen.getByRole('combobox'), 'John');
    await userEvent.click(await screen.findByText('John Smith'));

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('Should render the "Edit Speakers" title and stats when speakers exist', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Edit Speakers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 Teams')).toBeInTheDocument();
    expect(screen.getByText('1 Users')).toBeInTheDocument();
  });

  it('Should add a searched CRN user with exactly one team directly, without a pending card', async () => {
    renderModal();

    await userEvent.type(screen.getByRole('combobox'), 'John');
    await userEvent.click(await screen.findByText('John Smith'));

    // Newly added teams auto-expand, so the row is already showing its member.
    expect(
      await screen.findByRole('button', { name: 'Collapse Team Beta' }),
    ).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(
      screen.queryByText('Pick a team to finish adding them.'),
    ).not.toBeInTheDocument();
  });

  it('Should show a pending team-assignment card for a user with multiple teams, and resolve it on pill click', async () => {
    renderModal();

    await userEvent.type(screen.getByRole('combobox'), 'Alex');
    await userEvent.click(await screen.findByText('Alex Kim'));

    expect(
      screen.getByText('Pick a team to finish adding them.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alex Kim' })).toHaveAttribute(
      'href',
      expect.stringContaining('user-3'),
    );

    await userEvent.click(screen.getByRole('button', { name: /Team Gamma/ }));

    expect(
      screen.queryByText('Pick a team to finish adding them.'),
    ).not.toBeInTheDocument();
    // Resolving into a team auto-expands it.
    expect(
      screen.getByRole('button', { name: 'Collapse Team Gamma' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
  });

  it('Should add a creatable external name directly into the External Users group with no team-assignment step', async () => {
    renderModal();

    await userEvent.type(screen.getByRole('combobox'), 'Guest Speaker');
    await userEvent.click(await screen.findByText('Guest Speaker'));

    expect(
      screen.queryByText('Pick a team to finish adding them.'),
    ).not.toBeInTheDocument();
    // Newly added groups auto-expand, so the new external user is already visible.
    expect(
      screen.getByRole('button', { name: 'Collapse External Users' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Guest Speaker')).toBeInTheDocument();
  });

  it('Should toggle a group’s Preliminary Findings switch independently of other groups', async () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'team-2',
          variant: 'team',
          teamName: 'Team Beta',
          preliminaryFindingsShared: false,
          users: [{ id: 'user-2', displayName: 'John Smith', roles: [] }],
        },
      ],
    });

    const alphaSwitch = screen.getByRole('checkbox', {
      name: 'Team Alpha preliminary findings shared',
    });
    const betaSwitch = screen.getByRole('checkbox', {
      name: 'Team Beta preliminary findings shared',
    });
    expect(alphaSwitch).toBeChecked();
    expect(betaSwitch).not.toBeChecked();

    await userEvent.click(betaSwitch);

    expect(betaSwitch).toBeChecked();
    expect(alphaSwitch).toBeChecked();
  });

  it('Should mark every group as shared', async () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'team-2',
          variant: 'team',
          teamName: 'Team Beta',
          preliminaryFindingsShared: false,
          users: [{ id: 'user-2', displayName: 'John Smith', roles: [] }],
        },
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark All Shared' }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Team Beta preliminary findings shared',
      }),
    ).toBeChecked();
  });

  it('Should switch to "Mark All Not Shared" when all teams are shared, ignoring the external group, and unshare them all', async () => {
    renderModal({
      groups: [
        {
          id: 'team-1',
          variant: 'team',
          teamName: 'Team Alpha',
          preliminaryFindingsShared: true,
          users: [{ id: 'user-1', displayName: 'Jane Doe', roles: ['Lead PI'] }],
        },
        {
          id: 'external',
          variant: 'external',
          preliminaryFindingsShared: false,
          users: [{ id: 'ext-0', displayName: 'Guest Speaker' }],
        },
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark All Not Shared' }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Team Alpha preliminary findings shared',
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Mark All Shared' }),
    ).toBeVisible();
  });

  it('Should not offer a preliminary findings switch for the external group', () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'external',
          variant: 'external',
          preliminaryFindingsShared: false,
          users: [{ id: 'ext-0', displayName: 'Guest Speaker' }],
        },
      ],
    });

    expect(
      screen.getByRole('checkbox', {
        name: 'Team Alpha preliminary findings shared',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', {
        name: 'External Users preliminary findings shared',
      }),
    ).not.toBeInTheDocument();
  });

  it('Should hide preliminary findings controls on an upcoming event', () => {
    renderModal({ isPastEvent: false });

    expect(screen.queryByText('Preliminary Findings')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Mark All/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', {
        name: 'Team Alpha preliminary findings shared',
      }),
    ).not.toBeInTheDocument();
  });

  it('Should remove the team row entirely once its last member is removed', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Jane Doe' }),
    );

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Add speakers to this event')).toBeInTheDocument();
  });

  it('Should never render a team with zero members, even when passed in via groups', () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'team-2',
          variant: 'team',
          teamName: 'Team Beta',
          preliminaryFindingsShared: false,
          users: [],
        },
      ],
    });

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Team Beta')).not.toBeInTheDocument();
    expect(screen.getByText('1 Teams')).toBeInTheDocument();
  });

  it('Should remove a user from one group without affecting another team or the External Users group', async () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'team-2',
          variant: 'team',
          teamName: 'Team Beta',
          preliminaryFindingsShared: false,
          users: [{ id: 'user-2', displayName: 'John Smith', roles: [] }],
        },
        {
          id: 'external',
          variant: 'external',
          preliminaryFindingsShared: false,
          users: [{ id: 'ext-1', displayName: 'Guest One' }],
        },
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand External Users' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Guest One' }),
    );

    expect(screen.queryByText('Guest One')).not.toBeInTheDocument();
    expect(screen.getByText('2 Users')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Beta' }),
    );
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('Should not duplicate a speaker who is searched and selected twice for the same team', async () => {
    renderModal({ groups: [] });

    await userEvent.type(screen.getByRole('combobox'), 'John');
    await userEvent.click(await screen.findByText('John Smith'));
    // Collapse the row so the roster's "John Smith" doesn't collide with the
    // dropdown option of the same name on the second search.
    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Team Beta' }),
    );
    await userEvent.type(screen.getByRole('combobox'), 'John');
    await userEvent.click(await screen.findByText('John Smith'));

    // Re-adding the same speaker auto-(re)expands their team.
    expect(
      screen.getByRole('button', { name: 'Collapse Team Beta' }),
    ).toBeInTheDocument();
    const nestedLists = screen.getAllByRole('list');
    const nestedUserList = nestedLists[nestedLists.length - 1];
    if (!nestedUserList) {
      throw new Error('Expected a nested user list to be rendered');
    }
    expect(within(nestedUserList).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('1 Users')).toBeInTheDocument();
  });

  it('Should collapse an already-expanded team when the chevron is clicked again', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Team Alpha' }),
    );
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('Should add a second user to an already-existing team group, keeping both members and leaving other groups untouched', async () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'team-2',
          variant: 'team',
          teamName: 'Team Beta',
          preliminaryFindingsShared: false,
          users: [{ id: 'user-2', displayName: 'John Smith', roles: [] }],
        },
      ],
    });

    loadSearchOptions.mockImplementationOnce(async () => [
      {
        value: 'user-4',
        label: 'Casey Fox',
        user: {
          userId: 'user-4',
          displayName: 'Casey Fox',
          teamOptions: [
            { teamId: 'team-1', teamName: 'Team Alpha', role: 'Trainee' },
          ],
        },
      },
    ]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.type(screen.getByRole('combobox'), 'Casey');
    await userEvent.click(await screen.findByText('Casey Fox'));

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Casey Fox')).toBeInTheDocument();
    // Team Beta (the untouched other group) still contributes its member.
    expect(screen.getByText('3 Users')).toBeInTheDocument();
  });

  it('Should add a second external user into the existing External Users group', async () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'external',
          variant: 'external',
          preliminaryFindingsShared: false,
          users: [{ id: 'ext-1', displayName: 'Guest One' }],
        },
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand External Users' }),
    );
    await userEvent.type(screen.getByRole('combobox'), 'Guest Two');
    await userEvent.click(await screen.findByText('Guest Two'));

    expect(screen.getByText('Guest One')).toBeInTheDocument();
    expect(screen.getByText('Guest Two')).toBeInTheDocument();
  });

  it('Should insert a newly added team before an existing External Users group', async () => {
    renderModal({
      groups: [
        {
          id: 'external',
          variant: 'external',
          preliminaryFindingsShared: false,
          users: [{ id: 'ext-1', displayName: 'Guest One' }],
        },
      ],
    });

    await userEvent.type(screen.getByRole('combobox'), 'John');
    await userEvent.click(await screen.findByText('John Smith'));

    const headings = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? '')
      .filter(
        (label) =>
          label.includes('Team Beta') || label.includes('External Users'),
      );
    expect(headings[0]).toContain('Team Beta');
    expect(headings[1]).toContain('External Users');
  });

  it('Should dismiss the pending speaker card without adding them anywhere', async () => {
    renderModal();

    await userEvent.type(screen.getByRole('combobox'), 'Alex');
    await userEvent.click(await screen.findByText('Alex Kim'));
    expect(
      screen.getByText('Pick a team to finish adding them.'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Alex Kim' }),
    );

    expect(
      screen.queryByText('Pick a team to finish adding them.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Alex Kim')).not.toBeInTheDocument();
  });

  it('Should expand two different teams independently', async () => {
    renderModal({
      groups: [
        ...groups,
        {
          id: 'team-2',
          variant: 'team',
          teamName: 'Team Beta',
          preliminaryFindingsShared: false,
          users: [{ id: 'user-2', displayName: 'John Smith', roles: [] }],
        },
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Alpha' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Team Beta' }),
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
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
      screen.getByRole('checkbox', {
        name: 'Team Alpha preliminary findings shared',
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
      screen.getByRole('checkbox', {
        name: 'Team Alpha preliminary findings shared',
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

  it('Should call onSave with the current groups', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(groups));
  });

  it('Should stay usable when saving fails', async () => {
    renderModal({ onSave: jest.fn().mockRejectedValue(new Error('nope')) });

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

  describe('disabled state during cancel confirmation', () => {
    const enterCancelConfirmation = async () => {
      renderModal();
      const teamRow = screen.getByRole('listitem');
      await userEvent.click(
        within(teamRow).getByRole('checkbox', {
          name: 'Team Alpha preliminary findings shared',
        }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    };

    it('Should disable the Mark All Shared button', async () => {
      await enterCancelConfirmation();
      expect(
        screen.getByRole('button', { name: 'Mark All Shared' }),
      ).toBeDisabled();
    });

    it('Should disable the preliminary findings switch', async () => {
      await enterCancelConfirmation();
      expect(
        screen.getByRole('checkbox', {
          name: 'Team Alpha preliminary findings shared',
        }),
      ).toBeDisabled();
    });

    it('Should change speakers card background', async () => {
      await enterCancelConfirmation();
      const list = screen.getByRole('list');
      expect(list.parentElement).toHaveStyle({
        backgroundColor: silver.rgb,
      });
    });

    it('Should disable the search input', async () => {
      await enterCancelConfirmation();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('Should disable delete buttons on speaker rows', async () => {
      await enterCancelConfirmation();
      await userEvent.click(
        screen.getByRole('button', { name: 'Expand Team Alpha' }),
      );
      expect(
        screen.getByRole('button', { name: 'Remove Jane Doe' }),
      ).toBeDisabled();
    });

    it('Should disable pending speaker card controls', async () => {
      renderModal();
      await userEvent.type(screen.getByRole('combobox'), 'Alex');
      await userEvent.click(await screen.findByText('Alex Kim'));
      expect(
        screen.getByText('Pick a team to finish adding them.'),
      ).toBeInTheDocument();

      await userEvent.click(
        within(screen.getByRole('listitem')).getByRole('checkbox', {
          name: 'Team Alpha preliminary findings shared',
        }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(
        screen.getByRole('button', { name: 'Remove Alex Kim' }),
      ).toBeDisabled();
    });

    it('Should re-enable controls when Keep Editing is clicked', async () => {
      await enterCancelConfirmation();
      await userEvent.click(
        screen.getByRole('button', { name: 'Keep Editing' }),
      );
      expect(
        screen.getByRole('button', { name: 'Mark All Shared' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('checkbox', {
          name: 'Team Alpha preliminary findings shared',
        }),
      ).toBeEnabled();
    });
  });
});
