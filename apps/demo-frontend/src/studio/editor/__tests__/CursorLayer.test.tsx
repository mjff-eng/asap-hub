import { act, render } from '@testing-library/react';
import {
  CursorEffect,
  CursorPathPoint,
  defaultCursorColor,
  ZoomView,
} from '@asap-hub/demo-timeline';
import { createRef, Profiler } from 'react';
import CursorLayer, { CursorLayerHandle, rippleMs } from '../CursorLayer';

const ripple: CursorEffect = {
  id: 'effect-1',
  tMs: 1000,
  type: 'ripple',
  point: { x: 0.5, y: 0.5 },
  origin: 'derived',
};

const rippleCount = (tMs: number, offsetMs?: number): number => {
  const { container, unmount } = render(
    <CursorLayer effects={[ripple]} tMs={tMs} offsetMs={offsetMs} />,
  );
  const count = container.querySelectorAll('span').length;
  unmount();
  return count;
};

describe('the cursor layer', () => {
  it('shows a click for as long as the render burns it in', () => {
    expect(rippleCount(1000)).toBe(1);
    expect(rippleCount(1000 + rippleMs)).toBe(1);
    expect(rippleCount(1000 + rippleMs + 1)).toBe(0);
  });

  // the nudge is the whole point of the layer's offset, and the render already
  // applies it, so a capture lined up by hand used to drift only in the preview
  it('moves every click by the layer offset, the way the render does', () => {
    expect(rippleCount(1000, 500)).toBe(0);
    expect(rippleCount(1500, 500)).toBe(1);
  });

  it('shifts a click earlier when the offset is negative', () => {
    expect(rippleCount(600, -400)).toBe(1);
    expect(rippleCount(1000 + rippleMs, -400)).toBe(0);
  });

  // capture times are moments in the footage: trimming the start of a clip
  // used to slide every click late by exactly the trim
  it('keeps a click on its footage moment when the clip start is trimmed', () => {
    const trimmed = (tMs: number): number => {
      const { container, unmount } = render(
        <CursorLayer effects={[ripple]} tMs={tMs} inMs={400} />,
      );
      const count = container.querySelectorAll('span').length;
      unmount();
      return count;
    };
    // the ripple sits at footage 1000ms, which is 600ms into the trimmed clip
    expect(trimmed(600)).toBe(1);
    expect(trimmed(1000)).toBe(1);
    expect(trimmed(600 + rippleMs + 1)).toBe(0);
  });
});

describe('a click the creator is parked on', () => {
  // the ring is a wall clock animation ending on opacity 0, so while paused it
  // used to flash once and vanish: exactly when the creator is looking at it
  const hasRipple = (playing: boolean) => {
    const { container, unmount } = render(
      <CursorLayer effects={[ripple]} tMs={1000} playing={playing} />,
    );
    const found = container.querySelector('[data-testid="cursor-ripple"]');
    unmount();
    return Boolean(found);
  };

  it('holds the ring on screen whether the demo is playing or not', () => {
    expect(hasRipple(false)).toBe(true);
    expect(hasRipple(true)).toBe(true);
  });
});

describe('the colour of a click', () => {
  const ringOf = (color?: string) => {
    const { container, unmount } = render(
      <CursorLayer effects={[{ ...ripple, color }]} tMs={1000} />,
    );
    const found = container.querySelector<HTMLElement>(
      '[data-testid="cursor-ripple"]',
    );
    const border = found?.style.borderColor ?? '';
    const shadow = found?.style.boxShadow ?? '';
    unmount();
    return { border, shadow };
  };

  it('draws the ring in the colour the creator picked', () => {
    expect(ringOf('#ff3b30').border).toBe('#ff3b30');
  });

  it('falls back to the default for a click saved before the picker', () => {
    expect(ringOf().border).toBe(defaultCursorColor);
  });

  // a white ring on a white page is invisible without it
  it('always carries a dark edge, whatever the colour', () => {
    expect(ringOf('#ffffff').shadow).toContain('rgba(0, 0, 0');
  });
});

