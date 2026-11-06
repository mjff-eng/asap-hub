import { act, renderHook } from '@testing-library/react';
import { createRef, RefObject } from 'react';
import { useFullscreen } from '../useFullscreen';

// jsdom has no Fullscreen API, so the browser's side of it is stood in for:
// which element holds the screen, and the two calls that change it
let fullscreenElement: Element | null = null;
let fullscreenEnabled = true;
const exitFullscreen = jest.fn(() => Promise.resolve());

beforeEach(() => {
  fullscreenElement = null;
  fullscreenEnabled = true;
  exitFullscreen.mockClear();
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    get: () => fullscreenEnabled,
  });
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: exitFullscreen,
  });
});

afterEach(() => {
  Reflect.deleteProperty(document, 'fullscreenElement');
  Reflect.deleteProperty(document, 'fullscreenEnabled');
  Reflect.deleteProperty(document, 'exitFullscreen');
});

const theatre = (
  requestFullscreen?: () => Promise<void>,
): RefObject<HTMLDivElement> => {
  const ref = createRef<HTMLDivElement>();
  const element = document.createElement('div');
  if (requestFullscreen) {
    element.requestFullscreen = requestFullscreen;
  }
  (ref as { current: HTMLDivElement }).current = element;
  return ref;
};

const browserSwitches = (to: Element | null) =>
  act(() => {
    fullscreenElement = to;
    document.dispatchEvent(new Event('fullscreenchange'));
  });

describe('useFullscreen', () => {
  it('says whether the browser allows fullscreen at all', () => {
    expect(renderHook(() => useFullscreen(theatre())).result.current).toEqual(
      expect.objectContaining({ supported: true, active: false }),
    );

    fullscreenEnabled = false;
    expect(
      renderHook(() => useFullscreen(theatre())).result.current.supported,
    ).toBe(false);
  });

  it('asks for the theatre to fill the screen', () => {
    const requestFullscreen = jest.fn(() => Promise.resolve());
    const ref = theatre(requestFullscreen);
    const { result } = renderHook(() => useFullscreen(ref));

    act(() => result.current.toggle());

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('follows the browser into and out of fullscreen', () => {
    const ref = theatre(jest.fn(() => Promise.resolve()));
    const { result } = renderHook(() => useFullscreen(ref));

    browserSwitches(ref.current);
    expect(result.current.active).toBe(true);

    // leaving with Escape is the browser's doing, and has to be seen too
    browserSwitches(null);
    expect(result.current.active).toBe(false);
  });

  it('is not active when something else holds the screen', () => {
    const ref = theatre(jest.fn(() => Promise.resolve()));
    const { result } = renderHook(() => useFullscreen(ref));

    browserSwitches(document.createElement('video'));

    expect(result.current.active).toBe(false);
  });

  it('leaves fullscreen when toggled while in it', () => {
    const requestFullscreen = jest.fn(() => Promise.resolve());
    const ref = theatre(requestFullscreen);
    const { result } = renderHook(() => useFullscreen(ref));
    browserSwitches(ref.current);

    act(() => result.current.toggle());

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it('shrugs off a browser that refuses', async () => {
    const requestFullscreen = jest.fn(() =>
      Promise.reject(new Error('Permissions check failed')),
    );
    const ref = theatre(requestFullscreen);
    const { result } = renderHook(() => useFullscreen(ref));

    await act(async () => result.current.toggle());

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.active).toBe(false);
  });

  it('does nothing on an element that cannot go fullscreen', () => {
    const { result } = renderHook(() => useFullscreen(theatre()));

    expect(() => act(() => result.current.toggle())).not.toThrow();
    expect(result.current.active).toBe(false);
  });

  it('stops listening once unmounted', () => {
    const add = jest.spyOn(document, 'addEventListener');
    const remove = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useFullscreen(theatre()));
    const listener = add.mock.calls.find(
      ([type]) => type === 'fullscreenchange',
    )?.[1];

    unmount();

    expect(listener).toBeDefined();
    expect(remove).toHaveBeenCalledWith('fullscreenchange', listener);
    add.mockRestore();
    remove.mockRestore();
  });
});
