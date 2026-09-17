import { CaptureSurface } from '../../schema';
import {
  CapturePlacement,
  fitToFrame,
  toFramePoint,
  viewRatio,
  sharedView,
} from '../geometry';

const frame = { width: 1920, height: 1080 };

// the creator's own first captured event, from a maximised browser on a 1920
// wide screen: the pointer 1129.4 across the page and 680.1 down the screen,
// with 87 pixels of OS bar, tab strip and toolbar above the page
const real: CapturePlacement = {
  x: 1129.4,
  y: 593.1,
  viewportW: 1134,
  viewportH: 943,
  screenX: 1129.4,
  screenY: 680.1,
  screenW: 1920,
  screenH: 1080,
  screenLeft: 0,
  screenTop: 0,
  winX: 0,
  winY: 0,
  winW: 1134,
  winH: 1030,
};

// every fixture below describes a surface the mapping can read, so a view that
// came back undefined is the test itself being wrong
const ratioOf = (event: CapturePlacement, surface: CaptureSurface) => {
  const view = sharedView(event, surface);
  if (!view) {
    throw new Error(`no ${surface} view for this event`);
  }
  return viewRatio(view);
};

const pixels = (
  event: CapturePlacement,
  surface: CaptureSurface,
  into = frame,
) => {
  const point = toFramePoint(event, into, surface);
  return point
    ? { x: point.x * into.width, y: point.y * into.height }
    : undefined;
};

describe('what the recording actually shows', () => {
  // stretching the page across a frame that holds the whole screen threw every
  // effect hundreds of pixels to the right of what it was pointing at
  it('places a whole screen recording by the screen, not the page', () => {
    // the window claims the desktop corner, so the 50 spare vertical pixels
    // are dealt back above it as the compositor's bar; the 786 spare across
    // are another window's half of the screen, not a gap, and stay put
    expect(pixels(real, 'monitor')).toEqual({
      x: expect.closeTo(1129.4, 0),
      y: expect.closeTo(730.1, 0),
    });
  });

  // the creator's own click on a Filters button, from a full width window on a
  // Wayland desktop: the compositor keeps the window under a 26 pixel bar and
  // inside 12 pixel gaps but the browser believes it sits at the corner, so
  // the raw screen numbers point 12 left and 38 above the button the footage
  // shows being clicked
  it('deals the spare screen space back as gaps and bar on Wayland', () => {
    const filters: CapturePlacement = {
      x: 1727,
      y: 154,
      viewportW: 1896,
      viewportH: 909,
      screenX: 1727,
      screenY: 275,
      screenW: 1920,
      screenH: 1080,
      screenLeft: 0,
      screenTop: 0,
      winX: 0,
      winY: 0,
      winW: 1896,
      winH: 1030,
    };
    expect(pixels(filters, 'monitor')).toEqual({
      x: expect.closeTo(1739, 0),
      y: expect.closeTo(313, 0),
    });
  });

  it('trusts a window that truly says where it sits', () => {
    const onX11 = { ...real, winX: 12, winY: 38, screenY: 718.2 };
    expect(pixels(onX11, 'monitor')).toEqual({
      x: expect.closeTo(1129.4, 0),
      y: expect.closeTo(718.2, 0),
    });
  });

  it('is nowhere near the page mapping that used to be used for it', () => {
    const drawn = pixels(real, 'browser');
    expect(drawn?.x).toBeCloseTo(1604, 0);
    expect((drawn?.x ?? 0) - 1129.4).toBeGreaterThan(400);
  });

  it('places a tab recording by the page, because that is all it holds', () => {
    // 1134 by 943 fitted into 16:9 letterboxes down the sides
    expect(pixels(real, 'browser')?.y).toBeCloseTo(593.1 * (1080 / 943), 0);
  });

  it('places a window recording from the window corner', () => {
    const moved = { ...real, winX: 300, winY: 120, winW: 1200, winH: 900 };
    expect(ratioOf(moved, 'window')).toEqual({
      x: (1129.4 - 300) / 1200,
      y: (680.1 - 120) / 900,
    });
  });

  it('follows a window moved or resized part way through a recording', () => {
    const before = { ...real, winX: 0, winY: 0, winW: 1200, winH: 900 };
    const after = { ...before, winX: 600, screenX: (real.screenX ?? 0) + 600 };
    // the same place in the window, wherever the window went
    expect(ratioOf(before, 'window')).toEqual(ratioOf(after, 'window'));
  });
});