// evenly spaced along a straight line, so the damping and the curve are no-ops
// and the drawn position is the one the arithmetic says it is
const path: CursorPathPoint[] = [
  { tMs: 0, x: 0.2, y: 0.2 },
  { tMs: 500, x: 0.5, y: 0.5 },
  { tMs: 1000, x: 0.8, y: 0.8 },
];

const pointerAt = (tMs: number, pointer?: string) => {
  const { container, unmount } = render(
    <CursorLayer effects={[]} path={path} tMs={tMs} pointer={pointer} />,
  );
  const found = container.querySelector<HTMLElement>(
    '[data-testid="cursor-pointer"]',
  );
  const state = {
    transform: found?.style.transform ?? '',
    display: found?.style.display ?? '',
    shapes: [...(found?.querySelectorAll('path') ?? [])].map((node) =>
      node.getAttribute('d'),
    ),
  };
  unmount();
  return state;
};

describe('the drawn pointer', () => {
  it('stands where the capture had it', () => {
    expect(pointerAt(500).transform).toBe('translate(50%, 50%)');
  });

  it('runs between two samples rather than jumping between them', () => {
    expect(pointerAt(250).transform).toBe('translate(35%, 35%)');
  });

  // held at the nearest sample it would sit somewhere the creator never put it
  it('is hidden before the capture starts and after it ends', () => {
    expect(pointerAt(-1).display).toBe('none');
    expect(pointerAt(1001).display).toBe('none');
  });

  it('is not drawn at all for a clip with no capture', () => {
    const { container } = render(<CursorLayer effects={[]} />);
    expect(
      container.querySelector('[data-testid="cursor-pointer"]'),
    ).toBeNull();
  });

  it('draws the pointer the layer asked for', () => {
    expect(pointerAt(500, 'ring').shapes[0]).toContain('A150,150');
    expect(pointerAt(500).shapes[0]).toContain('M0,0 L0,750');
  });

  it('falls back to the arrow for a layer saved before the picker', () => {
    expect(pointerAt(500, undefined).shapes).toEqual(
      pointerAt(500, 'arrow').shapes,
    );
  });
});

// the nudge is one control over the whole layer, so whatever it does to a click
// it has to do to the pointer as well, or the two come apart on screen
describe('the nudge against the footage', () => {
  const nudgedPointer = (tMs: number, offsetMs: number) => {
    const { container, unmount } = render(
      <CursorLayer effects={[]} path={path} tMs={tMs} offsetMs={offsetMs} />,
    );
    const found = container.querySelector<HTMLElement>(
      '[data-testid="cursor-pointer"]',
    );
    const state = {
      transform: found?.style.transform ?? '',
      display: found?.style.display ?? '',
    };
    unmount();
    return state;
  };

  it('carries the drawn pointer with it', () => {
    expect(nudgedPointer(500, 0).transform).toBe('translate(50%, 50%)');
    expect(nudgedPointer(750, 250).transform).toBe('translate(50%, 50%)');
    expect(nudgedPointer(250, -250).transform).toBe('translate(50%, 50%)');
  });

  it('moves where the capture starts and ends', () => {
    expect(nudgedPointer(249, 250).display).toBe('none');
    expect(nudgedPointer(250, 250).transform).toBe('translate(20%, 20%)');
    expect(nudgedPointer(1250, 250).transform).toBe('translate(80%, 80%)');
  });

  it('moves a click ring by the same amount', () => {
    expect(rippleCount(1250, 250)).toBe(1);
    expect(rippleCount(1000, 250)).toBe(0);
    expect(rippleCount(750, -250)).toBe(1);
  });
});

describe('following the playhead', () => {
  // the editor sat at 93% of the main thread when every frame was a render, so
  // the pointer is moved by writing to the node and nothing else
  it('moves the pointer without React committing a render', () => {
    const ref = createRef<CursorLayerHandle>();
    const commits: string[] = [];
    const { container } = render(
      <Profiler id="cursor" onRender={(id) => commits.push(id)}>
        <CursorLayer ref={ref} effects={[]} path={path} tMs={0} />
      </Profiler>,
    );
    const node = container.querySelector<HTMLElement>(
      '[data-testid="cursor-pointer"]',
    );
    const mounted = commits.length;

    act(() => {
      ref.current?.setTime(500);
    });

    expect(node?.style.transform).toBe('translate(50%, 50%)');
    expect(commits).toHaveLength(mounted);
  });

  it('hides the pointer as the playhead leaves the capture', () => {
    const ref = createRef<CursorLayerHandle>();
    const { container } = render(
      <CursorLayer ref={ref} effects={[]} path={path} tMs={0} />,
    );
    const node = container.querySelector<HTMLElement>(
      '[data-testid="cursor-pointer"]',
    );

    act(() => {
      ref.current?.setTime(2000);
    });
    expect(node?.style.display).toBe('none');

    act(() => {
      ref.current?.setTime(500);
    });
    expect(node?.style.display).toBe('');
  });
});

