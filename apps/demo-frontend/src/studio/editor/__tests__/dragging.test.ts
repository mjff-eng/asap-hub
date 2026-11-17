import { spanAfterDrag, trimAfterDrag } from '../dragging';

const span = { startMs: 2000, durationMs: 4000 };

describe('spanAfterDrag', () => {
  it('carries the block along with the pointer', () => {
    expect(
      spanAfterDrag({ ...span, kind: 'move', originMs: 3000 }, 5000),
    ).toEqual({ startMs: 4000, durationMs: 4000 });
  });

  it('never moves a block before the start of the demo', () => {
    expect(spanAfterDrag({ ...span, kind: 'move', originMs: 3000 }, 0)).toEqual(
      { startMs: 0, durationMs: 4000 },
    );
  });

  it('grows the block when the end is dragged right', () => {
    expect(
      spanAfterDrag({ ...span, kind: 'trimEnd', originMs: 6000 }, 9000),
    ).toEqual({ startMs: 2000, durationMs: 7000 });
  });

  it('shrinks the block when the end is dragged left', () => {
    expect(
      spanAfterDrag({ ...span, kind: 'trimEnd', originMs: 6000 }, 4000),
    ).toEqual({ startMs: 2000, durationMs: 2000 });
  });

  it('holds the end still while the start is dragged', () => {
    expect(
      spanAfterDrag({ ...span, kind: 'trimStart', originMs: 2000 }, 3000),
    ).toEqual({ startMs: 3000, durationMs: 3000 });
  });

  it('grows the block when the start is dragged left', () => {
    expect(
      spanAfterDrag({ ...span, kind: 'trimStart', originMs: 2000 }, 500),
    ).toEqual({ startMs: 500, durationMs: 5500 });
  });

  it('keeps the block long enough to still be grabbed', () => {
    const { durationMs } = spanAfterDrag(
      { ...span, kind: 'trimEnd', originMs: 6000 },
      -20000,
      200,
    );
    expect(durationMs).toBe(200);
  });

  // the bug this file exists for: reading the block back each frame added the
  // whole offset again, so an edge could only ever run one way
  it('returns to where it started when the pointer does', () => {
    const drag = { ...span, kind: 'trimEnd' as const, originMs: 6000 };
    [7000, 9000, 12000, 6000].forEach((tMs) => spanAfterDrag(drag, tMs));
    expect(spanAfterDrag(drag, 6000)).toEqual(span);
  });
});

describe('trimAfterDrag', () => {
  const clip = { inMs: 1000, outMs: 5000 };

  it('opens the start of the clip up again when dragged left', () => {
    expect(
      trimAfterDrag({ ...clip, kind: 'trimStart', originMs: 4000 }, 3400),
    ).toEqual({ inMs: 400 });
  });

  it('never trims past the start of the footage', () => {
    expect(
      trimAfterDrag({ ...clip, kind: 'trimStart', originMs: 4000 }, 0),
    ).toEqual({ inMs: 0 });
  });

  it('leaves a clip long enough to see when the start passes the end', () => {
    expect(
      trimAfterDrag({ ...clip, kind: 'trimStart', originMs: 4000 }, 20000),
    ).toEqual({ inMs: 4900 });
  });

  it('extends the end back towards the full length', () => {
    expect(
      trimAfterDrag({ ...clip, kind: 'trimEnd', originMs: 8000 }, 10000),
    ).toEqual({ outMs: 7000 });
  });

  it('pulls the end back in', () => {
    expect(
      trimAfterDrag({ ...clip, kind: 'trimEnd', originMs: 8000 }, 6000),
    ).toEqual({ outMs: 3000 });
  });
});
