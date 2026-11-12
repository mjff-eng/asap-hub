import { layoutClips } from '../../clips';
import { Canvas, Clip, SourceClip, Transition } from '../../schema';
import { gopFrames } from '../encoding';
import { clipCuts, joinPieces } from '../joinPieces';

const canvas: Canvas = { width: 1920, height: 1080, fps: 30 };

const source = (overrides: Partial<SourceClip> = {}): SourceClip => ({
  kind: 'source',
  id: 'clip-1',
  assetId: 'asset-1',
  inMs: 0,
  outMs: 10000,
  volume: 1,
  ...overrides,
});

const crossfade = (durationMs = 500): Transition => ({
  type: 'crossfade',
  durationMs,
});

const blended = (count: number, at: (index: number) => boolean): Clip[] =>
  Array.from({ length: count }, (_unused, index) =>
    source({
      id: `c${index}`,
      ...(index > 0 && at(index) ? { transitionIn: crossfade() } : {}),
    }),
  );

const piecesOf = (clips: Clip[], on: Canvas = canvas) =>
  joinPieces(layoutClips(clips), on, '/work');

const cutsOf = (clips: Clip[], fps: number = canvas.fps) =>
  clipCuts(layoutClips(clips), fps);

const argsOf = (clips: Clip[], output: string): string =>
  piecesOf(clips)
    ?.steps.find((step) => step.output === output)
    ?.args.join(' ') ?? '';

describe('clipCuts', () => {
  it('copies a clip no transition touches from end to end', () => {
    expect(cutsOf(blended(2, () => false))).toEqual([
      { totalFrames: 300, fromFrame: 0, toFrame: 300 },
      { totalFrames: 300, fromFrame: 0, toFrame: 300 },
    ]);
  });

  // the copy has to open on a keyframe and, because ffmpeg cuts a copy in
  // decode order, close on one too
  it('pulls both ends of a blended clip back to the keyframe grid', () => {
    cutsOf(blended(3, () => true)).forEach((cut) => {
      expect(cut.fromFrame % gopFrames).toBe(0);
      expect(cut.toFrame % gopFrames).toBe(0);
    });
  });

  it('leaves the head of the first clip and the tail of the last alone', () => {
    const cuts = cutsOf(blended(3, () => true));

    expect(cuts[0]?.fromFrame).toBe(0);
    expect(cuts.at(-1)?.toFrame).toBe(300);
  });

  it('holds the grid at every canvas rate', () => {
    [24, 30, 60].forEach((fps) => {
      cutsOf(
        blended(3, () => true),
        fps,
      ).forEach((cut) => {
        expect(cut.fromFrame % gopFrames).toBe(0);
        expect(cut.toFrame % gopFrames).toBe(0);
      });
    });
  });

  // what the join is for: every frame is either copied once or blended once,
  // and the pieces add up to the programme the layout describes
  it('accounts for every frame of the programme exactly once', () => {
    const clips = blended(4, (index) => index !== 2);
    const placements = layoutClips(clips);
    const cuts = cutsOf(clips);
    const copied = cuts.reduce(
      (sum, cut) => sum + cut.toFrame - cut.fromFrame,
      0,
    );
    const blends = placements.reduce((sum, placement, index) => {
      const previous = cuts[index - 1];
      const cut = cuts[index];
      if (!previous || !cut || placement.overlapMs === 0) {
        return sum;
      }
      return (
        sum +
        (previous.totalFrames - previous.toFrame) +
        cut.fromFrame -
        (placement.overlapMs * canvas.fps) / 1000
      );
    }, 0);

    expect(copied + blends).toBe(
      ((placements.at(-1)?.endMs ?? 0) * canvas.fps) / 1000,
    );
  });
});

describe('clipCuts of a clip assembled from tiles', () => {
  // clip 1 was encoded as three tiles, so its keyframes restart at 3.5s and
  // at 7.1s rather than running on the plain two second grid
  const tiled = new Map([[1, [0, 3500, 7100]]]);
  const cutsOfTiled = (clips: Clip[]) =>
    clipCuts(layoutClips(clips), canvas.fps, tiled);

  it('opens the copy at the tile that follows the blend', () => {
    const cuts = cutsOfTiled([
      source({ id: 'a' }),
      source({ id: 'b', transitionIn: crossfade(3000) }),
    ]);

    expect(cuts[1]?.fromFrame).toBe(105);
  });

  it('closes the copy at the last keyframe the tiles actually carry', () => {
    const cuts = cutsOfTiled([
      source({ id: 'a' }),
      source({ id: 'b', outMs: 8000 }),
      source({ id: 'c', transitionIn: crossfade() }),
    ]);

    // 8.000s less the 0.500s blend is 225 frames; the last tile began at 213
    expect(cuts[1]?.toFrame).toBe(213);
  });

  it('never cuts where no tile put a keyframe', () => {
    const cuts = cutsOfTiled([
      source({ id: 'a' }),
      source({ id: 'b', transitionIn: crossfade() }),
      source({ id: 'c', transitionIn: crossfade() }),
    ]);
    const keyframes = [0, 60, 105, 165, 213, 273];

    expect(keyframes).toContain(cuts[1]?.fromFrame);
    expect(keyframes).toContain(cuts[1]?.toFrame);
  });
});

