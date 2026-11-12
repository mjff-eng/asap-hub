import { act, renderHook } from '@testing-library/react';

import { narrowQuery, useIsNarrow } from '../useIsNarrow';

type Listener = (event: { matches: boolean }) => void;

const stubMatchMedia = (matches: boolean) => {
  const listeners = new Set<Listener>();
  const list = {
    matches,
    addEventListener: jest.fn((_type: string, listener: Listener) =>
      listeners.add(listener),
    ),
    removeEventListener: jest.fn((_type: string, listener: Listener) =>
      listeners.delete(listener),
    ),
  };
  window.matchMedia = jest.fn(() => list) as unknown as typeof matchMedia;
  return {
    list,
    change: (next: boolean) =>
      listeners.forEach((listener) => listener({ matches: next })),
  };
};

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

it('reads the narrow query on the first render', () => {
  stubMatchMedia(true);

  const { result } = renderHook(() => useIsNarrow());

  expect(result.current).toBe(true);
  expect(window.matchMedia).toHaveBeenCalledWith(narrowQuery);
});

it('follows the screen as it crosses the breakpoint', () => {
  const { change, list } = stubMatchMedia(false);
  const { result, unmount } = renderHook(() => useIsNarrow());
  expect(result.current).toBe(false);

  act(() => change(true));
  expect(result.current).toBe(true);

  unmount();
  expect(list.removeEventListener).toHaveBeenCalled();
});

it('treats a query it cannot read as a wide screen', () => {
  window.matchMedia = jest.fn(() => ({
    get matches(): boolean {
      throw new Error('not supported');
    },
  })) as unknown as typeof matchMedia;

  const { result } = renderHook(() => useIsNarrow());

  expect(result.current).toBe(false);
});