describe('working in ratios rather than pixels', () => {
  // both numbers are CSS pixels of one coordinate space, so the display's own
  // resolution and pixel ratio divide straight out
  it('reads a Retina screen exactly as it reads a plain one', () => {
    const retina: CapturePlacement = {
      x: 400,
      y: 300,
      viewportW: 1000,
      viewportH: 700,
      screenX: 378,
      screenY: 245.5,
      screenW: 1512,
      screenH: 982,
      screenLeft: 0,
      screenTop: 0,
    };
    const plain: CapturePlacement = {
      ...retina,
      screenX: 480,
      screenY: 270,
      screenW: 1920,
      screenH: 1080,
    };

    expect(ratioOf(retina, 'monitor')).toEqual({
      x: 0.25,
      y: 0.25,
    });
    expect(ratioOf(plain, 'monitor')).toEqual(ratioOf(retina, 'monitor'));
  });

  it('draws the same place whatever the frame it is rendered into', () => {
    const into = { width: 3840, height: 2160 };
    const small = toFramePoint(real, frame, 'monitor');
    const large = toFramePoint(real, into, 'monitor');
    expect(large).toEqual(small);
  });
});

describe('more than one monitor', () => {
  const onTheLeft: CapturePlacement = {
    x: 100,
    y: 100,
    viewportW: 1200,
    viewportH: 800,
    // the desktop counts from the primary display's corner, so a display to the
    // left of it is at negative coordinates
    screenX: -960,
    screenY: 540,
    screenW: 1920,
    screenH: 1080,
    screenLeft: -1920,
    screenTop: 0,
  };

  it('reads a negative screenX against the display it belongs to', () => {
    expect(ratioOf(onTheLeft, 'monitor')).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it('reads a display placed past the primary one the same way', () => {
    const onTheRight = {
      ...onTheLeft,
      screenX: 1920 + 480,
      screenLeft: 1920,
    };
    expect(ratioOf(onTheRight, 'monitor').x).toBe(0.25);
  });

  // availTop is the corner of the WORK AREA, so on a Mac it is a menu bar down
  // from the corner of the display the recording actually holds
  it('ignores a work area inset when the pointer is on the primary display', () => {
    const macBook: CapturePlacement = {
      x: 400,
      y: 300,
      viewportW: 1200,
      viewportH: 700,
      screenX: 756,
      screenY: 491,
      screenW: 1512,
      screenH: 982,
      screenLeft: 0,
      // the menu bar, which the recording of the whole screen still shows
      screenTop: 25,
    };

    expect(ratioOf(macBook, 'monitor')).toEqual({ x: 0.5, y: 0.5 });
  });

  it('pins to the edge rather than off the frame when the origin is unknown', () => {
    const noOrigin = { ...onTheLeft, screenLeft: undefined };
    expect(ratioOf(noOrigin, 'monitor').x).toBe(0);
  });

  // an external display wider than its own corner leaves a band, here every
  // pointer between 1512 and 1920, that also falls inside the primary display's
  // width; reading that as the primary put each of those 1512 pixels out
  it('reads an external display wider than its own origin against itself', () => {
    const external: CapturePlacement = {
      x: 100,
      y: 400,
      viewportW: 1800,
      viewportH: 900,
      screenX: 1612,
      screenY: 400,
      screenW: 1920,
      screenH: 1080,
      // the MacBook's own 1512 wide display is the primary one
      screenLeft: 1512,
      screenTop: 0,
    };

    expect(ratioOf(external, 'monitor').x).toBeCloseTo((1612 - 1512) / 1920, 6);
  });
});

describe('a maximised window with a taskbar is not a Wayland window', () => {
  // Windows reports exactly what Wayland fabricates: the window at the desktop
  // corner, the screen's own origin at 0, and 40 pixels spare, which here is a
  // taskbar along the bottom rather than a bar the window sits under
  const maximised: CapturePlacement = {
    x: 960,
    y: 500,
    viewportW: 1920,
    viewportH: 947,
    screenX: 960,
    screenY: 500,
    screenW: 1920,
    screenH: 1080,
    screenLeft: 0,
    screenTop: 0,
    winX: 0,
    winY: 0,
    winW: 1920,
    winH: 1040,
  };

  it('leaves a Win32 capture where the pointer said it was', () => {
    expect(
      ratioOf({ ...maximised, platform: 'Win32' }, 'monitor').y,
    ).toBeCloseTo(500 / 1080, 6);
  });

  it('still deals the spare back on Linux', () => {
    expect(
      ratioOf({ ...maximised, platform: 'Linux x86_64' }, 'monitor').y,
    ).toBe(0.5);
  });

  it('still deals the spare back when the platform was never recorded', () => {
    expect(ratioOf(maximised, 'monitor').y).toBe(0.5);
  });
});

describe('a stream captured before the snippet reported the screen', () => {
  const old: CapturePlacement = {
    x: 500,
    y: 400,
    viewportW: 1000,
    viewportH: 800,
  };

  it.each(['browser', 'window', 'monitor'] as const)(
    'falls back to the page it was derived under, asked for %s',
    (surface) => {
      expect(toFramePoint(old, frame, surface)).toEqual(
        toFramePoint(old, frame, 'browser'),
      );
    },
  );

  it('reads a capture with no surface at all as a tab', () => {
    expect(toFramePoint(real, frame)).toEqual(
      toFramePoint(real, frame, 'browser'),
    );
  });
});

describe('the letterbox', () => {
  it('fits the recorded rectangle rather than stretching it', () => {
    const tall: CapturePlacement = {
      x: 0,
      y: 0,
      viewportW: 1000,
      viewportH: 1000,
      screenX: 0,
      screenY: 0,
      screenW: 1000,
      screenH: 1000,
    };
    // a square screen in a 16:9 frame leaves a bar each side
    expect(toFramePoint(tall, frame, 'monitor')?.x).toBeCloseTo(0.2188, 3);
    expect(toFramePoint(tall, frame, 'monitor')?.y).toBe(0);
  });

  it('refuses a frame or a surface with no size', () => {
    expect(
      toFramePoint(real, { width: 0, height: 0 }, 'monitor'),
    ).toBeUndefined();
    expect(
      toFramePoint({ ...real, viewportW: 0, viewportH: 0 }, frame, 'browser'),
    ).toBeUndefined();
  });
});

// the creator's own take of 2026-08-30: the portal handed back the browser
// window minus its top 48 rows while the browser said the whole screen was
// shared, and the old mapping missed the Filters button by tens of pixels
describe('footage that disagrees with the claimed surface', () => {
  const filtersClick: CapturePlacement = {
    x: 1704,
    y: 404,
    viewportW: 1896,
    viewportH: 909,
    devicePixelRatio: 1,
    screenX: 1704,
    screenY: 525,
    screenW: 1920,
    screenH: 1080,
    screenLeft: 0,
    screenTop: 0,
    winX: 0,
    winY: 0,
    winW: 1896,
    winH: 1030,
    platform: 'Linux x86_64',
  };

  it('reads a window-shaped recording as the window, cut at the top', () => {
    const point = toFramePoint(
      filtersClick,
      { width: 1892, height: 982 },
      'monitor',
      { width: 1892, height: 982 },
    );

    // measured in the frame: the click lands on the button at (1704, 477)
    expect((point?.x ?? 0) * 1892).toBeCloseTo(1704, 0);
    expect((point?.y ?? 0) * 982).toBeCloseTo(477, 0);
  });

  it('leaves a recording alone when the footage matches the claim', () => {
    const whole = toFramePoint(
      filtersClick,
      { width: 1920, height: 1080 },
      'monitor',
    );
    const confirmed = toFramePoint(
      filtersClick,
      { width: 1920, height: 1080 },
      'monitor',
      { width: 1920, height: 1080 },
    );

    expect(confirmed).toEqual(whole);
  });
});

// The studio asks for 1920x1080, so on any bigger display the browser hands
// back a scaled copy of whatever it shared. Weighing the footage against the
// claim in pixel counts then missed by hundreds rather than by the eight it
// allowed, and the decoration was never taken off.
describe('footage the browser scaled down before handing it back', () => {
  const gapPx = 12;
  const barPx = 38;
  const output = { width: 1920, height: 1080 };

  // the compositor holds the window under its bar and inside its gaps while the
  // browser insists the window sits at the desktop corner
  const wayland = (screenW: number, screenH: number, dpr: number) => {
    const winW = screenW - 2 * gapPx;
    const winH = screenH - barPx - gapPx;
    const desktop = { x: gapPx + winW * 0.63, y: barPx + winH * 0.41 };
    const event: CapturePlacement = {
      x: 0,
      y: 0,
      viewportW: winW,
      viewportH: winH - 121,
      devicePixelRatio: dpr,
      screenX: desktop.x - gapPx,
      screenY: desktop.y - barPx,
      screenW,
      screenH,
      screenLeft: 0,
      screenTop: 0,
      winX: 0,
      winY: 0,
      winW,
      winH,
      platform: 'Linux x86_64',
    };
    return { winW, winH, desktop, event };
  };

  // a capture is fitted into what the studio asked for rather than stretched,
  // and lands on even dimensions
  const handedBack = (width: number, height: number, scaled: boolean) => {
    const fit = scaled ? Math.min(1, 1920 / width, 1080 / height) : 1;
    const even = (value: number) => Math.round((value * fit) / 2) * 2;
    return { width: even(width), height: even(height) };
  };

  const offBy = (
    got: { x: number; y: number } | undefined,
    want: typeof got,
  ) => {
    if (!got || !want) {
      throw new Error('every fixture here describes a readable surface');
    }
    return Math.max(
      Math.abs(got.x - want.x) * output.width,
      Math.abs(got.y - want.y) * output.height,
    );
  };

  const displays = [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ] as const;

  const sweep = <T>(extra: readonly T[]) =>
    displays.flatMap(([screenW, screenH]) =>
      [1, 2].flatMap((dpr) =>
        [false, true].flatMap((scaled) =>
          extra.map((over) => ({ screenW, screenH, dpr, scaled, over })),
        ),
      ),
    );

  // a fifth of a pixel of quantising, plus the row the even dimensions round
  // away, is all a correct reading can be out by
  const tolerancePx = 1;

  it.each(sweep([41, 48]))(
    'takes a $over row decoration off a $screenW x$screenH capture at dpr $dpr, scaled $scaled',
    ({ screenW, screenH, dpr, scaled, over: cut }) => {
      const { winW, winH, desktop, event } = wayland(screenW, screenH, dpr);
      const source = handedBack(winW * dpr, (winH - cut) * dpr, scaled);
      const want = fitToFrame(
        {
          x: (desktop.x - gapPx) / winW,
          y: (desktop.y - barPx - cut) / (winH - cut),
        },
        { width: winW, height: winH - cut },
        output,
      );

      expect(
        offBy(toFramePoint(event, output, 'monitor', source), want),
      ).toBeLessThanOrEqual(tolerancePx);
    },
  );

  it.each(sweep([0]))(
    'leaves a whole $screenW x$screenH screen at dpr $dpr where it was, scaled $scaled',
    ({ screenW, screenH, dpr, scaled }) => {
      const { desktop, event } = wayland(screenW, screenH, dpr);
      const source = handedBack(screenW * dpr, screenH * dpr, scaled);
      const want = fitToFrame(
        { x: desktop.x / screenW, y: desktop.y / screenH },
        { width: screenW, height: screenH },
        output,
      );

      expect(
        offBy(toFramePoint(event, output, 'monitor', source), want),
      ).toBeLessThanOrEqual(tolerancePx);
    },
  );

  // a window this much taller in proportion than its screen makes a scaled
  // whole-screen capture look, on the window reading alone, like an 82 row
  // decoration; recognising the claim by shape is what rules that out
  it('does not invent a decoration on a scaled whole screen capture', () => {
    const tallWindow: CapturePlacement = {
      x: 0,
      y: 0,
      viewportW: 3640,
      viewportH: 2009,
      devicePixelRatio: 1,
      screenX: 1820,
      screenY: 1065,
      screenW: 3840,
      screenH: 2160,
      screenLeft: 0,
      screenTop: 0,
      winX: 0,
      winY: 0,
      winW: 3640,
      winH: 2130,
      platform: 'Linux x86_64',
    };

    expect(
      toFramePoint(tallWindow, output, 'monitor', {
        width: 1920,
        height: 1080,
      }),
    ).toEqual(toFramePoint(tallWindow, output, 'monitor'));
  });

  it('leaves footage far shorter than the window alone', () => {
    const { event } = wayland(1920, 1080, 1);
    const halved = toFramePoint(event, output, 'monitor', {
      width: 1896,
      height: 500,
    });

    expect(halved).toEqual(toFramePoint(event, output, 'monitor'));
  });
});
