import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectAsset } from '../../../api/types';
import AssetPanel from '../AssetPanel';

const asset = (overrides: Partial<ProjectAsset> = {}): ProjectAsset => ({
  assetId: 'asset-a',
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label: 'Sprint demo',
  durationMs: 8000,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  ...overrides,
});

const renderPanel = ({
  assets = [asset()],
  used = new Set<string>(),
}: {
  assets?: ProjectAsset[];
  used?: ReadonlySet<string>;
} = {}) => {
  const handlers = {
    onImport: jest.fn(),
    onImportAudio: jest.fn(),
    onRename: jest.fn(),
    onAdd: jest.fn(),
    onDelete: jest.fn(),
  };
  render(
    <AssetPanel
      assets={assets}
      used={used}
      busy={false}
      readOnly={false}
      {...handlers}
    />,
  );
  return handlers;
};

describe('the name of a source', () => {
  const name = () => screen.getByLabelText('Name of Sprint demo');

  it('keeps the old name when the field is cleared', () => {
    const { onRename } = renderPanel();

    fireEvent.change(name(), { target: { value: '  ' } });
    fireEvent.blur(name());

    expect(onRename).not.toHaveBeenCalled();
    expect(name()).toHaveValue('Sprint demo');
  });

  it('renames it when Enter is pressed', async () => {
    const { onRename } = renderPanel();

    await userEvent.clear(name());
    await userEvent.type(name(), 'Attendance take{Enter}');

    expect(onRename).toHaveBeenCalledWith(asset(), 'Attendance take');
  });

  it('lets Escape leave the field without renaming anything', async () => {
    const { onRename } = renderPanel();

    await userEvent.click(name());
    await userEvent.keyboard('{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(name()).toHaveValue('Sprint demo');
    expect(name()).not.toHaveFocus();
  });
});

describe('importing', () => {
  // the file inputs are hidden, so the buttons are the only way to reach them
  it.each`
    button              | input
    ${'Import a video'} | ${'Import a video'}
    ${'Import audio'}   | ${'Import an audio file'}
  `('opens the file picker from $button', async ({ button, input }) => {
    renderPanel();
    const opened = jest.fn();
    screen.getByLabelText(input).addEventListener('click', opened);

    await userEvent.click(screen.getByRole('button', { name: button }));

    expect(opened).toHaveBeenCalled();
  });
});

describe('a source the ingest could not read', () => {
  it('says what went wrong on its card', () => {
    renderPanel({
      assets: [asset({ state: 'failed', error: 'The file has no video' })],
    });

    expect(screen.getByText('The file has no video')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Add to timeline' }),
    ).toBeDisabled();
  });
});

describe('removing a source', () => {
  it('will not remove one the timeline still uses', async () => {
    const { onDelete } = renderPanel({ used: new Set(['asset-a']) });

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Sprint demo' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Remove this source' });
    expect(dialog).toHaveTextContent(
      'Clips on the timeline still use “Sprint demo”. Remove those clips first, then this source can go.',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Remove it' }),
    ).toBeDisabled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('keeps the source when the creator thinks again', async () => {
    const { onDelete } = renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Sprint demo' }),
    );
    await userEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Remove this source' }),
      ).getByRole('button', { name: 'Keep it' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('removes it once confirmed', async () => {
    const { onDelete } = renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Sprint demo' }),
    );
    await userEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Remove this source' }),
      ).getByRole('button', { name: 'Remove it' }),
    );

    expect(onDelete).toHaveBeenCalledWith(asset());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
