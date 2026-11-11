import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { StaticRouter } from 'react-router';

import { colour } from '../../colors';

import UploadListModal, { UploadListResult } from '../UploadListModal';

// m1 is new; a1/a2 are resolved teams already on the table (see currentTeams).
const uploadResult: UploadListResult = {
  matched: [
    {
      teamId: 'm1',
      teamName: 'Imaging',
      attended: true,
      teamType: 'Discovery Team',
    },
    { teamId: 'a1', teamName: 'Genetics', attended: true },
    { teamId: 'a2', teamName: 'Proteomics', attended: false },
  ],
  unmatched: [
    {
      name: 'Imagimg',
      suggestion: {
        teamId: 's1',
        teamName: 'Imaging Suggestion',
        teamType: 'Resource Team',
        attended: true,
      },
    },
    { name: 'Data Scince' },
  ],
};

const currentTeams = [
  { teamId: 'a1', teamName: 'Genetics', attended: false },
  { teamId: 'a2', teamName: 'Proteomics', attended: true },
];

const onUploadList = jest.fn(async () => uploadResult);
const onAddAttendees = jest.fn();
const onBack = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const renderModal = (
  overrides: Partial<ComponentProps<typeof UploadListModal>> = {},
) =>
  render(
    <StaticRouter location="/">
      <UploadListModal
        onUploadList={onUploadList}
        onAddAttendees={onAddAttendees}
        onBack={onBack}
        currentTeams={currentTeams}
        {...overrides}
      />
    </StaticRouter>,
  );

const makeFile = (name: string, sizeInBytes = 10) => {
  const file = new File(['x'], name, { type: 'text/csv' });
  Object.defineProperty(file, 'size', { value: sizeInBytes });
  return file;
};

const upload = async (file: File, container: HTMLElement) => {
  const fileInput = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  await userEvent.upload(fileInput, file);
};

