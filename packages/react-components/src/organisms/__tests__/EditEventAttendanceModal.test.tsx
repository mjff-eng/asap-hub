import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { StaticRouter } from 'react-router';

import { steel } from '../../colors';
import EditEventAttendanceModal from '../EditEventAttendanceModal';
import { EventAttendanceTeam } from '../EventAttendance';

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
    teamType: 'Resource Team',
  },
];

const loadSearchOptions = jest.fn(async () => [
  {
    value: 'searched-1',
    label: 'Searched Team',
    optionType: 'team' as const,
    teamType: 'Discovery Team' as const,
  },
  {
    value: 'searched-group-1',
    label: 'Searched Group',
    optionType: 'interestGroup' as const,
    teams: [
      { teamId: 'sgt-1', teamName: 'Group Search Team', attended: true },
      { teamId: 'sgt-2', teamName: 'Other Group Team', attended: true },
    ],
  },
]);

const onUploadList = jest.fn(async () => ({
  matched: [
    { teamId: 'uploaded-1', teamName: 'Uploaded Team', attended: true },
  ],
  unmatched: [],
}));

const onSave = jest.fn();
const onDismiss = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const renderModal = (
  overrides: Partial<ComponentProps<typeof EditEventAttendanceModal>> = {},
) =>
  render(
    <StaticRouter location="/">
      <EditEventAttendanceModal
        loadSearchOptions={loadSearchOptions}
        onUploadList={onUploadList}
        onSave={onSave}
        onDismiss={onDismiss}
        interestGroupName="Alpha Group"
        teams={teams}
        {...overrides}
      />
    </StaticRouter>,
  );

