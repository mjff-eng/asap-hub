import { layoutClips, TitleClip } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TitleCardInspector from '../TitleCardInspector';

const clip: TitleClip = {
  kind: 'title',
  id: 'title-a',
  durationMs: 3000,
  preset: 'centered',
  text: 'Intro',
};

const [placement] = layoutClips([clip]);

const renderInspector = () => {
  const handlers = { onChange: jest.fn(), onRemove: jest.fn() };
  render(
    <TitleCardInspector
      placement={placement!}
      clip={clip}
      readOnly={false}
      {...handlers}
    />,
  );
  return handlers;
};

describe('TitleCardInspector', () => {
  it('changes the heading', async () => {
    const { onChange } = renderInspector();

    await userEvent.type(screen.getByLabelText('Heading'), 's');

    expect(onChange).toHaveBeenCalledWith({ text: 'Intros' });
  });

  it('adds a subtitle to a card that had none', async () => {
    const { onChange } = renderInspector();

    await userEvent.type(screen.getByLabelText('Subtitle'), 'B');

    expect(onChange).toHaveBeenCalledWith({ subtitle: 'B' });
  });

  it('changes how long the text takes to fade in and out', () => {
    const { onChange } = renderInspector();

    fireEvent.change(screen.getByLabelText(/^Text fades in over/), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText(/^Text fades out over/), {
      target: { value: '150' },
    });

    expect(onChange).toHaveBeenCalledWith({ fadeInMs: 1000 });
    expect(onChange).toHaveBeenCalledWith({ fadeOutMs: 150 });
  });
});
