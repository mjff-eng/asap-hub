import { Zoom } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ZoomInspector from '../ZoomInspector';

const zoom: Zoom = {
  id: 'zoom-a',
  clipId: 'clip-a',
  startMs: 1000,
  rampInMs: 400,
  holdMs: 1200,
  rampOutMs: 400,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
};

const renderInspector = () => {
  const handlers = { onChange: jest.fn(), onRemove: jest.fn() };
  render(
    <ZoomInspector zoom={zoom} readOnly={false} spanMs={8000} {...handlers} />,
  );
  return handlers;
};

describe('ZoomInspector', () => {
  it('changes how far the zoom goes in', async () => {
    const { onChange } = renderInspector();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Scale' }),
      '3x',
    );

    expect(onChange).toHaveBeenCalledWith({ scale: 3 });
  });

  it('changes where in the clip the zoom starts', async () => {
    const { onChange } = renderInspector();

    const field = screen.getByRole('textbox', { name: /Starts in the clip/ });
    await userEvent.clear(field);
    await userEvent.type(field, '0:02.50{Enter}');

    expect(onChange).toHaveBeenCalledWith({ startMs: 2500 });
  });

  it('aims the zoom from the keyboard', () => {
    const { onChange } = renderInspector();

    fireEvent.change(screen.getByLabelText('% down'), {
      target: { value: '20' },
    });

    expect(onChange).toHaveBeenCalledWith({ focus: { x: 0.5, y: 0.2 } });
  });
});