describe('joinPieces', () => {
  it('re-encodes one boundary of a long programme and copies the rest', () => {
    const pieces = piecesOf(blended(6, (index) => index === 3));

    expect(pieces?.paths).toEqual([
      '/work/clip-0.mp4',
      '/work/clip-1.mp4',
      '/work/piece-2.mp4',
      '/work/blend-3.mp4',
      '/work/piece-3.mp4',
      '/work/clip-4.mp4',
      '/work/clip-5.mp4',
    ]);
    expect(
      pieces?.steps.filter((step) => step.args.includes('libx264')),
    ).toHaveLength(1);
  });

  it('blends every boundary when every boundary blends', () => {
    const pieces = piecesOf(blended(4, () => true));

    expect(pieces?.paths).toEqual([
      '/work/piece-0.mp4',
      '/work/blend-1.mp4',
      '/work/piece-1.mp4',
      '/work/blend-2.mp4',
      '/work/piece-2.mp4',
      '/work/blend-3.mp4',
      '/work/piece-3.mp4',
    ]);
  });

  it('blends the very first boundary', () => {
    expect(piecesOf(blended(3, (index) => index === 1))?.paths).toEqual([
      '/work/piece-0.mp4',
      '/work/blend-1.mp4',
      '/work/piece-1.mp4',
      '/work/clip-2.mp4',
    ]);
  });

  it('blends the very last boundary', () => {
    expect(piecesOf(blended(3, (index) => index === 2))?.paths).toEqual([
      '/work/clip-0.mp4',
      '/work/piece-1.mp4',
      '/work/blend-2.mp4',
      '/work/piece-2.mp4',
    ]);
  });

  // a clip whose two blends would need the same frames cannot be segmented
  it('gives up on a clip too short to hold both its blends', () => {
    expect(
      piecesOf([
        source({ id: 'a' }),
        source({ id: 'b', outMs: 2000, transitionIn: crossfade() }),
        source({ id: 'c', transitionIn: crossfade() }),
      ]),
    ).toBeUndefined();
  });

  it('segments the same clip once the keyframe grid fits inside it', () => {
    expect(
      piecesOf([
        source({ id: 'a' }),
        source({ id: 'b', outMs: 5000, transitionIn: crossfade() }),
        source({ id: 'c', transitionIn: crossfade() }),
      ]),
    ).toBeDefined();
  });

  it('reads the blend off both clips and lays the transition at the lead in', () => {
    expect(
      argsOf(
        blended(2, () => true),
        '/work/blend-1.mp4',
      ),
    ).toContain(
      '-accurate_seek -ss 8.000 -i /work/clip-0.mp4 -t 2.000 -i /work/clip-1.mp4',
    );
    expect(
      argsOf(
        blended(2, () => true),
        '/work/blend-1.mp4',
      ),
    ).toContain('xfade=transition=fade:duration=0.500:offset=1.500');
  });

  it('carries the transition the clip asked for into the blend', () => {
    const args = argsOf(
      [
        source({ id: 'a' }),
        source({ id: 'b', transitionIn: { type: 'slide', durationMs: 500 } }),
      ],
      '/work/blend-1.mp4',
    );

    expect(args).toContain('xfade=transition=slideleft');
  });

  // a copied piece carries no audio to fall out of step: the join rebuilds the
  // programme audio from the clips themselves
  it('copies the picture alone, seeking only where the head is blended', () => {
    const clips = blended(3, (index) => index === 2);

    expect(argsOf(clips, '/work/piece-1.mp4')).toBe(
      '-nostdin -y -i /work/clip-1.mp4 -map 0:v -frames:v 240 -c copy -movflags +faststart /work/piece-1.mp4',
    );
    expect(argsOf(clips, '/work/piece-2.mp4')).toBe(
      '-nostdin -y -ss 2.000 -i /work/clip-2.mp4 -map 0:v -c copy -movflags +faststart /work/piece-2.mp4',
    );
  });

  it('bills a copy at a twentieth of an encode and a blend at its length', () => {
    const steps = piecesOf(blended(2, () => true))?.steps ?? [];

    expect(steps.map((step) => [step.output, step.weightMs])).toEqual([
      ['/work/piece-0.mp4', 400],
      ['/work/blend-1.mp4', 3500],
      ['/work/piece-1.mp4', 400],
    ]);
  });

  it('runs every piece after the pool, in the order the join reads them', () => {
    expect(
      piecesOf(blended(3, () => true))?.steps.every((step) => step.serial),
    ).toBe(true);
  });
});
