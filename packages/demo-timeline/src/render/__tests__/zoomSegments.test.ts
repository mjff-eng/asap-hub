import { Canvas, Zoom } from '../../schema';
import { pictureBox } from '../filters';
import { stillFilters, zoomSpans } from '../zoomSegments';

const canvas: Canvas = { width: 1920, height: 1080, fps: 30 };
const small: Canvas = { width: 1280, height: 720, fps: 30 };

const zoom = (overrides: Partial<Zoom> = {}): Zoom => ({
  id: 'z1',
  clipId: 'clip-1',
  startMs: 2000,
  rampInMs: 400,
  holdMs: 5000,
  rampOutMs: 400,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
  ...overrides,
});

describe('zoomSpans', () => {
  it('cuts a zoom into quiet, ramp, hold, ramp and quiet', () => {
    expect(zoomSpans([zoom()], 12_000)).toEqual([
      { startMs: 0, endMs: 2000, kind: 'quiet' },
      { startMs: 2000, endMs: 2400, kind: 'moving' },
      {
        startMs: 2400,
        endMs: 7400,
        kind: 'still',
        window: { scale: 2, cropX: 0.25, cropY: 0.25 },
      },
      { startMs: 7400, endMs: 7800, kind: 'moving' },
      { startMs: 7800, endMs: 12_000, kind: 'quiet' },
    ]);
  });

  // the moving chain is right at every instant, so anything shorter than a
  // branch is worth stays on it rather than spawning a sliver
  it('folds a sliver into the moving stretch beside it', () => {
    const spans = zoomSpans([zoom({ startMs: 100 })], 12_000);
    expect(spans[0]).toEqual({ startMs: 0, endMs: 500, kind: 'moving' });
  });

  it('reads a hold shared by two zooms as one still window', () => {
    const spans = zoomSpans(
      [
        zoom(),
        zoom({ id: 'z2', startMs: 3000, holdMs: 1000, focus: { x: 1, y: 0 } }),
      ],
      12_000,
    );

    const both = spans.find(
      (span) => span.startMs === 3400 && span.endMs === 4400,
    );
    // gains 1 and 1: scale 3, x = 0.5*(1/2) + 1*(1/2) clipped to 1-1/3
    expect(both?.kind).toBe('still');
    expect(both?.window?.scale).toBe(3);
    expect(both?.window?.cropY).toBe(0.25);
    expect(both?.window?.cropX).toBeCloseTo(2 / 3, 5);
  });

  it('keeps a ramp of one zoom moving through the hold of another', () => {
    const spans = zoomSpans(
      [zoom(), zoom({ id: 'z2', startMs: 3000, holdMs: 1000 })],
      12_000,
    );
    expect(
      spans.find((span) => span.startMs === 3000 && span.endMs === 3400)?.kind,
    ).toBe('moving');
  });

  // a zoom with no ramps begins and ends mid stretch, so two held stretches
  // can touch with different windows; merging them by kind alone rendered
  // one of them through the other's window
  it('never merges two holds that hold different windows', () => {
    const spans = zoomSpans(
      [
        zoom({
          rampInMs: 0,
          rampOutMs: 0,
          startMs: 0,
          holdMs: 10_000,
          scale: 1.5,
          focus: { x: 0.2, y: 0.2 },
        }),
        zoom({
          id: 'z2',
          rampInMs: 0,
          rampOutMs: 0,
          startMs: 3000,
          holdMs: 3000,
          scale: 2,
          focus: { x: 0.8, y: 0.8 },
        }),
      ],
      10_000,
    );

    expect(
      spans.map(({ startMs, endMs, kind }) => [startMs, endMs, kind]),
    ).toEqual([
      [0, 3000, 'still'],
      [3000, 6000, 'still'],
      [6000, 10_000, 'still'],
    ]);
    expect(spans[0]?.window?.scale).toBe(1.5);
    expect(spans[1]?.window?.scale).toBe(2.5);
    expect(spans[2]?.window?.scale).toBe(1.5);
    expect(spans[0]?.window).toEqual(spans[2]?.window);
  });

  it('speaks whole-clip stillness when the ramps are zero', () => {
    const spans = zoomSpans(
      [zoom({ startMs: 0, rampInMs: 0, rampOutMs: 0, holdMs: 12_000 })],
      12_000,
    );
    expect(spans).toEqual([
      {
        startMs: 0,
        endMs: 12_000,
        kind: 'still',
        window: { scale: 2, cropX: 0.25, cropY: 0.25 },
      },
    ]);
  });
});

