import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC } from 'react';
import { trackHeaders } from '../editorTheme';
import {
  defaultPixelsPerSecond,
  lanePaddingPx,
  maxPixelsPerSecond,
} from '../geometry';
import { useTimelineZoom } from '../useTimelineZoom';

type Resized = (entries: Array<{ contentRect: DOMRectReadOnly }>) => void;

const observers: Array<{
  resized: Resized;
  observed: Element[];
  disconnect: jest.Mock;
}> = [];

// jsdom has no layout, so the observer is stood in for and fed sizes by hand
class TestResizeObserver {
  private readonly entry: (typeof observers)[number];

  constructor(resized: Resized) {
    this.entry = { resized, observed: [], disconnect: jest.fn() };
    observers.push(this.entry);
  }

  observe(element: Element) {
    this.entry.observed.push(element);
  }

  disconnect() {
    this.entry.disconnect();
  }
}

const Zoomable: FC<{
  readonly durationMs: number;
  readonly withShell?: boolean;
}> = ({ durationMs, withShell = true }) => {
  const { shellRef, pixelsPerSecond, zoomIn, zoomOut, zoomToFit } =
    useTimelineZoom(durationMs);
  return (
    <>
      {withShell ? <div ref={shellRef} data-testid="shell" /> : null}
      <output aria-label="Pixels per second">{pixelsPerSecond}</output>
      <button type="button" onClick={zoomIn}>
        Zoom in
      </button>
      <button type="button" onClick={zoomOut}>
        Zoom out
      </button>
      <button type="button" onClick={zoomToFit}>
        Fit
      </button>
    </>
  );
};

const zoomLevel = () =>
  Number(screen.getByLabelText('Pixels per second').textContent);

const setShellWidth = (width: number) => {
  Object.defineProperty(screen.getByTestId('shell'), 'clientWidth', {
    configurable: true,
    get: () => width,
  });
};

const resize = (width?: number) =>
  act(
    () =>
      observers[0]?.resized(
        width === undefined
          ? []
          : [{ contentRect: { width } as DOMRectReadOnly }],
      ),
  );

const shellFor = (laneWidth: number) =>
  laneWidth + trackHeaders + lanePaddingPx;

const original = window.ResizeObserver;

beforeEach(() => {
  observers.length = 0;
  window.ResizeObserver =
    TestResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  window.ResizeObserver = original;
});

describe('useTimelineZoom', () => {
  it('fits the whole demo into the lane once the shell has been measured', () => {
    render(<Zoomable durationMs={10000} />);
    expect(zoomLevel()).toBe(defaultPixelsPerSecond);

    setShellWidth(shellFor(800));
    resize(shellFor(800));

    expect(zoomLevel()).toBe(80);
  });

  it('only fits by itself the first time', () => {
    render(<Zoomable durationMs={10000} />);
    setShellWidth(shellFor(800));
    resize(shellFor(800));

    setShellWidth(shellFor(400));
    resize(shellFor(400));

    expect(zoomLevel()).toBe(80);
  });

  it('waits for a measurement that has a width before it fits', () => {
    render(<Zoomable durationMs={10000} />);
    setShellWidth(shellFor(800));

    resize();

    expect(zoomLevel()).toBe(defaultPixelsPerSecond);
  });

  it('fits again when asked to', async () => {
    render(<Zoomable durationMs={10000} />);
    setShellWidth(shellFor(500));

    await userEvent.click(screen.getByRole('button', { name: 'Fit' }));

    expect(zoomLevel()).toBe(50);
  });

  it('zooms in and out by half as much again each step', async () => {
    render(<Zoomable durationMs={10000} />);

    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(zoomLevel()).toBe(defaultPixelsPerSecond * 1.5);

    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(zoomLevel()).toBe(defaultPixelsPerSecond);
  });

  it('stops zooming in at the closest zoom there is', () => {
    render(<Zoomable durationMs={10000} />);

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    Array.from({ length: 10 }).forEach(() => fireEvent.click(zoomIn));

    expect(zoomLevel()).toBe(maxPixelsPerSecond);
  });

  it('falls back to the default zoom for an empty demo', async () => {
    render(<Zoomable durationMs={0} />);
    setShellWidth(shellFor(800));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

    await userEvent.click(screen.getByRole('button', { name: 'Fit' }));

    expect(zoomLevel()).toBe(defaultPixelsPerSecond);
  });

  it('falls back to the default zoom while there is no shell to measure', async () => {
    render(<Zoomable durationMs={10000} withShell={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));

    await userEvent.click(screen.getByRole('button', { name: 'Fit' }));

    expect(zoomLevel()).toBe(defaultPixelsPerSecond);
    expect(observers).toHaveLength(0);
  });

  it('stops watching the shell once it is gone', () => {
    const { unmount } = render(<Zoomable durationMs={10000} />);
    expect(observers[0]?.observed).toEqual([screen.getByTestId('shell')]);

    unmount();

    expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1);
  });
});
