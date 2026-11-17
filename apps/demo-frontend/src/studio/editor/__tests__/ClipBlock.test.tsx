import { Clip, layoutClips } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { ProjectAsset } from '../../../api/types';
import ClipBlock from '../ClipBlock';

const asset: ProjectAsset = {
  assetId: 'asset-a',
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label: 'Sprint demo',
  durationMs: 12000,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

const clip: Clip = {
  kind: 'source',
  id: 'clip-a',
  assetId: 'asset-a',
  inMs: 0,
  outMs: 4000,
  volume: 1,
};

const [placement] = layoutClips([clip]);

const renderBlock = (props: Partial<ComponentProps<typeof ClipBlock>> = {}) => {
  const handlers = {
    onSelect: jest.fn(),
    onTogglePick: jest.fn(),
    onDragStart: jest.fn(),
    onNudge: jest.fn(),
    onToggleMute: jest.fn(),
  };
  render(
    <ClipBlock
      placement={placement!}
      asset={asset}
      left={0}
      width={400}
      selected={false}
      picked={false}
      canPick
      readOnly={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

const block = () => screen.getByRole('group', { name: /^Sprint demo, / });

describe('a clip block from the keyboard', () => {
  it('selects the clip with Enter', () => {
    const { onSelect, onTogglePick } = renderBlock();

    fireEvent.keyDown(block(), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onTogglePick).not.toHaveBeenCalled();
  });

  it('picks the clip for the download with the modifier and Space', () => {
    const { onSelect, onTogglePick } = renderBlock();

    fireEvent.keyDown(block(), { key: ' ', ctrlKey: true });

    expect(onTogglePick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('neither picks nor selects where there is nothing to pick for', () => {
    const { onSelect, onTogglePick } = renderBlock({ canPick: false });

    fireEvent.keyDown(block(), { key: 'Enter', ctrlKey: true });

    expect(onTogglePick).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('leaves keys other than the arrows to the page on a trim handle', () => {
    const { onNudge } = renderBlock();

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Trim the start of Sprint demo' }),
      { key: 'Home' },
    );

    expect(onNudge).not.toHaveBeenCalled();
  });
});

describe('the mute button on a clip block', () => {
  it('silences the clip without selecting or dragging it', async () => {
    const { onToggleMute, onSelect, onDragStart } = renderBlock();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mute Sprint demo' }),
    );

    expect(onToggleMute).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it('offers to bring the sound back on a muted clip', () => {
    renderBlock({
      placement: { ...placement!, clip: { ...clip, volume: 0 } },
    });

    expect(
      screen.getByRole('button', { name: 'Unmute Sprint demo' }),
    ).toBeInTheDocument();
  });
});
