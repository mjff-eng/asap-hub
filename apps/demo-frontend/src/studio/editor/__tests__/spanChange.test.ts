import { NarrationClip, Zoom } from '@asap-hub/demo-timeline';
import { effectChange, narrationChange, zoomChange } from '../spanChange';

const take: NarrationClip = {
  id: 'take-1',
  assetId: 'audio-1',
  startMs: 1000,
  inMs: 0,
  outMs: 4000,
  volume: 1,
};

describe('narrationChange', () => {
  // sliding a take along the lane used to throw away the start of the
  // recording, because a move was treated as a trim
  it('carries the whole recording when the block is moved', () => {
    expect(
      narrationChange(take, { startMs: 2000, durationMs: 4000 }, 'move', 4000),
    ).toEqual({ startMs: 2000, inMs: 0, outMs: 4000 });
  });

  it('skips into the recording when its start is dragged', () => {
    expect(
      narrationChange(
        take,
        { startMs: 2000, durationMs: 3000 },
        'trimStart',
        4000,
      ),
    ).toEqual({ startMs: 2000, inMs: 1000, outMs: 4000 });
  });

  it('never asks for audio the recording does not have', () => {
    expect(
      narrationChange(
        take,
        { startMs: 1000, durationMs: 9000 },
        'trimEnd',
        4000,
      ),
    ).toEqual({ startMs: 1000, inMs: 0, outMs: 4000 });
  });

  it('leaves the end alone while the length is still unknown', () => {
    expect(
      narrationChange(take, { startMs: 1000, durationMs: 9000 }, 'trimEnd'),
    ).toEqual({ startMs: 1000, inMs: 0, outMs: 9000 });
  });

  it('never skips past the beginning of the recording', () => {
    expect(
      narrationChange(take, { startMs: 0, durationMs: 5000 }, 'trimStart', 4000)
        .inMs,
    ).toBe(0);
  });
});

describe('zoomChange', () => {
  const zoom: Zoom = {
    id: 'zoom-1',
    clipId: 'clip-1',
    startMs: 1000,
    rampInMs: 400,
    holdMs: 1200,
    rampOutMs: 400,
    focus: { x: 0.5, y: 0.5 },
    scale: 2,
    easing: 'easeInOut',
  };

  it('converts programme time back to the clip it belongs to', () => {
    expect(zoomChange(zoom, { startMs: 5000, durationMs: 2000 }, 4000)).toEqual(
      { startMs: 1000, holdMs: 1200 },
    );
  });

  it('lengthens the hold and leaves the ramps their shape', () => {
    expect(zoomChange(zoom, { startMs: 5000, durationMs: 4000 }, 4000)).toEqual(
      { startMs: 1000, holdMs: 3200 },
    );
  });

  it('cannot be dragged shorter than its own ramps', () => {
    expect(
      zoomChange(zoom, { startMs: 5000, durationMs: 100 }, 4000).holdMs,
    ).toBe(0);
  });

  it('never starts before the clip it is anchored to', () => {
    expect(
      zoomChange(zoom, { startMs: 1000, durationMs: 2000 }, 4000).startMs,
    ).toBe(0);
  });
});

describe('effectChange', () => {
  // the dot is placed in programme time and stored against its clip, so a drag
  // that did not convert would move the effect onto another clip's clock
  it('converts programme time back to the clip it belongs to', () => {
    expect(effectChange({ startMs: 5000, durationMs: 0 }, 4000, 6000)).toEqual({
      tMs: 1000,
    });
  });

  // a fractional millisecond is rejected by the server, and every later save
  // of the project fails with it
  it('lands on a whole millisecond', () => {
    expect(
      effectChange({ startMs: 5400.6, durationMs: 0 }, 4000, 6000),
    ).toEqual({ tMs: 1401 });
  });

  it('never moves earlier than the clip starts', () => {
    expect(effectChange({ startMs: 1000, durationMs: 0 }, 4000, 6000)).toEqual({
      tMs: 0,
    });
  });

  it('never moves past the end of the clip', () => {
    expect(effectChange({ startMs: 20000, durationMs: 0 }, 4000, 6000)).toEqual(
      {
        tMs: 6000,
      },
    );
  });
});
