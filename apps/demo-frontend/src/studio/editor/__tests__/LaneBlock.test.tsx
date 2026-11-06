import { fireEvent, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import LaneBlock, { arrowDeltaMs } from '../LaneBlock';

const renderBlock = (props: Partial<ComponentProps<typeof LaneBlock>> = {}) => {
  const handlers = {
    onSelect: jest.fn(),
    onDragStart: jest.fn(),
    onNudge: jest.fn(),
  };
  render(
    <LaneBlock
      label="Hello"
      name="Banner Hello"
      tone="banner"
      left={0}
      width={200}
      selected={false}
      readOnly={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

const block = () => screen.getByRole('group', { name: 'Banner Hello' });

describe('arrowDeltaMs', () => {
  it('has no step for a key that is not an arrow', () => {
    expect(arrowDeltaMs({ key: 'Home', shiftKey: false })).toBeUndefined();
  });
});

describe('a lane block from the keyboard', () => {
  it('selects the block with Enter', () => {
    const { onSelect, onNudge } = renderBlock();

    fireEvent.keyDown(block(), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onNudge).not.toHaveBeenCalled();
  });

  it('selects the block with Space', () => {
    const { onSelect } = renderBlock();

    fireEvent.keyDown(block(), { key: ' ' });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('moves the block a step along its lane with an arrow', () => {
    const { onNudge } = renderBlock();

    fireEvent.keyDown(block(), { key: 'ArrowLeft' });

    expect(onNudge).toHaveBeenCalledWith('move', -100);
  });

  it('takes a bigger step when Shift is held', () => {
    const { onNudge } = renderBlock();

    fireEvent.keyDown(block(), { key: 'ArrowRight', shiftKey: true });

    expect(onNudge).toHaveBeenCalledWith('move', 1000);
  });

  it('does not move while the project is read only', () => {
    const { onNudge } = renderBlock({ readOnly: true });

    fireEvent.keyDown(block(), { key: 'ArrowRight' });

    expect(onNudge).not.toHaveBeenCalled();
  });

  it('leaves other keys to the page', () => {
    const { onNudge, onSelect } = renderBlock();

    fireEvent.keyDown(block(), { key: 'Tab' });

    expect(onNudge).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
