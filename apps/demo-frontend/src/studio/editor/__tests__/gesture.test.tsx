import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useState } from 'react';
import { TextField, VolumeField } from '../fields';
import {
  dragGesture,
  fieldGesture,
  GestureProvider,
  useGestures,
} from '../gesture';

const Typing: FC<{
  readonly begin: () => void;
  readonly end: () => void;
}> = ({ begin, end }) => {
  const gesture = useGestures(begin, end);
  const [text, setText] = useState('');
  const [volume, setVolume] = useState(1);
  return (
    <GestureProvider value={gesture}>
      <TextField label="Heading" value={text} onChange={setText} />
      <VolumeField label="Volume" value={volume} onChange={setVolume} />
      {/* the lanes and the stage begin a drag on pointerdown, which is before
          the browser has told the field it lost focus */}
      <button type="button" onPointerDown={() => gesture.begin(dragGesture)}>
        start a drag
      </button>
      <button type="button" onPointerDown={() => gesture.end(dragGesture)}>
        finish the drag
      </button>
    </GestureProvider>
  );
};

const renderTyping = () => {
  const begin = jest.fn();
  const end = jest.fn();
  render(<Typing begin={begin} end={end} />);
  return { begin, end };
};

describe('an inspector field', () => {
  // every keystroke used to be its own undo entry, so two names ate half of the
  // hundred steps the history keeps
  it('is one gesture from the moment it is focused until it is left', async () => {
    const { begin, end } = renderTyping();

    await userEvent.click(screen.getByLabelText('Heading'));
    await userEvent.keyboard('Attendance');

    expect(begin).toHaveBeenCalledTimes(1);
    expect(end).not.toHaveBeenCalled();

    await userEvent.tab();

    expect(end).toHaveBeenCalledTimes(1);
  });

  it('makes one gesture of a whole slider drag', async () => {
    const { begin } = renderTyping();

    await userEvent.click(screen.getByLabelText(/^Volume/));
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');

    expect(begin).toHaveBeenCalledTimes(1);
  });
});

describe('a drag started while a field still has focus', () => {
  // the block takes the pointer before the field is told it lost focus, so the
  // field's blur must not end the drag that has already begun
  it('is not cut short when the field loses focus', async () => {
    const { begin, end } = renderTyping();

    await userEvent.click(screen.getByLabelText('Heading'));
    await userEvent.click(screen.getByRole('button', { name: 'start a drag' }));

    expect(begin).toHaveBeenCalledTimes(2);
    expect(end).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'finish the drag' }),
    );

    expect(end).toHaveBeenCalledTimes(1);
  });

  it('leaves the field gesture unable to end anything once it is over', async () => {
    const { begin, end } = renderTyping();
    const gestureOwner = screen.getByLabelText('Heading');

    await userEvent.click(gestureOwner);
    await userEvent.click(screen.getByRole('button', { name: 'start a drag' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'finish the drag' }),
    );

    expect(begin).toHaveBeenCalledTimes(2);
    expect(end).toHaveBeenCalledTimes(1);
    expect(fieldGesture).not.toEqual(dragGesture);
  });
});
