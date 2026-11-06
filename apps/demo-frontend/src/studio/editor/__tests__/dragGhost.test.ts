import { render, renderHook, screen } from '@testing-library/react';
import { createElement, FC } from 'react';
import { DragGhost, useDragGhost } from '../dragGhost';

const box = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const placed = (label: string, rect: DOMRect): HTMLElement => {
  const element = document.createElement('div');
  element.setAttribute('aria-label', label);
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  return element;
};

const renderGhost = (): DragGhost => {
  let ghost: DragGhost | undefined;
  const Lane: FC = () => {
    ghost = useDragGhost();
    return createElement('div', {
      ref: ghost.ref,
      'data-testid': 'ghost',
      hidden: true,
    });
  };
  render(createElement(Lane));
  if (!ghost) throw new Error('the lane did not render');
  return ghost;
};

describe('useDragGhost', () => {
  it('stands over the block it copies and says where it will land', () => {
    const ghost = renderGhost();
    const lane = placed('lane', box(100, 50, 1000, 200));
    const block = placed('Banner Hello', box(300, 60, 120, 30));

    ghost.show(block, lane);
    ghost.move(40.4, '0:04.00');

    expect(screen.getByTestId('ghost')).toBeVisible();
    expect(screen.getByTestId('ghost')).toHaveTextContent(
      'Banner Hello · 0:04.00',
    );
  });

  it('stays hidden when it is moved before it has been shown', () => {
    const ghost = renderGhost();

    ghost.move(80, '0:02.00');

    expect(screen.getByTestId('ghost')).not.toBeVisible();
    expect(screen.getByTestId('ghost')).toHaveTextContent('');
  });

  it('clears what it said when it is hidden', () => {
    const ghost = renderGhost();
    ghost.show(
      placed('Zoom 2x', box(10, 10, 50, 20)),
      placed('lane', box(0, 0, 500, 100)),
    );

    ghost.hide();

    expect(screen.getByTestId('ghost')).not.toBeVisible();
    expect(screen.getByTestId('ghost')).toHaveTextContent('');
  });

  it('does nothing while there is no ghost element on the page', () => {
    const { result } = renderHook(() => useDragGhost());
    const block = placed('Banner Hello', box(300, 60, 120, 30));
    const lane = placed('lane', box(100, 50, 1000, 200));

    expect(() => {
      result.current.show(block, lane);
      result.current.move(40, '0:04.00');
      result.current.hide();
    }).not.toThrow();
    expect(result.current.ref.current).toBeNull();
  });
});