describe('EditEventAttendanceModal', () => {
  it('Should render the "Add Attendance" title and empty prompt with no attendees', () => {
    renderModal({ teams: [] });

    expect(
      screen.getByRole('heading', { name: 'Add Attendance' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Add teams to track attendance'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Mark All Attended' }),
    ).not.toBeInTheDocument();
  });

  it('Should flag an inactive team in the attendees table', () => {
    renderModal({
      teams: [
        { ...teams[0]!, isTeamInactive: true },
        { ...teams[1]!, isTeamInactive: false },
      ],
    });

    const inactiveRow = screen
      .getByRole('link', { name: 'Team Alpha' })
      .closest('span') as HTMLElement;
    const activeRow = screen
      .getByRole('link', { name: 'Team Beta' })
      .closest('span') as HTMLElement;

    expect(within(inactiveRow).getByTitle('Inactive Team')).toBeInTheDocument();
    expect(within(activeRow).queryByTitle('Inactive Team')).toBeNull();
  });

  it('Should render the "Edit Attendance" title, rows and counts when attendees exist', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Edit Attendance' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Team Alpha' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Team Beta' })).toBeInTheDocument();
    expect(screen.getByText('2 Expected')).toBeInTheDocument();
    expect(screen.getByText('1 Attended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('Should toggle a team attendance on and off', async () => {
    renderModal();

    const betaSwitch = screen.getByRole('checkbox', {
      name: 'Team Beta attendance',
    });
    expect(betaSwitch).not.toBeChecked();

    await userEvent.click(betaSwitch);

    expect(betaSwitch).toBeChecked();
    expect(screen.getByText('2 Attended')).toBeInTheDocument();
  });

  it('Should mark all teams as attended and flip the button to "Mark All Not Attended"', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark All Attended' }),
    );

    expect(
      screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
    ).toBeChecked();
    expect(screen.getByText('2 Attended')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mark All Not Attended' }),
    ).toBeInTheDocument();
  });

  it('Should mark all teams as not attended when all are attended', async () => {
    renderModal({
      teams: [
        { teamId: 't1', teamName: 'Team Alpha', attended: true },
        { teamId: 't2', teamName: 'Team Beta', attended: true },
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark All Not Attended' }),
    );

    expect(
      screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
    ).not.toBeChecked();
    expect(screen.getByText('0 Attended')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mark All Attended' }),
    ).toBeInTheDocument();
  });

  it('Should remove a team from the list', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Team Beta' }),
    );

    expect(
      screen.queryByRole('link', { name: 'Team Beta' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1 Expected')).toBeInTheDocument();
  });

  it('Should split the rows into an interest-group and an additional section', () => {
    renderModal();

    expect(screen.getByText('From Alpha Group (1)')).toBeInTheDocument();
    expect(screen.getByText('Additional teams (1)')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Added automatically because this group is hosting. These cannot be removed.',
      ),
    ).toBeInTheDocument();
  });

  it('Should title the interest-group section generically without a group name', () => {
    renderModal({ interestGroupName: undefined });

    expect(screen.getByText('From interest group (1)')).toBeInTheDocument();
  });

  it('Should render only the additional section when no row came from the group', () => {
    renderModal({
      teams: [{ teamId: 't2', teamName: 'Team Beta', attended: false }],
    });

    expect(screen.queryByText(/^From /)).not.toBeInTheDocument();
    expect(screen.getByText('Additional teams (1)')).toBeInTheDocument();
  });

  it('Should lock interest-group rows while keeping their toggle usable', async () => {
    renderModal();

    expect(
      screen.queryByRole('button', { name: 'Remove Team Alpha' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Locked' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Team Beta' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
    );

    expect(
      screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
    ).not.toBeChecked();
    expect(screen.getByText('0 Attended')).toBeInTheDocument();
  });

  it('Should collapse each section past five teams and expand them independently', async () => {
    const sectionTeams = (
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
    renderModal({
      teams: [
        ...sectionTeams('Group', 7, true),
        ...sectionTeams('Extra', 6, false),
      ],
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(
      screen.queryByRole('link', { name: 'Group 6' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));

    expect(screen.getByRole('link', { name: 'Group 7' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Extra 6' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));

    expect(
      screen.queryByRole('link', { name: 'Group 7' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show 1 more' }));

    expect(screen.getByRole('link', { name: 'Extra 6' })).toBeInTheDocument();
  });

  it('Should divide a row from whatever follows it, and nothing else', () => {
    const divider = `1px solid ${steel.rgb}`;
    const row = (name: string) =>
      screen.getByRole('link', { name }).closest('[role="listitem"]');
    const { unmount } = renderModal();

    expect(row('Team Beta')).not.toHaveStyleRule('border-bottom', divider);
    unmount();

    // The modal seeds its rows from the prop once, so this needs a fresh render.
    renderModal({
      teams: Array.from({ length: 6 }, (_, index) => ({
        teamId: `t${index + 1}`,
        teamName: `Team ${index + 1}`,
        attended: true,
      })),
    });
    expect(row('Team 5')).toHaveStyleRule('border-bottom', divider);
  });

  it('Should drop the show-more control once a section shrinks below it', async () => {
    renderModal({
      teams: Array.from({ length: 6 }, (_, index) => ({
        teamId: `t${index + 1}`,
        teamName: `Team ${index + 1}`,
        attended: true,
      })),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Show 1 more' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Team 6' }),
    );

    expect(
      screen.queryByRole('button', { name: /Show (less|\d+ more)/ }),
    ).not.toBeInTheDocument();
  });

  it('Should mark locked rows attended along with the rest', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark All Attended' }),
    );

    expect(
      screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
    ).toBeChecked();
  });

  it('Should add a team from the search field', async () => {
    renderModal({ teams: [] });

    await userEvent.type(screen.getByRole('combobox'), 'Sea');
    await userEvent.click(await screen.findByText('Searched Team'));

    expect(loadSearchOptions).toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: 'Searched Team' }),
    ).toBeInTheDocument();
  });

  it('Should add all teams from an interest-group search result', async () => {
    renderModal({ teams: [] });

    await userEvent.type(screen.getByRole('combobox'), 'Sea');
    await userEvent.click(await screen.findByText('Searched Group'));

    expect(
      await screen.findByRole('link', { name: 'Group Search Team' }),
    ).toBeInTheDocument();
  });

  it('Should flag a fully-added group in the search results', async () => {
    renderModal({
      teams: [
        { teamId: 'sgt-1', teamName: 'Group Search Team', attended: true },
        { teamId: 'sgt-2', teamName: 'Other Group Team', attended: true },
      ],
    });

    await userEvent.type(screen.getByRole('combobox'), 'Sea');

    expect(
      await screen.findByText('• all teams already added'),
    ).toBeInTheDocument();
  });

  it('Should count only what a partly-added group would add', async () => {
    renderModal({
      teams: [
        { teamId: 'sgt-1', teamName: 'Group Search Team', attended: true },
      ],
    });

    await userEvent.type(screen.getByRole('combobox'), 'Sea');

    expect(await screen.findByText('• adds 1 team')).toBeInTheDocument();
  });

  it('Should show a no-matches message when the search returns nothing', async () => {
    renderModal({ teams: [], loadSearchOptions: jest.fn(async () => []) });

    await userEvent.type(screen.getByRole('combobox'), 'zzz');

    expect(
      await screen.findByText('Sorry, no matches for zzz.'),
    ).toBeInTheDocument();
  });

  it('Should not show the search dropdown before the user types', async () => {
    renderModal({ teams: [], loadSearchOptions: jest.fn(async () => []) });

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.queryByText(/Sorry, no matches/)).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('combobox'), 'z');
    expect(
      await screen.findByText('Sorry, no matches for z.'),
    ).toBeInTheDocument();
  });

  it('Should render both the full and shortened search placeholders (one shown per breakpoint via CSS)', () => {
    renderModal({ teams: [] });

    expect(
      screen.getByText('Search for a team or interest group to add…'),
    ).toBeInTheDocument();
    expect(screen.getByText('Search team or group…')).toBeInTheDocument();
  });

  it('Should open the upload list modal when the upload button is clicked', async () => {
    renderModal({ teams: [] });

    await userEvent.click(
      screen.getByRole('button', { name: /Upload a List/ }),
    );

    expect(
      screen.getByRole('heading', { name: 'Upload a list' }),
    ).toBeInTheDocument();
  });

  it('Should return from the upload modal when the back arrow is clicked', async () => {
    renderModal({ teams: [] });

    await userEvent.click(
      screen.getByRole('button', { name: /Upload a List/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(
      screen.getByRole('heading', { name: 'Add Attendance' }),
    ).toBeInTheDocument();
  });

  it('Should add uploaded teams and record the source list when confirmed', async () => {
    const { container } = renderModal({ teams: [] });

    await userEvent.click(
      screen.getByRole('button', { name: /Upload a List/ }),
    );

    const fileInput = container.querySelector('input[type="file"]');
    await userEvent.upload(
      fileInput as HTMLInputElement,
      new File(['team'], 'teams.csv', { type: 'text/csv' }),
    );

    expect(onUploadList).toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Attendees' }),
    );

    expect(
      await screen.findByRole('link', { name: 'Uploaded Team' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Source lists')).toBeInTheDocument();
    expect(screen.getByText('• 1 File')).toBeInTheDocument();
    expect(screen.getByText('teams.csv')).toBeInTheDocument();
  });

  it('Should update an already-listed team from an upload without duplicating it', async () => {
    // t1 is already among `teams`, so the modal classifies it as already-in and
    // updates the row in place rather than adding a duplicate.
    const uploadUpdate = jest.fn(async () => ({
      matched: [{ teamId: 't1', teamName: 'Team Alpha', attended: false }],
      unmatched: [],
    }));
    const { container } = renderModal({ teams, onUploadList: uploadUpdate });

    await userEvent.click(
      screen.getByRole('button', { name: /Upload a List/ }),
    );
    await userEvent.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['team'], 'teams.csv', { type: 'text/csv' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Attendees' }),
    );

    // No duplicate row is added: the two seeded teams remain.
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ teamId: 't1', attended: false }),
      expect.objectContaining({ teamId: 't2', attended: false }),
    ]);
  });

  it('Should pluralise the source list count for multiple files', () => {
    renderModal({
      sourceLists: [
        { id: 'file-1', filename: 'day-1.csv' },
        { id: 'file-2', filename: 'day-2.xlsx' },
      ],
    });

    expect(screen.getByText('• 2 Files')).toBeInTheDocument();
  });

  it('Should download a recorded source list file', async () => {
    const createObjectURL = jest.fn(() => 'blob:url');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const { container } = renderModal({ teams: [] });
    await userEvent.click(
      screen.getByRole('button', { name: /Upload a List/ }),
    );
    await userEvent.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(['team'], 'teams.csv', { type: 'text/csv' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Attendees' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    // The object URL is revoked on a deferred timer so the download can start.
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalled());
    clickSpy.mockRestore();
  });

  it('Should disable the download button while downloading', async () => {
    // A single stable promise so resolving it always settles the one the
    // component awaits, regardless of how many times onDownload is invoked.
    let resolveDownload: () => void = () => undefined;
    const downloadPromise = new Promise<void>((resolve) => {
      resolveDownload = resolve;
    });
    const onDownload = jest.fn(() => downloadPromise);
    renderModal({
      teams,
      sourceLists: [
        {
          id: 'file-1',
          filename: 'attendees.csv',
          addedDate: '01/01/2025',
          onDownload,
        },
      ],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();

    await act(async () => {
      resolveDownload();
    });
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  it('Should re-enable the download button when the download fails', async () => {
    const onDownload = jest.fn().mockRejectedValue(new Error('nope'));
    renderModal({
      teams,
      sourceLists: [
        {
          id: 'file-1',
          filename: 'attendees.csv',
          addedDate: '01/01/2025',
          onDownload,
        },
      ],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(onDownload).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled(),
    );
  });

  it('Should not add a team that is already in the list', async () => {
    renderModal({
      teams: [
        { teamId: 'sgt-1', teamName: 'Group Search Team', attended: false },
      ],
    });

    await userEvent.type(screen.getByRole('combobox'), 'Sea');
    await userEvent.click(await screen.findByText('Searched Group'));

    expect(
      screen.getAllByRole('link', { name: 'Group Search Team' }),
    ).toHaveLength(1);
    // The row it did not have is added; the one it had is not duplicated.
    expect(screen.getByText('2 Expected')).toBeInTheDocument();
  });

  it('Should call onSave with the current teams', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(teams));
  });

  it('Should stay usable when saving fails', async () => {
    renderModal({ onSave: jest.fn().mockRejectedValue(new Error('nope')) });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // The modal must unlock so the user can retry or cancel.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(
      screen.getByText('An error has occurred. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('Should clear the error toast when the user tries saving again', async () => {
    const failingOnSave = jest.fn().mockRejectedValueOnce(new Error('nope'));
    renderModal({ onSave: failingOnSave });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(
        screen.getByText('An error has occurred. Please try again later.'),
      ).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.queryByText('An error has occurred. Please try again later.'),
    ).not.toBeInTheDocument();
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

    // Make a change so the discard confirmation is warranted.
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
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
      screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Discard changes' }),
    ).not.toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Should open the discard confirmation from the close (X) button when dirty', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
    );
    // The Modal's Overlay also renders a disabled aria-label="Close" backdrop;
    // target the enabled header close button.
    const closeButton = screen
      .getAllByRole('button', { name: 'Close' })
      .find((button) => !(button as HTMLButtonElement).disabled);
    await userEvent.click(closeButton as HTMLElement);

    expect(
      screen.getByRole('button', { name: 'Discard changes' }),
    ).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Should hide the upload section when its prop is absent', () => {
    renderModal({ teams: [], onUploadList: undefined });

    expect(
      screen.queryByRole('button', { name: /Upload a List/ }),
    ).not.toBeInTheDocument();
  });

  it('Should default to an empty list when attendees are omitted', () => {
    render(
      <StaticRouter location="/">
        <EditEventAttendanceModal
          loadSearchOptions={loadSearchOptions}
          onSave={onSave}
          onDismiss={onDismiss}
        />
      </StaticRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Add Attendance' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Add teams to track attendance'),
    ).toBeInTheDocument();
  });

  describe('disabled state during cancel confirmation', () => {
    const enterCancelConfirmation = async () => {
      renderModal();
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    };

    it('Should disable every control', async () => {
      await enterCancelConfirmation();

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Mark All Not Attended' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /Upload a List/ }),
      ).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: 'Team Beta attendance' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Remove Team Beta' }),
      ).toBeDisabled();
    });

    it('Should keep the lock icon on interest-group rows', async () => {
      await enterCancelConfirmation();
      expect(screen.getByRole('img', { name: 'Locked' })).toBeInTheDocument();
    });

    it('Should re-enable controls when Keep Editing is clicked', async () => {
      await enterCancelConfirmation();
      await userEvent.click(
        screen.getByRole('button', { name: 'Keep Editing' }),
      );
      expect(
        screen.getByRole('button', { name: 'Mark All Not Attended' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('checkbox', { name: 'Team Alpha attendance' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('button', { name: 'Remove Team Beta' }),
      ).toBeEnabled();
    });
  });
});
