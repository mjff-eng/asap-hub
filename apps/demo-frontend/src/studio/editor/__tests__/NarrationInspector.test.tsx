import { NarrationClip } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectAsset } from '../../../api/types';
import NarrationInspector from '../NarrationInspector';

const take: NarrationClip = {
  id: 'take-a',
  assetId: 'audio-a',
  startMs: 1000,
  inMs: 500,
  outMs: 4000,
  volume: 1,
};

const audio: ProjectAsset = {
  assetId: 'audio-a',
  kind: 'audio',
  state: 'ready',
  mimeType: 'audio/webm',
  label: 'Intro voice over',
  durationMs: 9000,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

const renderInspector = () => {
  const handlers = { onChange: jest.fn(), onRemove: jest.fn() };
  render(
    <NarrationInspector
      narration={take}
      asset={audio}
      readOnly={false}
      {...handlers}
    />,
  );
  return handlers;
};

const typeTime = async (name: RegExp, value: string) => {
  const field = screen.getByRole('textbox', { name });
  await userEvent.clear(field);
  await userEvent.type(field, `${value}{Enter}`);
};

describe('NarrationInspector', () => {
  it('uses more of the recording from its start', async () => {
    const { onChange } = renderInspector();

    await typeTime(/Trim start/, '0:00.00');

    expect(onChange).toHaveBeenCalledWith({ inMs: 0 });
  });

  it('uses more of the recording towards its end', async () => {
    const { onChange } = renderInspector();

    await typeTime(/Trim end/, '0:08.00');

    expect(onChange).toHaveBeenCalledWith({ outMs: 8000 });
  });

  it('turns the voice over down', () => {
    const { onChange } = renderInspector();

    fireEvent.change(screen.getByLabelText('Volume 100%'), {
      target: { value: '0.5' },
    });

    expect(onChange).toHaveBeenCalledWith({ volume: 0.5 });
  });
});