describe('a click and a pointer together', () => {
  const click: CursorEffect = {
    id: 'effect-9',
    tMs: 500,
    type: 'ripple',
    point: { x: 0.5, y: 0.5 },
    origin: 'derived',
  };

  it('draws both, with the pointer last so it sits over the ring', () => {
    const { container } = render(
      <CursorLayer effects={[click]} path={path} tMs={500} />,
    );
    const drawn = [...container.querySelectorAll('[data-testid]')].map((node) =>
      node.getAttribute('data-testid'),
    );
    expect(drawn).toEqual(['cursor-ripple', 'cursor-pointer']);
  });
});

// the pointer and the rings used to composite over the frame the zoom had
// already moved, so both sat at the address the picture had before it started
describe('riding a zoom', () => {
  const click: CursorEffect = {
    id: 'effect-z',
    tMs: 0,
    type: 'ripple',
    point: { x: 0.5, y: 0.5 },
    origin: 'derived',
  };

  const held: ZoomView = { scale: 2, focus: { x: 0.25, y: 0.75 } };

  const drawn = (zoomAt?: (tMs: number) => ZoomView) => {
    const { container, unmount } = render(
      <CursorLayer effects={[click]} path={path} tMs={500} zoomAt={zoomAt} />,
    );
    const ring = container.querySelector<HTMLElement>(
      '[data-testid="cursor-ripple"]',
    );
    const state = {
      ring: { left: ring?.style.left ?? '', top: ring?.style.top ?? '' },
      pointer:
        container.querySelector<HTMLElement>('[data-testid="cursor-pointer"]')
          ?.style.transform ?? '',
    };
    unmount();
    return state;
  };

  it('leaves both where the capture put them with no zoom running', () => {
    expect(drawn()).toEqual({
      ring: { left: '50%', top: '50%' },
      pointer: 'translate(50%, 50%)',
    });
  });

  it('carries the pointer and the ring it is over by the same amount', () => {
    // the capture put both at the centre, and 2x about (0.25, 0.75) sends that
    // to (0.75, 0.25)
    expect(drawn(() => held)).toEqual({
      ring: { left: '75%', top: '25%' },
      pointer: 'translate(75%, 25%)',
    });
  });

  it('moves them again as the playhead crosses a ramp', () => {
    const ref = createRef<CursorLayerHandle>();
    let scale = 1;
    const { container } = render(
      <CursorLayer
        ref={ref}
        effects={[click]}
        path={path}
        tMs={500}
        zoomAt={() => ({ scale, focus: { x: 0.25, y: 0.75 } })}
      />,
    );
    const ring = container.querySelector<HTMLElement>(
      '[data-testid="cursor-ripple"]',
    );
    const pointer = container.querySelector<HTMLElement>(
      '[data-testid="cursor-pointer"]',
    );

    scale = 1.5;
    act(() => ref.current?.setTime(500));

    expect(ring?.style.left).toBe('62.5%');
    expect(pointer?.style.transform).toBe('translate(62.5%, 37.5%)');
  });
});

// the creator's own pixel trim: every click and the pointer shift together,
// exactly as the export shifts them
it('shifts a ring by the layer trim', () => {
  const { container, unmount } = render(
    <CursorLayer effects={[ripple]} tMs={1000} alignX={0.1} alignY={-0.05} />,
  );
  const ring = container.querySelector(
    '[data-testid="cursor-ripple"]',
  ) as HTMLElement;

  expect(ring.style.left).toBe('60%');
  expect(ring.style.top).toBe('45%');
  unmount();
});
