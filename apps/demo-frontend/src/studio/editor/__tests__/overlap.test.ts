import { Clip, layoutClips } from '@asap-hub/demo-timeline';
import { maxOverlapMs, overlapAfterDrag, overlapHint } from '../overlap';

const source = (
  id: string,
  durationMs: number,
  transitionMs?: number,
): Clip => ({
  kind: 'source',
  id,
  assetId: `asset-${id}`,
  inMs: 0,
  outMs: durationMs,
  volume: 1,
  ...(transitionMs === undefined
    ? {}
    : {
        transitionIn: { type: 'crossfade' as const, durationMs: transitionMs },
      }),
});

const cut = layoutClips([source('a', 4000), source('b', 6000)]);
const blended = layoutClips([source('a', 4000), source('b', 6000, 1000)]);

describe('overlapAfterDrag', () => {
  it('blends the dragged clip into the one before it when pulled left', () => {
    expect(overlapAfterDrag(cut, 1, -1500)).toEqual({
      clipId: 'b',
      durationMs: 1500,
    });
  });

  it('blends into the clip after it when pushed right from a cut', () => {
    expect(overlapAfterDrag(cut, 0, 900)).toEqual({
      clipId: 'b',
      durationMs: 900,
    });
  });

  // one drag touches one join: a clip that already blends gives that back
  // before it starts pushing into whatever comes after it
  it('gives an existing blend back before pushing into the next clip', () => {
    expect(overlapAfterDrag(blended, 1, 400)).toEqual({
      clipId: 'b',
      durationMs: 600,
    });
  });

  it('turns the blend into a cut once it has all been given back', () => {
    expect(overlapAfterDrag(blended, 1, 1000)).toEqual({
      clipId: 'b',
      durationMs: 0,
    });
  });

  it('reads a blend too short to see as a cut', () => {
    expect(overlapAfterDrag(blended, 1, 960)).toEqual({
      clipId: 'b',
      durationMs: 0,
    });
  });

  it('never blends more than half of the shorter clip', () => {
    expect(overlapAfterDrag(cut, 1, -9000)).toEqual({
      clipId: 'b',
      durationMs: 2000,
    });
  });

  it('ignores a drag too small to have been meant', () => {
    expect(overlapAfterDrag(cut, 1, -40)).toBeUndefined();
  });

  it('has nothing to blend with before the first clip', () => {
    expect(overlapAfterDrag(cut, 0, -1500)).toBeUndefined();
  });

  it('has nothing to blend with after the last clip', () => {
    expect(overlapAfterDrag(cut, 1, 1500)).toBeUndefined();
  });

  it('says nothing when the blend would come out where it already is', () => {
    expect(overlapAfterDrag(blended, 1, -9000)?.durationMs).toBe(2000);
    expect(
      overlapAfterDrag(
        layoutClips([source('a', 4000), source('b', 6000, 2000)]),
        1,
        -9000,
      ),
    ).toBeUndefined();
  });

  // every time in the document is a whole millisecond; a fraction is a document
  // the server refuses outright
  it('always lands on a whole millisecond', () => {
    expect(overlapAfterDrag(cut, 1, -1500.4)?.durationMs).toBe(1500);
  });
});

describe('maxOverlapMs', () => {
  it('is half of the shorter of the two clips', () => {
    expect(maxOverlapMs(cut[0]!, cut[1]!)).toBe(2000);
  });

  it('stops at the longest transition the document allows', () => {
    const long = layoutClips([source('a', 40000), source('b', 40000)]);
    expect(maxOverlapMs(long[0]!, long[1]!)).toBe(3000);
  });
});

describe('overlapHint', () => {
  it('reads as a cut when there is no blend left', () => {
    expect(overlapHint(0)).toBe('Cut');
  });

  it('says how long the blend is', () => {
    expect(overlapHint(1500)).toBe('Crossfade 1.5s');
  });
});
