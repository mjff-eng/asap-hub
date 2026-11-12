import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PickBar, { maxPickedClips } from '../PickBar';

const renderBar = ({
  count = 2,
  canDownload = true,
  busy = false,
}: {
  count?: number;
  canDownload?: boolean;
  busy?: boolean;
} = {}) => {
  const onDownload = jest.fn();
  render(
    <PickBar
      count={count}
      canDownload={canDownload}
      busy={busy}
      onDownload={onDownload}
      onClear={jest.fn()}
    />,
  );
  return {
    onDownload,
    download: screen.getByRole('button', { name: 'Download these clips' }),
  };
};

describe('the picked clips bar', () => {
  it('counts one clip in the singular', () => {
    renderBar({ count: 1 });

    expect(screen.getByRole('status')).toHaveTextContent('1 clip picked');
  });

  it('starts the download when everything is settled', async () => {
    const { onDownload, download } = renderBar({ count: 3 });

    expect(screen.getByRole('status')).toHaveTextContent('3 clips picked');
    await userEvent.click(download);

    expect(onDownload).toHaveBeenCalled();
  });

  // the server refuses a pick this big, so the bar says so before it is sent
  it('holds back a pick larger than the server takes', () => {
    const { download } = renderBar({ count: maxPickedClips + 1 });

    expect(download).toBeDisabled();
    expect(download).toHaveAttribute(
      'title',
      `Pick at most ${maxPickedClips} clips`,
    );
  });

  it('waits for the last edits to save', () => {
    const { download } = renderBar({ canDownload: false });

    expect(download).toBeDisabled();
    expect(download).toHaveAttribute(
      'title',
      'Waiting for the last edits to save',
    );
  });

  it('waits for an export that is already running', () => {
    const { download } = renderBar({ busy: true });

    expect(download).toBeDisabled();
    expect(download).toHaveAttribute('title', 'An export is already running');
  });
});
