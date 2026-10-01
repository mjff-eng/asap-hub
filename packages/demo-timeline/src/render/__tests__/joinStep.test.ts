import { layoutClips } from '../../clips';
import { Canvas, Clip, NarrationClip, SourceClip } from '../../schema';
import {
  buildJoinStep,
  concatListContent,
  hasVisualTransition,
  joinBoundaries,
} from '../joinStep';

const source = (overrides: Partial<SourceClip> = {}): SourceClip => ({
  kind: 'source',
  id: 'clip-1',
  assetId: 'asset-1',
  inMs: 0,
  outMs: 10000,
  volume: 1,
  ...overrides,
});

describe('hasVisualTransition', () => {
  it('is false when every boundary is a cut', () => {
    expect(
      hasVisualTransition(
        layoutClips([source({ id: 'a' }), source({ id: 'b' })]),
      ),
    ).toBe(false);
  });

  it('is false when a crossfade has no duration', () => {
    expect(
      hasVisualTransition(
        layoutClips([
          source({ id: 'a' }),
          source({
            id: 'b',
            transitionIn: { type: 'crossfade', durationMs: 0 },
          }),
        ]),
      ),
    ).toBe(false);
  });

  it('is true as soon as one boundary blends', () => {
    expect(
      hasVisualTransition(
        layoutClips([
          source({ id: 'a' }),
          source({
            id: 'b',
            transitionIn: { type: 'crossfade', durationMs: 500 },
          }),
        ]),
      ),
    ).toBe(true);
  });
});

describe('joinBoundaries', () => {
  it('has no boundary for a single clip', () => {
    expect(joinBoundaries(layoutClips([source()]))).toEqual([]);
  });

  it('offsets each xfade at the incoming clip start, which is where the chain so far ends', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({
        id: 'b',
        outMs: 6000,
        transitionIn: { type: 'crossfade', durationMs: 1000 },
      }),
      source({
        id: 'c',
        outMs: 5000,
        transitionIn: { type: 'slide', durationMs: 500 },
      }),
    ];

    expect(joinBoundaries(layoutClips(clips))).toEqual([
      { index: 1, offsetMs: 3000, durationMs: 1000, transition: 'fade' },
      { index: 2, offsetMs: 8500, durationMs: 500, transition: 'slideleft' },
    ]);
  });

  it('clamps the overlap to half of the shortest neighbour', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({
        id: 'b',
        outMs: 600,
        transitionIn: { type: 'crossfade', durationMs: 2000 },
      }),
    ];

    expect(joinBoundaries(layoutClips(clips))).toEqual([
      { index: 1, offsetMs: 3700, durationMs: 300, transition: 'fade' },
    ]);
  });

  it('reports no duration for a cut between blended clips', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({ id: 'b', outMs: 4000 }),
      source({
        id: 'c',
        outMs: 4000,
        transitionIn: { type: 'crossfade', durationMs: 800 },
      }),
    ];

    expect(joinBoundaries(layoutClips(clips)).map((b) => b.durationMs)).toEqual(
      [0, 800],
    );
  });
});

describe('concatListContent', () => {
  it('writes one line per clip', () => {
    expect(concatListContent(['/work/clip-0.mp4', '/work/clip-1.mp4'])).toBe(
      "file '/work/clip-0.mp4'\nfile '/work/clip-1.mp4'\n",
    );
  });

  it('escapes a quote in a path', () => {
    expect(concatListContent(["/work/o'brien.mp4"])).toBe(
      "file '/work/o'\\''brien.mp4'\n",
    );
  });
});

describe('buildJoinStep, cut only', () => {
  const canvas: Canvas = { width: 1920, height: 1080, fps: 30 };

  const joinOf = (clips: Clip[], narration: NarrationClip[] = []) =>
    buildJoinStep({
      placements: layoutClips(clips),
      canvas,
      narration,
      assets: new Map([
        [
          'voice-1',
          { assetId: 'voice-1', path: '/media/voice-1.m4a', durationMs: 4000 },
        ],
      ]),
      durationMs: 12000,
      workDir: '/work',
      output: '/work/out.mp4',
    });

  const cuts: Clip[] = [
    source({ id: 'a', outMs: 4000 }),
    source({ id: 'b', outMs: 4000 }),
    source({ id: 'c', outMs: 4000 }),
  ];

  // Measured on ffmpeg 9.0.1 with three 4.000s clips, each carrying a 1kHz beep
  // in its first 100ms. `-f concat -c copy` gave video start_time 0.021354 with
  // audio duration 12.021333, the beeps drifting to 4.021354 and 8.021354, and a
  // Non-monotonic DTS clamp at each cut. Rebuilding the audio through the concat
  // filter gives video 0.000000/12.000000, audio 0.000000/12.000000, beeps at
  // 4.000021 and 8.000021 and no clamp: the same numbers the xfade path gives.
  it('rebuilds the audio through the concat filter rather than copying it', () => {
    const args = joinOf(cuts).step.args.join(' ');

    expect(args).toContain('[1:a][2:a][3:a]concat=n=3:v=0:a=1[pa]');
    expect(args).toContain('-map 0:v -map [pa]');
    expect(args).toContain('-c:v copy -c:a aac');
    expect(args).not.toContain('-c:a copy');
  });

  // the demuxer reports the first clip's audio priming as a negative start, and
  // without -copyts ffmpeg rebases the whole input and the copied picture lands
  // 21.35ms late even when no audio is mapped from it
  it('reads the demuxer with -copyts so the copied video keeps its own clock', () => {
    expect(joinOf(cuts).step.args.join(' ')).toContain(
      '-nostdin -y -copyts -f concat -safe 0 -i /work/concat.txt',
    );
  });

  it('opens every clip again for its audio, after the demuxer', () => {
    expect(joinOf(cuts).step.args.join(' ')).toContain(
      '-i /work/concat.txt -i /work/clip-0.mp4 -i /work/clip-1.mp4 -i /work/clip-2.mp4',
    );
  });

  it('mixes narration over the filter built programme audio', () => {
    const args = joinOf(cuts, [
      {
        id: 'take-1',
        assetId: 'voice-1',
        startMs: 1500,
        inMs: 0,
        outMs: 4000,
        volume: 1,
      },
    ]).step.args.join(' ');

    expect(args).toContain('-i /work/clip-2.mp4 -i /media/voice-1.m4a');
    expect(args).toContain('[4:a]atrim=0.000:4.000');
    expect(args).toContain('[pa][n0]amix=inputs=2');
    expect(args).toContain('-map 0:v -map [a]');
  });
});