describe('stillFilters', () => {
  it('cuts the held window out of the source first, then scales up once', () => {
    const filters = stillFilters(
      { scale: 2, cropX: 0.25, cropY: 0.25 },
      canvas,
      canvas,
    );

    expect(filters).toEqual([
      'crop=960:540:480:270',
      'scale=1920:1080:flags=lanczos:out_color_matrix=bt709',
    ]);
  });

  // a capture larger than the canvas is cropped at its own resolution, so a
  // 2x zoom on a 2560x1440 take under a 1280x720 canvas resizes nothing at all
  it('cuts a larger capture at its own resolution', () => {
    expect(
      stillFilters({ scale: 2, cropX: 0.25, cropY: 0.25 }, small, {
        width: 2560,
        height: 1440,
      }),
    ).toEqual([
      'crop=1280:720:640:360',
      'scale=1280:720:flags=lanczos:out_color_matrix=bt709',
    ]);
  });

  // 3024x1964 fits to a 1662x1080 picture at x=128, so at 2x the picture is
  // 3324 wide and a centred window starts 704 into it, clear of both bars
  it('cuts a held window out of a letterboxed capture', () => {
    expect(
      stillFilters(
        { scale: 2, cropX: 0.25, cropY: 0.25 },
        canvas,
        { width: 3024, height: 1964 },
        { pw: 1662, ph: 1080, ox: 128, oy: 0 },
      ),
    ).toEqual([
      'crop=1936:1082:544:400',
      'scale=2128:1190:flags=lanczos:out_color_matrix=bt709',
      'crop=1920:1080:106:100',
    ]);
  });

  // aimed at the left edge the window reaches 256 past the picture, and the
  // trim has to drop the overhang before the pad supplies the bar, or the pad
  // is eaten by pixels that were never in the source
  it('lets the canvas supply the bar the window reaches into', () => {
    expect(
      stillFilters(
        { scale: 2, cropX: 0, cropY: 0.25 },
        canvas,
        { width: 3024, height: 1964 },
        { pw: 1662, ph: 1080, ox: 128, oy: 0 },
      ),
    ).toEqual([
      'crop=1532:1082:0:400',
      'scale=1684:1190:flags=lanczos:out_color_matrix=bt709',
      'crop=1664:1080:0:100',
      'pad=1920:1080:256:0:color=black',
    ]);
  });

  // five held 4x zooms stack to 16x, and aimed at the left edge the whole
  // window lands inside a bar 2048 output pixels wide
  it('still names a rectangle when the window falls inside a bar', () => {
    const filters = stillFilters(
      { scale: 16, cropX: 0, cropY: 0 },
      canvas,
      { width: 3024, height: 1964 },
      { pw: 1662, ph: 1080, ox: 128, oy: 0 },
    );

    expect(filters[filters.length - 1]).toBe(
      'pad=1920:1080:1918:0:color=black',
    );
    expect(filters[0]).toMatch(/^crop=[2-9]/);
  });

  it('never carries the per frame rescale', () => {
    expect(
      stillFilters({ scale: 2, cropX: 0, cropY: 0 }, canvas, canvas).join(','),
    ).not.toContain('eval=frame');
  });
});

