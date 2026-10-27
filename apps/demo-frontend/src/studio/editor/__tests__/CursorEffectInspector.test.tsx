import { CursorEffect } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import CursorEffectInspector from '../CursorEffectInspector';
import { fieldGesture, GestureProvider } from '../gesture';

const effect: CursorEffect = {
  id: 'effect-a',
  tMs: 3000,
  type: 'ripple',
  point: { x: 0.5, y: 0.5 },
  origin: 'manual',
};

const renderInspector = (
  props: Partial<ComponentProps<typeof CursorEffectInspector>> = {},
) => {
  const handlers = { onChange: jest.fn(), onRemove: jest.fn() };
  const gesture = { begin: jest.fn(), end: jest.fn() };
  render(
    <GestureProvider value={gesture}>
      <CursorEffectInspector
        effect={effect}
        readOnly={false}
        {...handlers}
        {...props}
      />
    </GestureProvider>,
  );
  return { ...handlers, gesture };
};

const renderWithCapture = (
  props: Partial<ComponentProps<typeof CursorEffectInspector>> = {},
) => {
  const onChangeAlign = jest.fn();
  const view = renderInspector({
    hasCapture: true,
    onChangePointer: jest.fn(),
    onChangeOffset: jest.fn(),
    onChangeAlign,
    ...props,
  });
  return { ...view, onChangeAlign };
};

describe('the effect itself', () => {
  it('switches between a click highlight and a spotlight', async () => {
    const { onChange } = renderInspector();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Type' }),
      'Spotlight',
    );

    expect(onChange).toHaveBeenCalledWith({ type: 'spotlight' });
  });

  it('reads and writes its time in the clip, not in the footage', async () => {
    const { onChange } = renderInspector({ inMs: 1000, spanMs: 6000 });

    const field = screen.getByRole('textbox', { name: /At, in the clip/ });
    expect(field).toHaveValue('0:02.00');

    await userEvent.clear(field);
    await userEvent.type(field, '0:04.00{Enter}');

    expect(onChange).toHaveBeenCalledWith({ tMs: 5000 });
  });

  it('is placed across the frame by number', () => {
    const { onChange } = renderInspector();

    fireEvent.change(screen.getByLabelText('% across'), {
      target: { value: '25' },
    });

    expect(onChange).toHaveBeenLastCalledWith({ point: { x: 0.25, y: 0.5 } });
  });

  it('says where it came from', () => {
    renderInspector({ effect: { ...effect, origin: 'derived-edited' } });

    expect(
      screen.getByRole('complementary', { name: 'Cursor effect' }),
    ).toHaveTextContent('Captured, then edited here');
  });
});

describe('the drawn pointer', () => {
  it('is not offered without a capture to draw it from', () => {
    renderInspector({ onChangePointer: jest.fn() });

    expect(
      screen.queryByRole('group', { name: 'Pointer' }),
    ).not.toBeInTheDocument();
  });

  it('changes for the whole capture when another one is picked', async () => {
    const onChangePointer = jest.fn();
    renderWithCapture({ onChangePointer });

    await userEvent.click(
      screen.getByRole('button', { name: 'Pointing hand' }),
    );

    expect(onChangePointer).toHaveBeenCalledWith('hand');
  });
});

describe('fine tuning where the capture sits', () => {
  it('starts from no adjustment at all', () => {
    renderWithCapture();

    expect(
      screen.getByLabelText('Whole capture: in step with the video'),
    ).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Across' })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: 'Down' })).toHaveValue(0);
  });

  it('moves every click across by the pixels typed', async () => {
    const { onChangeAlign } = renderWithCapture({ alignYPx: 4 });

    const across = screen.getByRole('spinbutton', { name: 'Across' });
    await userEvent.clear(across);
    await userEvent.type(across, '-12');

    expect(onChangeAlign).toHaveBeenLastCalledWith(-12, 4);
  });

  it('moves every click down by the pixels typed', async () => {
    const { onChangeAlign } = renderWithCapture({ alignXPx: 7 });

    const down = screen.getByRole('spinbutton', { name: 'Down' });
    await userEvent.clear(down);
    await userEvent.type(down, '30');

    expect(onChangeAlign).toHaveBeenLastCalledWith(7, 30);
  });

  it('waits while what has been typed is not a number yet', () => {
    const { onChangeAlign } = renderWithCapture({ alignXPx: 5 });

    const across = screen.getByRole('spinbutton', { name: 'Across' });
    fireEvent.focus(across);
    fireEvent.change(across, { target: { value: '' } });

    expect(onChangeAlign).not.toHaveBeenCalled();
    expect(across).toHaveValue(null);
  });

  it('keeps the adjustment within half a thousand pixels', () => {
    const { onChangeAlign } = renderWithCapture();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Down' }), {
      target: { value: '900' },
    });

    expect(onChangeAlign).toHaveBeenLastCalledWith(0, 500);
  });

  it('is one undoable edit for as long as the field is held', async () => {
    const { gesture } = renderWithCapture();

    await userEvent.click(screen.getByRole('spinbutton', { name: 'Across' }));
    await userEvent.keyboard('1');
    expect(gesture.begin).toHaveBeenCalledWith(fieldGesture);
    expect(gesture.end).not.toHaveBeenCalled();

    await userEvent.click(document.body);
    expect(gesture.end).toHaveBeenCalledWith(fieldGesture);
  });

  it('shows what the document holds once the field is left', async () => {
    renderWithCapture({ alignXPx: 5 });

    const across = screen.getByRole('spinbutton', { name: 'Across' });
    await userEvent.clear(across);
    await userEvent.click(document.body);

    expect(across).toHaveValue(5);
  });

  it('is not offered where the position cannot be changed', () => {
    renderWithCapture({ onChangeAlign: undefined });

    expect(screen.getByLabelText(/^Whole capture/)).toBeInTheDocument();
    expect(
      screen.queryByRole('spinbutton', { name: 'Across' }),
    ).not.toBeInTheDocument();
  });
});
