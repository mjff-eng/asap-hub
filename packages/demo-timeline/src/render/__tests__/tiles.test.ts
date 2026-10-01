import { layoutClips } from '../../clips';
import { SourceClip, Timeline } from '../../schema';
import { createEmptyTimeline } from '../../document';
import { buildRenderPlan } from '../plan';
import {
  shiftZoomsForTile,
  tilePlacements,
  tileTargetMs,
  zoomTileSpans,
} from '../tiles';
import { RenderAsset } from '../types';

const longClip = (outMs: number): SourceClip => ({
  kind: 'source',
  id: 'clip-long',
  assetId: 'asset-long',
  inMs: 0,
  outMs,
  volume: 1,
});

const longAsset = (durationMs: number): RenderAsset[] => [
  {
    assetId: 'asset-long',
    path: '/media/long.mp4',
    durationMs,
    hasAudio: true,
  },
];

const planFor = (outMs: number, overrides: Partial<Timeline> = {}) =>
  buildRenderPlan({
    timeline: {
      ...createEmptyTimeline(),
      clips: [longClip(outMs)],
      ...overrides,
    },
    assets: longAsset(outMs),
    workDir: '/work',
    output: '/work/out.mp4',
  });

const zoomOn = (startMs: number, holdMs: number): ReturnType<typeof Object> =>
  ({
    id: `z-${startMs}`,
    clipId: 'clip-long',
    startMs,
    rampInMs: 400,
    holdMs,
    rampOutMs: 400,
    focus: { x: 0.5, y: 0.5 },
    scale: 2,
    easing: 'easeInOut' as const,
  }) as const;

describe('zoomTileSpans', () => {
  it('cuts quiet, ramp and hold stretches each worth a process', () => {
    const spans = zoomTileSpans([zoomOn(20_000, 10_000)], 'clip-long', 50_000);

    expect(spans).toEqual([
      { startMs: 0, endMs: 16_400, kind: 'quiet' },
      { startMs: 16_400, endMs: 20_400, kind: 'moving' },
      {
        startMs: 20_400,
        endMs: 30_400,
        kind: 'still',
        window: { scale: 2, cropX: 0.25, cropY: 0.25 },
      },
      { startMs: 30_400, endMs: 34_400, kind: 'moving' },
      { startMs: 34_400, endMs: 50_000, kind: 'quiet' },
    ]);
  });

  // the ramps take the tile they need from the quiet side first, so the
  // held stretch keeps its own cheap chain
  it('grows a ramp out of the quiet beside it, not out of the hold', () => {
    const spans = zoomTileSpans([zoomOn(20_000, 10_000)], 'clip-long', 50_000);
    expect(spans.find((span) => span.kind === 'still')).toMatchObject({
      startMs: 20_400,
      endMs: 30_400,
    });
  });

  // a short clip has nothing worth cutting: everything collapses onto the
  // moving chain, which is exact everywhere, and the clip stays whole
  it('collapses a short clip onto the one moving chain', () => {
    expect(zoomTileSpans([zoomOn(2000, 5000)], 'clip-long', 10_000)).toEqual([
      { startMs: 0, endMs: 10_000, kind: 'moving' },
    ]);
  });

  // a tile is cut with -ss/-to and re-timed by its own fps filter, so a seam
  // inside a frame rounds two ways and costs or repeats that frame
  it('lands every seam on a whole frame of the canvas', () => {
    const spans = zoomTileSpans(
      [
        {
          ...zoomOn(13_077, 5233),
          rampInMs: 367,
          rampOutMs: 367,
        },
      ],
      'clip-long',
      30_000,
      60,
    );

    // a frame is 16.667ms and every document time is a whole millisecond, so
    // a seam lands on the closest millisecond to its frame, never mid frame
    const offFrameMs = (ms: number): number => {
      const frames = (ms * 60) / 1000;
      return Math.abs(frames - Math.round(frames)) * (1000 / 60);
    };
    expect(spans.length).toBeGreaterThan(1);
    spans.forEach(({ startMs, endMs }) => {
      expect(offFrameMs(startMs)).toBeLessThanOrEqual(0.5);
      expect(endMs === 30_000 || offFrameMs(endMs) <= 0.5).toBe(true);
    });
    // the seams still meet, and the run still covers the whole clip
    expect(spans[0]?.startMs).toBe(0);
    expect(spans[spans.length - 1]?.endMs).toBe(30_000);
    expect(spans.slice(1).map(({ startMs }) => startMs)).toEqual(
      spans.slice(0, -1).map(({ endMs }) => endMs),
    );
  });

  it('reads a clip with no zooms as one quiet stretch', () => {
    expect(zoomTileSpans([], 'clip-long', 130_000)).toEqual([
      { startMs: 0, endMs: 130_000, kind: 'quiet' },
    ]);
  });
});

describe('tilePlacements', () => {
  const placementOf = () => {
    const [placement] = layoutClips([longClip(200_000)]);
    if (!placement) {
      throw new Error('expected a placement');
    }
    return placement;
  };
  const assetsOf = (durationMs: number) => {
    const [asset] = longAsset(durationMs);
    if (!asset) {
      throw new Error('expected an asset');
    }
    return new Map([['asset-long', asset]]);
  };

  it('cuts the clip into placements that read as clips of their own', () => {
    const tiles = tilePlacements(
      placementOf(),
      assetsOf(200_000),
      (() => {
        let at = 1;
        return () => {
          at += 1;
          return at;
        };
      })(),
    );

    expect(tiles.map(({ placement: tile }) => tile.clip)).toMatchObject([
      { inMs: 0, outMs: 60_000 },
      { inMs: 60_000, outMs: 120_000 },
      { inMs: 120_000, outMs: 180_000 },
      { inMs: 180_000, outMs: 200_000 },
    ]);
    expect(tiles.map(({ shiftMs }) => shiftMs)).toEqual([
      0, 60_000, 120_000, 180_000,
    ]);
  });

  // a tile that starts past the footage would be an empty input; the last real
  // tile stretches to the clip end and its held tail covers the rest
  it('stops the boundaries at the footage and holds the rest', () => {
    const tiles = tilePlacements(placementOf(), assetsOf(100_000), () => 9);

    const last = tiles[tiles.length - 1]?.placement.clip as SourceClip;
    expect(tiles).toHaveLength(2);
    expect(last.outMs).toBe(200_000);
  });
});