// The two chains have to show one picture, or the seam between a ramp and its
// hold jumps. The moving chain rounds against the frame it magnifies to and
// the still chain against the source, so what each one lands on is measured
// here rather than compared as a string.
describe('a held window against the moving chain', () => {
  const even = (value: number): number => value - (value % 2);
  const evenNear = (value: number): number => 2 * Math.round(value / 2);

  // zoom.ts magnifies to an even multiple of the canvas, and ffmpeg's crop
  // rounds its x to a whole pixel of that frame, holds the window inside it,
  // then floors it to an even one for yuv420p
  const magnified = (size: number, scale: number): number =>
    even(Math.floor(size * scale));
  const movingCropAt = (share: number, frame: number, shown: number): number =>
    even(Math.min(Math.max(Math.round(share * frame), 0), frame - shown));

  type MovingAxis = {
    frame: number;
    at: number;
    visible: number;
    barLow: number;
    barHigh: number;
  };

  // What the moving chain puts on one axis of the canvas: the magnified
  // picture, where inside it the window starts, and the black the canvas shows
  // either side when the window reaches past the picture. A letterboxed source
  // writes its crop origin with the even floor spelled out, so the window is
  // floored before it is held inside the frame rather than rounded first.
  const movingAxis = (
    canvasSize: number,
    scale: number,
    share: number,
    box?: { size: number; offset: number },
  ): MovingAxis => {
    const canvasFrame = magnified(canvasSize, scale);
    if (!box) {
      return {
        frame: canvasFrame,
        at: movingCropAt(share, canvasFrame, canvasSize),
        visible: canvasSize,
        barLow: 0,
        barHigh: 0,
      };
    }
    const frame = evenNear((box.size * canvasFrame) / canvasSize);
    const padAt = even(Math.floor((box.offset * frame) / box.size));
    const want =
      Math.min(
        even(Math.floor(share * canvasFrame)),
        canvasFrame - canvasSize,
      ) - padAt;
    const barLow = Math.max(0, -want);
    const barHigh = Math.max(0, want + canvasSize - frame);
    return {
      frame,
      at: Math.max(0, want),
      visible: canvasSize - barLow - barHigh,
      barLow,
      barHigh,
    };
  };

  const numbers = (filter = '', head = 'crop='): number[] =>
    filter.startsWith(head)
      ? filter
          .slice(head.length)
          .split(':')
          .map((part) => Number(part))
      : [];

  // the trim and the bar, whichever positions they took in the chain
  const after = (filters: string[], head: string): number[] => {
    const found = filters.slice(2).find((filter) => filter.startsWith(head));
    return found ? numbers(found, head) : [];
  };

  // what ffmpeg reads out of the emitted chain on one axis, in source pixels
  const shownBy = (filters: string[], axis: 0 | 1) => {
    const cut = numbers(filters[0]);
    const crop = cut[axis] ?? NaN;
    const cropAt = cut[axis + 2] ?? NaN;
    const scaled = numbers(filters[1], 'scale=')[axis] ?? NaN;
    const trim = after(filters, 'crop=');
    const bar = after(filters, 'pad=');
    const showAt = trim[axis + 2] ?? 0;
    const visible = trim[axis] ?? scaled;
    const gain = scaled / crop;
    return {
      at: cropAt + showAt / gain,
      gain,
      crop,
      cropAt,
      scaled,
      showAt,
      visible,
      barLow: bar[axis + 2] ?? 0,
      outer: bar[axis] ?? visible,
    };
  };

  const inputs = [
    undefined,
    { width: 2560, height: 1440 },
    { width: 3840, height: 2160 },
    // the panels the demos are actually recorded on, all of them 16:10
    { width: 2560, height: 1664 },
    { width: 2880, height: 1864 },
    { width: 3024, height: 1964 },
    { width: 3456, height: 2234 },
    { width: 2880, height: 1800 },
    // and one wider than the canvas, so the bars land above and below
    { width: 3440, height: 1440 },
  ];
  // 1.1 is below W/Pw on a 16:10 source, where the window reaches past both
  // edges of the picture at once
  const scales = [1.1, 1.5, 1.7, 2, 2.5, 3, 4];
  // 0.13 and 0.87 straddle the edge of the bar-free range at 2x
  const focuses = [0, 0.13, 0.37, 0.5, 0.87, 1];

  const measure = (
    frame: Canvas,
    input: { width: number; height: number },
    scale: number,
    focus: { x: number; y: number },
  ) => {
    const [span] = zoomSpans(
      [
        zoom({
          startMs: 0,
          rampInMs: 0,
          rampOutMs: 0,
          holdMs: 4000,
          scale,
          focus,
        }),
      ],
      4000,
    );
    const held = span?.window ?? { scale, cropX: 0, cropY: 0 };
    const box = pictureBox(input, frame);
    const letterboxed = box.pw !== frame.width || box.ph !== frame.height;
    const picture = letterboxed ? box : undefined;
    const filters = stillFilters(held, frame, input, picture);

    const axes = ([0, 1] as const).map((axis) => {
      const canvasSize = axis === 0 ? frame.width : frame.height;
      const inputSize = axis === 0 ? input.width : input.height;
      const share = axis === 0 ? held.cropX : held.cropY;
      const want = movingAxis(
        canvasSize,
        held.scale,
        share,
        picture && {
          size: axis === 0 ? picture.pw : picture.ph,
          offset: axis === 0 ? picture.ox : picture.oy,
        },
      );
      const gain = want.frame / inputSize;
      const still = shownBy(filters, axis);
      const barHigh = still.outer - still.barLow - still.visible;
      return {
        gain: still.gain,
        wantGain: gain,
        originPx: Math.abs(still.at - want.at / gain) * gain,
        magnificationPct: (Math.abs(still.gain - gain) / gain) * 100,
        strayed: [
          ...(still.visible === want.visible
            ? []
            : [`shows ${still.visible} of ${want.visible}`]),
          ...(still.barLow === want.barLow
            ? []
            : [`bars ${still.barLow} against ${want.barLow}`]),
          ...(still.visible > 0 ? [] : ['shows nothing']),
          ...(still.barLow % 2 === 0 && barHigh % 2 === 0 && barHigh >= 0
            ? []
            : [`odd bars ${still.barLow} and ${barHigh}`]),
          ...(still.scaled >= still.showAt + still.visible
            ? []
            : [
                `scaled ${still.scaled} short of ${
                  still.showAt + still.visible
                }`,
              ]),
          ...(still.outer === canvasSize
            ? []
            : [`composes to ${still.outer} not ${canvasSize}`]),
          ...([
            still.crop,
            still.cropAt,
            still.scaled,
            still.showAt,
            still.visible,
          ].every((each) => each % 2 === 0)
            ? []
            : ['an odd rectangle']),
          ...(still.cropAt >= 0 && still.cropAt + still.crop <= inputSize
            ? []
            : [`cuts ${still.cropAt}+${still.crop} of ${inputSize}`]),
        ],
      };
    });
    const [across, down] = axes;
    const gotAspect = (across?.gain ?? NaN) / (down?.gain ?? NaN);
    const wantAspect = (across?.wantGain ?? NaN) / (down?.wantGain ?? NaN);

    return {
      where: `${frame.width}x${frame.height} canvas, ${input.width}x${input.height} input, scale ${scale}, focus ${focus.x},${focus.y}`,
      originPx: Math.max(across?.originPx ?? NaN, down?.originPx ?? NaN),
      magnificationPct: Math.max(
        across?.magnificationPct ?? NaN,
        down?.magnificationPct ?? NaN,
      ),
      // The still chain has to hold the MOVING chain's aspect, not a square
      // one: an even picture width tilts the target by up to one part in Pw,
      // and asking the two axes to agree with each other instead reports that
      // faithful tilt as a miss.
      aspectPct: (Math.abs(gotAspect - wantAspect) / wantAspect) * 100,
      strayed: axes.flatMap((axis, at) =>
        (axis?.strayed ?? []).map((why) => `${at === 0 ? 'x' : 'y'}: ${why}`),
      ),
    };
  };

  const measured = [canvas, small].flatMap((frame) =>
    inputs.flatMap((input) =>
      scales.flatMap((scale) =>
        focuses.flatMap((x) =>
          focuses.map((y) => measure(frame, input ?? frame, scale, { x, y })),
        ),
      ),
    ),
  );

  it('sweeps every canvas, input, scale and focus', () => {
    expect(measured).toHaveLength(2 * 9 * 7 * 6 * 6);
  });

  // within one output pixel of the moving chain's origin, a twentieth of a
  // percent of its magnification, and the same aspect the moving chain holds
  it('holds the crop origin, the magnification and the aspect', () => {
    const missed = measured
      .filter(
        ({ originPx, magnificationPct, aspectPct }) =>
          !(originPx <= 1 && magnificationPct <= 0.05 && aspectPct <= 0.05),
      )
      .sort(
        (a, b) =>
          b.originPx - a.originPx || b.magnificationPct - a.magnificationPct,
      );

    expect([
      `${missed.length} of ${measured.length} windows miss the moving chain`,
      ...missed
        .slice(0, 5)
        .map(
          ({ where, originPx, magnificationPct, aspectPct }) =>
            `${where}: origin off ${originPx.toFixed(
              3,
            )}px, magnification off ${magnificationPct.toFixed(
              4,
            )}%, aspect off ${aspectPct.toFixed(4)}%`,
        ),
    ]).toEqual([`0 of ${measured.length} windows miss the moving chain`]);
  });

  // the bars are what a 16:10 source adds, and none of them may eat the
  // picture, leave an odd rectangle or compose to anything but the canvas
  it('shows the whole window and nothing but the canvas', () => {
    const strayed = measured.flatMap(({ where, strayed: why }) =>
      why.map((each) => `${where}: ${each}`),
    );

    expect(strayed.slice(0, 5)).toEqual([]);
    expect(strayed).toHaveLength(0);
  });

  // the window sits hard against the far edge at the largest crop the schema
  // allows, which is where a rounded rectangle runs out of source
  it('keeps every rectangle even and inside the frame it is cut from', () => {
    const strayed = [canvas, small].flatMap((frame) =>
      inputs.flatMap((input) =>
        scales.flatMap((scale) => {
          const size = input ?? frame;
          const share = 1 - 1 / scale;
          const box = pictureBox(size, frame);
          const filters = stillFilters(
            { scale, cropX: share, cropY: share },
            frame,
            size,
            box.pw !== frame.width || box.ph !== frame.height ? box : undefined,
          );
          const [w = NaN, h = NaN, x = NaN, y = NaN] = numbers(filters[0]);
          const [sw = NaN, sh = NaN] = numbers(filters[1], 'scale=');
          const trim = after(filters, 'crop=');
          const [ox = 0, oy = 0] = [trim[2] ?? 0, trim[3] ?? 0];
          const [vw = sw, vh = sh] = [trim[0] ?? sw, trim[1] ?? sh];
          const off =
            [w, h, x, y, sw, sh, ox, oy, vw, vh].some(
              (each) => each % 2 !== 0,
            ) ||
            !(x >= 0 && y >= 0) ||
            !(x + w <= size.width && y + h <= size.height) ||
            !(ox + vw <= sw && oy + vh <= sh);
          return off
            ? [
                `${frame.width}x${frame.height} on ${size.width}x${size.height} at ${scale}`,
              ]
            : [];
        }),
      ),
    );

    expect(strayed).toEqual([]);
  });
});