describe('UploadListModal', () => {
  it('Should render the initial step with a disabled Add Attendees button', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Upload a list' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add teams from a list/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add Attendees' }),
    ).toBeDisabled();
  });

  it('Should explain the expected file format in a tooltip', async () => {
    renderModal();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /info/i }));

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Your file needs two columns.For team names, use the header Team.For attendance, use Attended.Mark attendance as yes/no.',
    );
  });

  it('Should upload a file and show the result summary and sections', async () => {
    const { container } = renderModal();

    await upload(makeFile('teams.csv'), container);

    expect(onUploadList).toHaveBeenCalled();
    expect(await screen.findByText('teams.csv')).toBeInTheDocument();
    expect(screen.getByText('5 Teams')).toBeInTheDocument();
    expect(screen.getByText('1 matched')).toBeInTheDocument();
    expect(screen.getByText('2 already in')).toBeInTheDocument();
    expect(screen.getByText('1 team')).toBeInTheDocument();
    expect(screen.getByText('2 not matched')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Attendees' })).toBeEnabled();
  });

  it('Should treat every resolved team as new when currentTeams is omitted', async () => {
    const { container } = renderModal({ currentTeams: undefined });

    await upload(makeFile('teams.csv'), container);

    expect(await screen.findByText('3 matched')).toBeInTheDocument();
    expect(screen.getByText('0 already in')).toBeInTheDocument();
  });

  it('Should render a seeded result without any upload', () => {
    renderModal({
      initialFile: makeFile('seeded.csv'),
      initialResult: uploadResult,
    });

    expect(onUploadList).not.toHaveBeenCalled();
    expect(screen.getByText('seeded.csv')).toBeInTheDocument();
    expect(screen.getByText('5 Teams')).toBeInTheDocument();
    expect(screen.getByText('2 not matched')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Imaging' }),
    ).not.toBeInTheDocument();
  });

  it('Should render seeded sections expanded when initialSectionsOpen is set', () => {
    renderModal({
      initialFile: makeFile('seeded.csv'),
      initialResult: uploadResult,
      initialSectionsOpen: true,
    });

    expect(screen.getByRole('link', { name: 'Imaging' })).toBeInTheDocument();
    expect(screen.getByText(/did you mean/)).toBeInTheDocument();
  });

  it('Should disable the Add button while the upload is in progress', async () => {
    let resolveUpload: (result: UploadListResult) => void = () => undefined;
    const pendingUpload = jest.fn(
      () =>
        new Promise<UploadListResult>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const { container } = renderModal({ onUploadList: pendingUpload });

    await upload(makeFile('teams.csv'), container);

    // While parsing, the plus icon is replaced by the spinner and the button
    // is disabled (its accessible name drops the "plus" icon title).
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    resolveUpload(uploadResult);
    expect(await screen.findByText('teams.csv')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'plus Add' }),
    ).not.toBeInTheDocument();
  });

  it('Should show a size error and add no chip when the file is too large', async () => {
    const { container } = renderModal();

    await upload(makeFile('big.csv', 11 * 1000 * 1000), container);

    expect(
      screen.getByText(
        'The file size exceeds the limit of 10 MB. Please upload a smaller file.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('big.csv')).not.toBeInTheDocument();
    expect(onUploadList).not.toHaveBeenCalled();
  });

  it('Should reject a file with an unsupported extension', () => {
    const { container } = renderModal();

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    // fireEvent bypasses the input's `accept` filter that userEvent enforces.
    fireEvent.change(fileInput, { target: { files: [makeFile('notes.txt')] } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onUploadList).not.toHaveBeenCalled();
  });

  it('Should ignore a change event with no file selected', () => {
    const { container } = renderModal();

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(onUploadList).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Should re-run the upload when a file chip is removed', async () => {
    const { container } = renderModal();

    await upload(makeFile('teams.csv'), container);
    expect(await screen.findByText('teams.csv')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cross' }));

    await waitFor(() =>
      expect(screen.queryByText('teams.csv')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('5 Teams')).not.toBeInTheDocument();
  });

  it('Should not let the file be removed while it is parsing', async () => {
    let resolveUpload: (result: UploadListResult) => void = () => undefined;
    const pendingUpload = jest.fn<Promise<UploadListResult>, [File]>(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const { container } = renderModal({ onUploadList: pendingUpload });

    await upload(makeFile('teams.csv'), container);
    expect(await screen.findByRole('button', { name: 'Cross' })).toBeDisabled();

    resolveUpload(uploadResult);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cross' })).toBeEnabled(),
    );
  });

  it('Should clear the result when the upload parse fails', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn().mockRejectedValue(new Error('nope')),
    });

    await upload(makeFile('teams.csv'), container);

    expect(await screen.findByText('teams.csv')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add Attendees' }),
      ).toBeDisabled(),
    );
    expect(screen.queryByText('5 Teams')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong reading this file. Please try again.',
    );
  });

  it('Should upload an in-memory copy of the selected file', async () => {
    const readText = (file: File) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      });
    const selectedFile = new File(['Team,Yes'], 'teams.csv', {
      type: 'text/csv',
    });
    const { container } = renderModal();

    await upload(selectedFile, container);

    await waitFor(() => expect(onUploadList).toHaveBeenCalledTimes(1));
    const [uploadedFile] = onUploadList.mock.calls[0] as unknown as [File];
    expect(uploadedFile).not.toBe(selectedFile);
    expect(uploadedFile.name).toBe('teams.csv');
    expect(uploadedFile.type).toBe('text/csv');
    expect(await readText(uploadedFile)).toBe('Team,Yes');
  });

  it('Should show the read error when the selected file cannot be read', async () => {
    jest
      .spyOn(FileReader.prototype, 'readAsArrayBuffer')
      .mockImplementationOnce(function failRead(this: FileReader) {
        this.dispatchEvent(new ProgressEvent('error'));
      });
    const { container } = renderModal();

    await upload(makeFile('teams.csv'), container);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong reading this file. Please try again.',
    );
    expect(onUploadList).not.toHaveBeenCalled();
  });

  it('Should clear the read error once a later upload succeeds', async () => {
    const onUploadListRetry = jest
      .fn<Promise<UploadListResult>, [File]>()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValue(uploadResult);
    const { container } = renderModal({ onUploadList: onUploadListRetry });

    await upload(makeFile('first.csv'), container);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await upload(makeFile('second.csv'), container);

    expect(await screen.findByText('5 Teams')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('when every team in the file is already in the list', () => {
    const fileTeams = [
      { teamId: 'a1', teamName: 'A', attended: true },
      { teamId: 'a2', teamName: 'B', attended: false },
    ];
    const uploadAlreadyIn = () =>
      jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: fileTeams,
          unmatched: [],
        }),
      );

    it('Should explain there is nothing to add when the attendance is the same', async () => {
      const { container } = renderModal({
        currentTeams: fileTeams,
        onUploadList: uploadAlreadyIn(),
      });

      await upload(makeFile('teams.csv'), container);

      expect(await screen.findByRole('status')).toHaveTextContent(
        "Every team in this file is already in your list with the same attendance, so there's nothing to add. Replace the file to try a different one, or cancel to close without changing your list.",
      );
      expect(
        screen.getByRole('button', { name: 'Add Attendees' }),
      ).toBeDisabled();
      expect(screen.queryByText('teams.csv')).not.toBeInTheDocument();
      expect(screen.queryByText('2 Teams')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'plus Add' })).toBeEnabled();
    });

    it('Should list the teams whose attendance will change', async () => {
      const { container } = renderModal({
        currentTeams: [
          { teamId: 'a1', teamName: 'A', attended: false },
          { teamId: 'a2', teamName: 'B', attended: false },
        ],
        onUploadList: uploadAlreadyIn(),
      });

      await upload(makeFile('teams.csv'), container);

      await userEvent.click(
        await screen.findByRole('button', {
          name: /1 already in your list • attendance will change/,
        }),
      );
      expect(screen.getByRole('link', { name: 'A' })).toBeInTheDocument();
      expect(screen.getByText('Attended')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'B' })).not.toBeInTheDocument();
      expect(
        screen.getByText(
          'Updating overwrites the current attendance. Remove a row to keep it as it is.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add Attendees' }),
      ).toBeEnabled();
    });

    it('Should only send the teams whose attendance changes', async () => {
      const { container } = renderModal({
        currentTeams: [
          { teamId: 'a1', teamName: 'A', attended: false },
          { teamId: 'a2', teamName: 'B', attended: false },
        ],
        onUploadList: uploadAlreadyIn(),
      });

      await upload(makeFile('teams.csv'), container);
      await userEvent.click(
        await screen.findByRole('button', { name: 'Add Attendees' }),
      );

      expect(onAddAttendees).toHaveBeenCalledWith(
        [{ teamId: 'a1', teamName: 'A', attended: true }],
        expect.objectContaining({ name: 'teams.csv' }),
      );
    });

    it('Should disable Add Attendees once every changing team is removed', async () => {
      const { container } = renderModal({
        currentTeams: [
          { teamId: 'a1', teamName: 'A', attended: false },
          { teamId: 'a2', teamName: 'B', attended: false },
        ],
        onUploadList: uploadAlreadyIn(),
      });

      await upload(makeFile('teams.csv'), container);
      await userEvent.click(
        await screen.findByRole('button', {
          name: /already in your list/,
        }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Remove A' }));

      expect(
        screen.getByRole('button', { name: 'Add Attendees' }),
      ).toBeDisabled();
    });
  });

  it('Should replace the current file with a newly picked one', async () => {
    const { container } = renderModal();

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).not.toHaveAttribute('multiple');

    await upload(makeFile('first.csv'), container);
    expect(await screen.findByText('first.csv')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'plus Add' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cross' }));
    await upload(makeFile('second.csv'), container);

    expect(await screen.findByText('second.csv')).toBeInTheDocument();
    expect(screen.queryByText('first.csv')).not.toBeInTheDocument();
    expect(onUploadList).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'second.csv' }),
    );
  });

  it('Should not claim teams were already in after the user deletes them', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [{ teamId: 'm1', teamName: 'Imaging', attended: true }],
          unmatched: [],
        }),
      ),
    });

    await upload(makeFile('teams.csv'), container);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /will be added and marked if attended/,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Imaging' }),
    );

    expect(screen.getByText('1 Team')).toBeInTheDocument();
    expect(screen.queryByText(/already in the attendance table/)).toBeNull();
    expect(screen.queryByText(/No team names found/)).toBeNull();
  });

  it('Should flag an inactive matched team and open its link in a new tab', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [
            {
              teamId: 'm1',
              teamName: 'Imaging',
              attended: true,
              isTeamInactive: true,
            },
          ],
          unmatched: [],
        }),
      ),
      initialSectionsOpen: true,
    });

    await upload(makeFile('teams.csv'), container);

    const link = await screen.findByRole('link', { name: 'Imaging' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(
      within(link.closest('div') as HTMLElement).getByTitle(/inactive/i),
    ).toBeInTheDocument();
  });

  it('Should open an unmatched suggestion link in a new tab', async () => {
    const { container } = renderModal({ initialSectionsOpen: true });

    await upload(makeFile('teams.csv'), container);

    const link = await screen.findByRole('link', {
      name: 'Imaging Suggestion',
    });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('Should warn instead of showing zeroed counts when no names were found', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [],
          unmatched: [],
        }),
      ),
    });

    await upload(makeFile('teams.csv'), container);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No team names found. Check that the file has a Team Name column.',
    );
    expect(screen.queryByText('0 Teams')).not.toBeInTheDocument();
    expect(screen.queryByText('0 matched')).not.toBeInTheDocument();
  });

  it('Should keep the size warning ahead of the empty-file warning', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [],
          unmatched: [],
        }),
      ),
    });

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await userEvent.upload(fileInput, [
      makeFile('huge.csv', 11 * 1000 * 1000),
      makeFile('empty.csv'),
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The file size exceeds the limit of 10 MB. Please upload a smaller file.',
    );
  });

  it('Should reset per-team edits when a new file is uploaded', async () => {
    const { container } = renderModal();

    await upload(makeFile('a.csv'), container);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /will be added and marked if attended/,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Imaging' }),
    );
    // Removing the only matched team hides the matched section.
    expect(
      screen.queryByText(/will be added and marked if attended/),
    ).not.toBeInTheDocument();

    // A fresh upload regenerates the result and clears the removal.
    await upload(makeFile('b.csv'), container);
    expect(
      await screen.findByRole('button', {
        name: /will be added and marked if attended/,
      }),
    ).toBeInTheDocument();
  });

  it('Should expand the matched section and remove a matched team', async () => {
    const { container } = renderModal();
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', {
        name: /will be added and marked if attended/,
      }),
    );

    const matchedLink = screen.getByRole('link', { name: 'Imaging' });
    expect(matchedLink).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Imaging' }),
    );

    expect(
      screen.queryByRole('link', { name: 'Imaging' }),
    ).not.toBeInTheDocument();
    // Removing the last matched team hides the whole matched section.
    expect(
      screen.queryByText(/will be added and marked if attended/),
    ).not.toBeInTheDocument();
  });

  it('Should expand the not-matched section and promote a suggestion', async () => {
    const { container } = renderModal();
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: /not matched/ }),
    );

    expect(screen.getByText(/did you mean/)).toBeInTheDocument();
    expect(screen.getByText(/no close match/)).toBeInTheDocument();
    expect(
      screen.getByText(/Add or update a suggested team to include it/),
    ).toBeInTheDocument();

    const notMatchedSection = screen
      .getByText('2 not matched')
      .closest('button')?.parentElement as HTMLElement;
    await userEvent.click(
      within(notMatchedSection).getByRole('button', { name: /Add/ }),
    );

    expect(screen.getByText('1 not matched')).toBeInTheDocument();
    expect(screen.getByText('2 teams')).toBeInTheDocument();
  });

  it('Should label a suggestion Update when its team is already in the list', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [
            {
              teamId: 'm1',
              teamName: 'Imaging',
              attended: true,
              teamType: 'Discovery Team',
            },
          ],
          unmatched: [
            {
              name: 'Genetcs',
              suggestion: {
                teamId: 'a1',
                teamName: 'Genetics',
                attended: true,
              },
            },
          ],
        }),
      ),
    });
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: /not matched/ }),
    );

    const section = screen.getByText('1 not matched').closest('button')
      ?.parentElement as HTMLElement;
    expect(
      within(section).getByRole('button', { name: /Update/ }),
    ).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: /Add/ }),
    ).not.toBeInTheDocument();
  });

  it('Should show a suggestion as already up to date when its attendance is the same', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [],
          unmatched: [
            {
              name: 'Genetcs',
              suggestion: {
                teamId: 'a1',
                teamName: 'Genetics',
                attended: false,
              },
            },
          ],
        }),
      ),
    });
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: /not matched/ }),
    );

    const section = screen.getByText('1 not matched').closest('button')
      ?.parentElement as HTMLElement;
    expect(within(section).getByText('Already up to date')).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: /Update|Add/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add Attendees' }),
    ).toBeDisabled();
  });

  it('Should return a removed suggested team to the not-matched list', async () => {
    const { container } = renderModal();
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: /not matched/ }),
    );
    const notMatchedSection = screen
      .getByText('2 not matched')
      .closest('button')?.parentElement as HTMLElement;
    await userEvent.click(
      within(notMatchedSection).getByRole('button', { name: /Add/ }),
    );
    expect(screen.getByText('1 not matched')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: /will be added and marked if attended/,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Imaging Suggestion' }),
    );

    expect(
      screen.queryByRole('link', { name: 'Imaging Suggestion' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 not matched')).toBeInTheDocument();
    expect(screen.getByText(/did you mean/)).toBeInTheDocument();
  });

  it('Should count a promoted update as already in and send it on save', async () => {
    const onAddAttendeesMock = jest.fn();
    const { container } = renderModal({
      onAddAttendees: onAddAttendeesMock,
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [
            {
              teamId: 'm1',
              teamName: 'Imaging',
              attended: true,
              teamType: 'Discovery Team',
            },
          ],
          unmatched: [
            {
              name: 'Genetcs',
              suggestion: {
                teamId: 'a1',
                teamName: 'Genetics',
                attended: true,
              },
            },
          ],
        }),
      ),
    });
    await upload(makeFile('teams.csv'), container);

    expect(await screen.findByText('0 already in')).toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('button', { name: /not matched/ }),
    );
    const section = screen.getByText('1 not matched').closest('button')
      ?.parentElement as HTMLElement;
    await userEvent.click(
      within(section).getByRole('button', { name: /Update/ }),
    );

    expect(screen.getByText('1 already in')).toBeInTheDocument();
    expect(screen.queryByText(/not matched/)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Attendees' }),
    );
    expect(onAddAttendeesMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({ teamId: 'm1' }),
        expect.objectContaining({ teamId: 'a1', attended: true }),
      ],
      expect.objectContaining({ name: 'teams.csv' }),
    );
  });

  it('Should give a promoted update precedence over the already-in file row', async () => {
    const onAddAttendeesMock = jest.fn();
    const { container } = renderModal({
      currentTeams: [{ teamId: 'a1', teamName: 'Genetics', attended: true }],
      onAddAttendees: onAddAttendeesMock,
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [
            {
              teamId: 'a1',
              teamName: 'Genetics',
              attended: true,
              teamType: 'Discovery Team',
            },
          ],
          unmatched: [
            {
              name: 'Genetcs',
              suggestion: {
                teamId: 'a1',
                teamName: 'Genetics',
                attended: false,
              },
            },
          ],
        }),
      ),
    });
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: /not matched/ }),
    );
    const section = screen.getByText('1 not matched').closest('button')
      ?.parentElement as HTMLElement;
    await userEvent.click(
      within(section).getByRole('button', { name: /Update/ }),
    );

    expect(screen.getByText('1 already in')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Attendees' }),
    );
    expect(onAddAttendeesMock).toHaveBeenCalledWith(
      [expect.objectContaining({ teamId: 'a1', attended: false })],
      expect.objectContaining({ name: 'teams.csv' }),
    );
  });

  it('Should hide the not-matched section when there are none', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: uploadResult.matched,
          unmatched: [],
        }),
      ),
    });

    await upload(makeFile('teams.csv'), container);

    expect(
      await screen.findByRole('button', {
        name: /will be added and marked if attended/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not matched/)).not.toBeInTheDocument();
  });

  it('Should hide the matched section when there are none', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [],
          unmatched: uploadResult.unmatched,
        }),
      ),
    });

    await upload(makeFile('teams.csv'), container);

    expect(await screen.findByText(/not matched/)).toBeInTheDocument();
    expect(
      screen.queryByText(/will be added and marked if attended/),
    ).not.toBeInTheDocument();
  });

  it('Should confirm and pass matched teams and files to onAddAttendees', async () => {
    const { container } = renderModal();
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Attendees' }),
    );

    expect(onAddAttendees).toHaveBeenCalledWith(
      [
        expect.objectContaining({ teamId: 'm1', teamName: 'Imaging' }),
        expect.objectContaining({ teamId: 'a1', attended: true }),
        expect.objectContaining({ teamId: 'a2', attended: false }),
      ],
      expect.objectContaining({ name: 'teams.csv' }),
    );
  });

  it('Should let the user apply status updates when every team is already in', async () => {
    const { container } = renderModal({
      onUploadList: jest.fn(
        async (): Promise<UploadListResult> => ({
          matched: [{ teamId: 'a1', teamName: 'Genetics', attended: true }],
          unmatched: [],
        }),
      ),
    });

    await upload(makeFile('teams.csv'), container);

    const addButton = await screen.findByRole('button', {
      name: 'Add Attendees',
    });
    expect(addButton).toBeEnabled();

    await userEvent.click(addButton);

    expect(onAddAttendees).toHaveBeenCalledWith(
      [expect.objectContaining({ teamId: 'a1', attended: true })],
      expect.objectContaining({ name: 'teams.csv' }),
    );
  });

  it('Should stay usable when confirming fails', async () => {
    const { container } = renderModal({
      onAddAttendees: jest.fn().mockRejectedValue(new Error('nope')),
    });
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Attendees' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add Attendees' }),
      ).toBeEnabled(),
    );
  });

  // The back arrow and Cancel route through the same requestClose handler,
  // so verify each control returns to the parent.
  it.each<[string, () => HTMLElement]>([
    ['the back arrow', () => screen.getByRole('button', { name: 'Back' })],
    ['Cancel', () => screen.getByRole('button', { name: 'Cancel' })],
  ])(
    'Should return to the parent from %s when nothing has changed',
    async (_label, getControl) => {
      renderModal();

      await userEvent.click(getControl());

      expect(onBack).toHaveBeenCalledTimes(1);
    },
  );

  it('Should open the file picker when the Add button is clicked', async () => {
    const { container } = renderModal();

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = jest
      .spyOn(fileInput, 'click')
      .mockImplementation(() => {});

    // The green upload button renders the plus icon (title "plus") plus "Add".
    await userEvent.click(screen.getByRole('button', { name: 'plus Add' }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('Should confirm before discarding and keep editing', async () => {
    const { container } = renderModal();
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancel' }),
    );
    expect(
      screen.getByText("You'll lose all unsaved changes if you cancel now."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));
    expect(
      screen.queryByRole('button', { name: 'Discard changes' }),
    ).not.toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('Should discard via Cancel and return to the parent', async () => {
    const { container } = renderModal();
    await upload(makeFile('teams.csv'), container);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancel' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Discard changes' }),
    );

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  describe('disabled state during cancel confirmation', () => {
    const enterCancelConfirmation = async () => {
      const { container } = renderModal({
        initialFile: makeFile('teams.csv'),
        initialResult: uploadResult,
        initialSectionsOpen: true,
      });
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      return container;
    };

    it('Should not show the file upload Add button while a file is loaded', async () => {
      await enterCancelConfirmation();
      const uploadAddButton = screen
        .getAllByRole('button')
        .find(
          (btn) =>
            (btn as HTMLButtonElement).type === 'submit' &&
            btn.textContent?.endsWith('Add'),
        );
      expect(uploadAddButton).toBeUndefined();
    });

    it('Should disable the file input', async () => {
      const container = await enterCancelConfirmation();
      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDisabled();
    });

    it('Should disable matched team delete buttons', async () => {
      await enterCancelConfirmation();
      expect(
        screen.getByRole('button', { name: 'Remove Imaging' }),
      ).toBeDisabled();
    });

    it('Should disable suggestion Add buttons in unmatched section', async () => {
      await enterCancelConfirmation();
      const suggestionRow = screen.getByText(/did you mean/).closest('div');
      expect(suggestionRow).not.toBeNull();
      const addButton = within(suggestionRow as HTMLElement).getByRole(
        'button',
      );
      expect(addButton).toBeDisabled();
    });

    it('Should keep Tag X button visible but disabled', async () => {
      await enterCancelConfirmation();
      const tagButton = screen.getByRole('button', { name: 'Cross' });
      expect(tagButton).toBeDisabled();
    });

    it('Should change result card background', async () => {
      await enterCancelConfirmation();
      const matchedHeader = screen.getByText(/will be added/);
      const resultCard = matchedHeader.closest('button')?.parentElement;
      expect(resultCard).not.toBeNull();
      expect(resultCard).toHaveStyleRule(
        'background-color',
        colour.background.disabled,
      );
    });

    it('Should re-enable controls when Keep Editing is clicked', async () => {
      await enterCancelConfirmation();
      await userEvent.click(
        screen.getByRole('button', { name: 'Keep Editing' }),
      );
      expect(
        screen.getByRole('button', { name: 'Remove Imaging' }),
      ).toBeEnabled();
    });
  });
});