describe('shiftZoomsForTile', () => {
  it('speaks the tile time for the clip and leaves other clips alone', () => {
    const zooms = [
      {
        id: 'z1',
        clipId: 'clip-long',
        startMs: 70_000,
        rampInMs: 400,
        holdMs: 1000,
        rampOutMs: 400,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut' as const,
      },
      {
        id: 'z2',
        clipId: 'other',
        startMs: 500,
        rampInMs: 400,
        holdMs: 1000,
        rampOutMs: 400,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut' as const,
      },
    ];

    const shifted = shiftZoomsForTile(zooms, 'clip-long', 60_000);
    expect(shifted[0]?.startMs).toBe(10_000);
    expect(shifted[1]?.startMs).toBe(500);
  });
});

describe('a tiled plan', () => {
  const plan = planFor(200_000);

  it('feeds the tiles straight into the join when the timeline is all cuts', () => {
    const labels = plan.steps.map(({ label }) => label);
    expect(labels).toEqual([
      'clip 1 (source asset-long)',
      'clip 2 (source asset-long)',
      'clip 3 (source asset-long)',
      'clip 4 (source asset-long)',
      'join 4 clips (concat)',
    ]);
    expect(plan.listFile?.content).toBe(
      [
        "file '/work/clip-1.mp4'\n",
        "file '/work/clip-2.mp4'\n",
        "file '/work/clip-3.mp4'\n",
        "file '/work/clip-4.mp4'\n",
      ].join(''),
    );
    expect(plan.listFiles).toBeUndefined();
  });

  // a crossfade join blends whole clips, so the tiles come back together as
  // the clip file the xfade chain expects
  it('assembles the tiles per clip when a transition needs whole clips', () => {
    const faded = buildRenderPlan({
      timeline: {
        ...createEmptyTimeline(),
        clips: [
          longClip(200_000),
          {
            kind: 'source',
            id: 'clip-next',
            assetId: 'asset-long',
            inMs: 0,
            outMs: 30_000,
            volume: 1,
            transitionIn: { type: 'crossfade', durationMs: 1000 },
          },
        ],
      },
      assets: longAsset(200_000),
      workDir: '/work',
      output: '/work/out.mp4',
    });

    const assemble = faded.steps.find(({ label }) =>
      label.startsWith('assemble'),
    );
    expect(assemble?.output).toBe('/work/clip-0.mp4');
    expect(assemble?.serial).toBe(true);
    const args = assemble?.args.join(' ') ?? '';
    expect(args).toContain('concat=n=4:v=0:a=1');
    expect(args).toContain('-copyts');
    expect(args).toContain('-c:v copy');
    expect(faded.listFiles?.[0]?.content).toContain("file '/work/clip-2.mp4'");
  });

  it('weighs every step for the progress bar', () => {
    expect(plan.steps.every((step) => (step.weightMs ?? 0) > 0)).toBe(true);
  });

  // a zoom on one minute of a long take used to cost the rescale on all of
  // it; now only the two ramps carry the chain, and the hold cuts its fixed
  // window straight out of the source
  it('leaves the per frame rescale to the ramps alone', () => {
    const zoomed = planFor(200_000, {
      zooms: [
        {
          id: 'z1',
          clipId: 'clip-long',
          startMs: 70_000,
          rampInMs: 400,
          holdMs: 20_000,
          rampOutMs: 400,
          focus: { x: 0.5, y: 0.5 },
          scale: 2,
          easing: 'easeInOut',
        },
      ],
    });
    const clipSteps = zoomed.steps.filter(({ label }) =>
      label.startsWith('clip'),
    );
    const moving = clipSteps.filter((step) =>
      step.args.join(' ').includes(',crop=1920:1080:'),
    );
    const still = clipSteps.filter((step) =>
      step.args.join(' ').includes(',crop=960:540:480:270,'),
    );
    expect(clipSteps.length).toBeGreaterThan(4);
    expect(moving).toHaveLength(2);
    expect(still).toHaveLength(1);
    expect(still[0]?.args.join(' ')).not.toContain('eval=frame');
  });

  it('lands a banner only on the tile it plays over', () => {
    const withBanner = planFor(200_000, {
      banners: [
        {
          id: 'banner-1',
          startMs: 70_000,
          durationMs: 5_000,
          preset: 'lowerThird',
          text: 'Second minute',
          position: 'bottom',
          animation: 'fade',
        },
      ],
    });
    const carries = withBanner.steps
      .slice(0, 4)
      .map((step) => step.args.join(' ').includes('banner-0.png'));
    expect(carries).toEqual([false, true, false, false]);
  });

  it('never tiles below the threshold', () => {
    expect(planFor(tileTargetMs).steps.map(({ label }) => label)).toEqual([
      'clip 0 (source asset-long)',
      'join 1 clip (concat)',
    ]);
  });
});
