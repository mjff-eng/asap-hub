import { createEmptyTimeline } from '../../document';
import {
  Banner,
  Clip,
  CursorEffect,
  CursorLayer,
  NarrationClip,
  SourceClip,
  Timeline,
  TitleClip,
  Zoom,
} from '../../schema';
import { maxBannerOverlays, maxCursorOverlays } from '../clipSteps';
import { buildRenderPlan, describePlan, renderDurationMs } from '../plan';
import { RenderAsset } from '../types';

const assets: RenderAsset[] = [
  {
    assetId: 'asset-1',
    path: '/media/asset-1.mp4',
    durationMs: 60000,
    width: 1920,
    height: 1080,
    fps: 30,
    hasAudio: true,
  },
  {
    assetId: 'asset-2',
    path: '/media/asset-2.mp4',
    durationMs: 60000,
    hasAudio: true,
  },
  { assetId: 'unprobed-1', path: '/media/unprobed-1.webm', durationMs: 60000 },
  {
    assetId: 'silent-1',
    path: '/media/silent-1.mp4',
    durationMs: 60000,
    hasAudio: false,
  },
  { assetId: 'voice-1', path: '/media/voice-1.m4a', durationMs: 20000 },
  // the 16:10 panel most of these demos are recorded on: the canvas fit
  // letterboxes it, so the zoom has bars to reckon with
  {
    assetId: 'wide-1',
    path: '/media/wide-1.mp4',
    durationMs: 60000,
    width: 3024,
    height: 1964,
    fps: 30,
    hasAudio: true,
  },
];

const source = (overrides: Partial<SourceClip> = {}): SourceClip => ({
  kind: 'source',
  id: 'clip-1',
  assetId: 'asset-1',
  inMs: 0,
  outMs: 10000,
  volume: 1,
  ...overrides,
});

const title = (overrides: Partial<TitleClip> = {}): TitleClip => ({
  kind: 'title',
  id: 'title-1',
  durationMs: 3000,
  preset: 'centered',
  text: 'Attendance',
  ...overrides,
});

const banner = (overrides: Partial<Banner> = {}): Banner => ({
  id: 'banner-1',
  startMs: 2000,
  durationMs: 5000,
  preset: 'lowerThird',
  text: 'Rebecca Nunn',
  position: 'bottom',
  animation: 'fade',
  ...overrides,
});

const zoom = (overrides: Partial<Zoom> = {}): Zoom => ({
  id: 'zoom-1',
  clipId: 'clip-1',
  startMs: 1000,
  rampInMs: 400,
  holdMs: 1500,
  rampOutMs: 400,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
  ...overrides,
});

const effect = (overrides: Partial<CursorEffect> = {}): CursorEffect => ({
  id: 'effect-1',
  tMs: 2000,
  type: 'ripple',
  point: { x: 0.25, y: 0.75 },
  origin: 'manual',
  ...overrides,
});

const cursorLayer = (overrides: Partial<CursorLayer> = {}): CursorLayer => ({
  clipId: 'clip-1',
  offsetMs: 0,
  path: [],
  effects: [effect()],
  ...overrides,
});

const narrationTake = (
  overrides: Partial<NarrationClip> = {},
): NarrationClip => ({
  id: 'take-1',
  assetId: 'voice-1',
  startMs: 1500,
  inMs: 0,
  outMs: 4000,
  volume: 1,
  ...overrides,
});

const timelineOf = (overrides: Partial<Timeline>): Timeline => ({
  ...createEmptyTimeline(),
  ...overrides,
});

const planFor = (overrides: Partial<Timeline>) =>
  buildRenderPlan({
    timeline: timelineOf(overrides),
    assets,
    workDir: '/work',
    output: '/work/out.mp4',
  });

const crossfaded: Clip[] = [
  source({ id: 'a', outMs: 4000 }),
  source({
    id: 'b',
    assetId: 'asset-2',
    outMs: 6000,
    transitionIn: { type: 'crossfade', durationMs: 1000 },
  }),
];

describe('renderDurationMs', () => {
  it('is zero without clips', () => {
    expect(renderDurationMs(createEmptyTimeline())).toBe(0);
  });

  it('is the clip layout duration, transitions included', () => {
    expect(renderDurationMs(timelineOf({ clips: crossfaded }))).toBe(9000);
  });
});

describe('buildRenderPlan', () => {
  it('plans nothing for an empty timeline', () => {
    const plan = planFor({});

    expect(plan).toEqual({
      canvas: { width: 1920, height: 1080, fps: 30 },
      durationMs: 0,
      steps: [],
      output: '/work/out.mp4',
      svgs: [],
    });
  });

  it('rejects a clip whose asset is missing', () => {
    expect(() => planFor({ clips: [source({ assetId: 'nope' })] })).toThrow(
      'clip clip-1 references unknown asset nope',
    );
  });

  it('rejects a narration take whose asset is missing', () => {
    expect(() =>
      planFor({
        clips: [source()],
        narration: [narrationTake({ assetId: 'nope' })],
      }),
    ).toThrow('narration take-1 references unknown asset nope');
  });

  describe('a single source clip', () => {
    const plan = planFor({ clips: [source({ inMs: 2000, outMs: 12000 })] });

    it('encodes the clip and then joins with the concat demuxer', () => {
      expect(plan.steps).toMatchSnapshot();
    });

    it('writes a concat list for the caller', () => {
      expect(plan.listFile).toEqual({
        path: '/work/concat.txt',
        content: "file '/work/clip-0.mp4'\n",
      });
    });

    it('rasterises nothing', () => {
      expect(plan.svgs).toEqual([]);
    });

    // any -ss, even to zero, silences the first AAC frame and eats 21ms off
    // the head of the audio, so an untrimmed clip asks for no seek at all
    it('seeks only when the clip starts inside the take', () => {
      const trimmed = plan.steps[0]?.args.join(' ') ?? '';
      expect(trimmed).toContain('-accurate_seek -ss 2.000');

      const untrimmed = planFor({
        clips: [source({ inMs: 0, outMs: 12000 })],
      }).steps[0]?.args.join(' ');
      expect(untrimmed).not.toContain('-ss');
      expect(untrimmed).toContain('-to 12.000');
    });
  });

  describe('two clips with a crossfade', () => {
    const plan = planFor({ clips: crossfaded });

    it('blends the boundary and copies the rest', () => {
      expect(plan.steps).toMatchSnapshot();
    });

    it('lists the pieces the join copies', () => {
      expect(plan.listFile).toEqual({
        path: '/work/concat.txt',
        content:
          "file '/work/piece-0.mp4'\nfile '/work/blend-1.mp4'\nfile '/work/piece-1.mp4'\n",
      });
    });

    // the offset was the boundary's place in the programme when the whole
    // programme was one xfade; in a piece it is the lead in the keyframe grid
    // pulled in, and the boundary still lands where the layout puts it
    it('takes the xfade offset from the lead into the blend', () => {
      expect(
        plan.steps
          .find((step) => step.output === '/work/blend-1.mp4')
          ?.args.join(' '),
      ).toContain('xfade=transition=fade:duration=1.000:offset=1.000');
    });
  });

  describe('a programme the keyframe grid cannot cut', () => {
    // the middle clip is shorter than the two blends reaching into it
    const plan = planFor({
      clips: [
        source({ id: 'a', outMs: 4000 }),
        source({
          id: 'b',
          assetId: 'asset-2',
          outMs: 2000,
          transitionIn: { type: 'crossfade', durationMs: 500 },
        }),
        source({
          id: 'c',
          outMs: 4000,
          transitionIn: { type: 'crossfade', durationMs: 500 },
        }),
      ],
    });

    it('re-encodes the programme whole rather than segmenting it', () => {
      expect(plan.steps.at(-1)?.label).toBe('join 3 clips (xfade)');
      expect(plan.listFile).toBeUndefined();
      expect(plan.steps).toHaveLength(4);
    });

    it('keeps the xfade chain the layout describes', () => {
      const args = plan.steps.at(-1)?.args.join(' ') ?? '';

      expect(args).toContain(
        '[vt0][vt1]xfade=transition=fade:duration=0.500:offset=3.500[v1]',
      );
      expect(args).toContain('[0:a][1:a]acrossfade=d=0.500[a1]');
    });
  });

  describe('the steps a segmented join needs', () => {
    const plan = planFor({ clips: crossfaded });

    it('cuts and blends after the pool and before the join', () => {
      expect(
        plan.steps.map(({ label, serial }) => [label, serial ?? false]),
      ).toEqual([
        ['clip 0 (source asset-1)', false],
        ['clip 1 (source asset-2)', false],
        ['cut clip 0 for the join', true],
        ['blend clip 0 into clip 1', true],
        ['cut clip 1 for the join', true],
        ['join 2 clips (segments)', true],
      ]);
    });

    // the join used to be a quarter of the bar because it re-encoded the
    // programme; copying pieces is worth a twentieth of that
    it('bills the join as the copy it now is', () => {
      expect(plan.steps.at(-1)?.weightMs).toBe(450);
    });
  });

  it('delays narration into programme time across a segment boundary', () => {
    const plan = planFor({
      clips: crossfaded,
      narration: [narrationTake({ startMs: 2500 })],
    });
    const args = plan.steps.at(-1)?.args.join(' ') ?? '';

    // the piece the picture is cut at falls at 2.000s, and the take still
    // starts where the timeline puts it: the audio never sees the seam
    expect(args).toContain('adelay=2500:all=1[n0]');
    expect(args).toContain('[a1][n0]amix=inputs=2');
  });

  describe('a clip with a banner', () => {
    const plan = planFor({ clips: [source()], banners: [banner()] });

    it('overlays the rasterised banner for its own window', () => {
      expect(plan.steps).toMatchSnapshot();
    });

    it('hands the caller the banner svg to rasterise', () => {
      expect(plan.svgs.map(({ path }) => path)).toEqual(['/work/banner-0.png']);
      expect(plan.svgs[0]?.svg).toContain('Rebecca Nunn');
    });
  });

  it('leaves a clip the banner does not reach untouched', () => {
    const plan = planFor({
      clips: crossfaded,
      banners: [banner({ startMs: 0, durationMs: 2000 })],
    });

    expect(
      plan.steps
        .slice(0, 2)
        .map((step) => step.args.join(' ').includes('/work/banner-0.png')),
    ).toEqual([true, false]);
  });

  it('carries a banner that spans a transition onto both clips, rasterised once', () => {
    const plan = planFor({
      clips: crossfaded,
      banners: [banner({ startMs: 2000, durationMs: 4000 })],
    });

    expect(plan.svgs).toHaveLength(1);
    expect(
      plan.steps
        .slice(0, 2)
        .map((step) => step.args.join(' ').includes('/work/banner-0.png')),
    ).toEqual([true, true]);
  });

  // the banner was clipped per clip and its ramps resolved against the clipped
  // window, so it faded out before the cut and back in after it: a 600ms dip in
  // the middle of a banner that should read as solid
  it('ramps a banner spanning a cut only at its own ends', () => {
    const [first, second] = planFor({
      clips: [
        source({ id: 'a', outMs: 4000 }),
        source({ id: 'b', assetId: 'asset-2', outMs: 4000 }),
      ],
      banners: [banner({ startMs: 2000, durationMs: 4000 })],
    }).steps.map((step) => step.args.join(' '));

    expect(first).toContain('fade=t=in:st=2.000:d=0.300:alpha=1');
    expect(first).not.toContain('fade=t=out');
    expect(second).toContain('fade=t=out:st=1.700:d=0.300:alpha=1');
    expect(second).not.toContain('fade=t=in');
  });

  describe('a title card between two clips', () => {
    const plan = planFor({
      clips: [
        source({ id: 'a', outMs: 4000 }),
        title({ id: 't' }),
        source({ id: 'b', assetId: 'asset-2', outMs: 5000 }),
      ],
    });

    it('generates a background and overlays the card', () => {
      expect(plan.steps).toMatchSnapshot();
    });

    it('hands the caller the title svg to rasterise', () => {
      expect(plan.svgs.map(({ path }) => path)).toEqual(['/work/title-1.png']);
      expect(plan.svgs[0]?.svg).toContain('Attendance');
    });
  });

  describe('a narration take', () => {
    const plan = planFor({
      clips: [source()],
      narration: [narrationTake({ volume: 0.8 })],
    });

    it('mixes the take into the join in programme time', () => {
      expect(plan.steps.at(-1)).toMatchSnapshot();
    });

    it('never lets amix attenuate the programme audio', () => {
      expect(plan.steps.at(-1)?.args.join(' ')).toContain(
        'amix=inputs=2:normalize=0:dropout_transition=0',
      );
    });
  });

  it('mixes narration into a blended join after the clip inputs', () => {
    const plan = planFor({ clips: crossfaded, narration: [narrationTake()] });

    expect(plan.steps.at(-1)?.args).toMatchSnapshot();
  });

  describe('a banner that slides', () => {
    it('rises into place from the bottom edge', () => {
      expect(
        planFor({
          clips: [source()],
          banners: [banner({ animation: 'slide' })],
        }).steps,
      ).toMatchSnapshot();
    });

    it('drops into place from the top edge', () => {
      const args =
        planFor({
          clips: [source()],
          banners: [banner({ animation: 'slide', position: 'top' })],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain("y='-78*(1-min(1,max(0,(t-2.000)/0.300))");
    });

    it('leaves a fading banner composited at the origin', () => {
      const args =
        planFor({
          clips: [source()],
          banners: [banner()],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain(
        "overlay=0:0:format=yuv444:enable='between(t,2.000,7.000)'",
      );
      expect(args).not.toContain("y='");
    });
  });

  describe('a clip with a zoom', () => {
    const plan = planFor({ clips: [source()], zooms: [zoom()] });

    it('ramps the picture in, holds it and ramps it out', () => {
      expect(plan.steps[0]).toMatchSnapshot();
    });

    // the capture is already the canvas size, so the zoom's own scale is the
    // canvas fit and there is nothing left for a separate fit to do
    it('crops a capture at least as large as the canvas at its own resolution', () => {
      expect(plan.steps[0]?.args.join(' ')).toContain(
        "-filter_complex [0:v]fps=30,scale=w='2*floor(1920*(1+1.000*if(",
      );
      expect(plan.steps[0]?.args.join(' ')).not.toContain(
        'force_original_aspect_ratio',
      );
    });

    // a smaller capture is letterboxed onto the canvas, and the preview scales
    // those bars along with the picture, so the fit has to come first
    it('fits a capture smaller than the canvas before it zooms', () => {
      const args =
        planFor({
          clips: [source({ assetId: 'asset-2' })],
          zooms: [zoom()],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain('force_original_aspect_ratio=decrease');
      expect(args.indexOf('pad=1920:1080')).toBeLessThan(
        args.indexOf('eval=frame'),
      );
    });

    it('crops around the focus point the preview scales around', () => {
      expect(plan.steps[0]?.args.join(' ')).toContain(
        "crop=1920:1080:x='(clip(0.5000*(1-1/(1+1.000*if(",
      );
    });

    it('reads the zoom in clip local time, whatever the clip is trimmed to', () => {
      const args =
        planFor({
          clips: [source({ inMs: 2000, outMs: 12000 })],
          zooms: [zoom({ rampInMs: 0, holdMs: 1000, rampOutMs: 0 })],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain('between(t,1.000,2.000)');
    });

    it('leaves a clip the zoom does not belong to alone', () => {
      expect(
        planFor({ clips: crossfaded, zooms: [zoom({ clipId: 'b' })] })
          .steps.slice(0, 2)
          .map((step) => step.args.join(' ').includes('eval=frame')),
      ).toEqual([false, true]);
    });

    it.each([
      ['never leaves 1x', zoom({ scale: 1 })],
      ['has no time to ramp', zoom({ rampInMs: 0, holdMs: 0, rampOutMs: 0 })],
    ])('rescales nothing for a zoom that %s', (_, unused) => {
      expect(
        planFor({ clips: [source()], zooms: [unused] }).steps[0]?.args.join(
          ' ',
        ),
      ).not.toContain('eval=frame');
    });

    it('adds up two zooms that overlap on one clip', () => {
      const args =
        planFor({
          clips: [source()],
          zooms: [zoom(), zoom({ id: 'zoom-2', focus: { x: 0.2, y: 0.8 } })],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain("x='(clip(0.5000*(1-1/(1+1.000*if(");
      expect(args).toContain('+0.2000*(1-1/(1+1.000*if(');
    });
  });

  // A 16:10 capture used to be fitted to the canvas first and magnified back
  // out of the result, so the zoom cropped an already resampled frame. The
  // letterbox stays exactly where the fit put it and only the zoom's pixels
  // change: they come out of the picture, at its own resolution.
  describe('a letterboxed clip with a zoom', () => {
    const wide = source({ assetId: 'wide-1' });

    it('scales the picture, pads the bars and crops the window', () => {
      expect(
        planFor({ clips: [wide], zooms: [zoom()] }).steps[0],
      ).toMatchSnapshot();
    });

    it('never fits the capture to the canvas first', () => {
      const args =
        planFor({ clips: [wide], zooms: [zoom()] }).steps[0]?.args.join(' ') ??
        '';

      expect(args).not.toContain('force_original_aspect_ratio');
      // the bar is written against the magnified picture, the only width pad
      // is given that carries the scale
      expect(args).toContain("x='2*floor(128*in_w/1662/2)'");
    });

    const held = planFor({
      clips: [wide],
      zooms: [
        zoom({
          startMs: 0,
          rampInMs: 0,
          holdMs: 10_000,
          rampOutMs: 0,
          focus: { x: 0, y: 0.5 },
        }),
      ],
    });

    it('cuts a held window out of the source and pads the bar back on', () => {
      expect(held.steps[0]).toMatchSnapshot();
    });

    // the window aimed at the left edge reaches 256 output pixels past the
    // picture, which no crop of the source can supply
    it('supplies the bar the held window reaches into', () => {
      expect(held.steps[0]?.args.join(' ')).toContain(
        'crop=1664:1080:0:100,pad=1920:1080:256:0:color=black',
      );
    });

    // the overlays composite onto the finished picture at canvas coordinates
    // and ride the same window expression, so a bar changes nothing about
    // where any of them land
    const overlaid = (assetId: string) =>
      planFor({
        clips: [source({ assetId })],
        zooms: [zoom()],
        banners: [banner()],
        cursor: [
          cursorLayer({
            path: [
              { tMs: 0, x: 0.1, y: 0.2 },
              { tMs: 1000, x: 0.6, y: 0.7 },
            ],
          }),
        ],
      });

    it('composites banners, rings and the pointer over it unchanged', () => {
      expect(overlaid('wide-1').steps[0]).toMatchSnapshot();
    });

    it('places every overlay exactly where a 16:9 capture would', () => {
      const segments = (assetId: string) => {
        const graph =
          overlaid(assetId).steps[0]?.args.find((arg) =>
            arg.includes('[v0];'),
          ) ?? '';
        return graph.slice(graph.indexOf('[v0];'));
      };

      expect(segments('wide-1')).toEqual(segments('asset-1'));
    });
  });

  describe('a clip with cursor effects', () => {
    const plan = planFor({
      clips: [source()],
      cursor: [
        cursorLayer({
          effects: [
            effect(),
            effect({
              id: 'effect-2',
              tMs: 5000,
              type: 'spotlight',
              point: { x: 0.6, y: 0.4 },
            }),
          ],
        }),
      ],
    });

    it('overlays each effect for its own window', () => {
      expect(plan.steps[0]).toMatchSnapshot();
    });

    it('hands the caller one image per effect to rasterise', () => {
      expect(plan.svgs.map(({ path }) => path)).toEqual([
        '/work/cursor-0-0.png',
        '/work/cursor-0-1.png',
      ]);
    });

    // Measured on ffmpeg 9.0.1 with 60 rings on a 3s 1920x1080 clip: drawing
    // each one on a canvas sized image took 49.0s, and drawing it at its own
    // 188x188 box takes 6.3s. The click still lands at 480,810 on the canvas.
    it('draws the ripple at its own box, aimed at the click point', () => {
      expect(plan.svgs[0]).toMatchObject({ width: 414, height: 414 });
      expect(plan.svgs[0]?.svg).toContain('<circle cx="207" cy="207"');
      expect(plan.steps[0]?.args.join(' ')).toContain(
        "overlay=x='273+(414-w)/2':y='603+(414-h)/2'",
      );
    });

    it('holds a spotlight longer than a ripple', () => {
      const args = plan.steps[0]?.args.join(' ') ?? '';

      expect(args).toContain("enable='between(t,2.000,2.600)'");
      expect(args).toContain("enable='between(t,5.000,6.200)'");
    });

    it('nudges the effects by the layer offset', () => {
      const args =
        planFor({
          clips: [source()],
          cursor: [cursorLayer({ offsetMs: 500 })],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain("enable='between(t,2.500,3.100)'");
    });

    // the ring's decay used to be rescaled to whatever window was left, so a
    // click near the clip end flashed out at triple speed
    it('keeps a clipped ring decaying at its own rate', () => {
      const args =
        planFor({
          clips: [source({ outMs: 2000 })],
          cursor: [cursorLayer({ effects: [effect({ tMs: 1800 })] })],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain('fade=t=out:st=1.800:d=0.600');
      expect(args).toContain("enable='between(t,1.800,2.000)'");
    });

    it('starts a ring the trim cut into already part faded', () => {
      const args =
        planFor({
          clips: [source({ inMs: 2200 })],
          cursor: [cursorLayer({ effects: [effect({ tMs: 2000 })] })],
        }).steps[0]?.args.join(' ') ?? '';

      // the ring began 200ms before frame 0: the fade runs on a clock rolled
      // 200ms forward and the head is trimmed back off
      expect(args).toContain('fade=t=out:st=0.000:d=0.600');
      expect(args).toContain('trim=start=0.200');
    });

    // capture times are moments in the footage: trimming the start of a clip
    // used to burn every click in late by exactly the trim
    it('keeps a click on its footage moment when the clip start is trimmed', () => {
      const args =
        planFor({
          clips: [source({ inMs: 1500 })],
          cursor: [cursorLayer()],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args).toContain("enable='between(t,0.500,1.100)'");
    });

    it('walks the drawn pointer in the trimmed clip time as well', () => {
      const layer = cursorLayer({
        pointer: 'arrow',
        path: [
          { tMs: 2000, x: 0.2, y: 0.2 },
          { tMs: 4000, x: 0.8, y: 0.8 },
        ],
      });
      const trimmed =
        planFor({
          clips: [source({ inMs: 1500 })],
          cursor: [layer],
        }).steps[0]?.args.join(' ') ?? '';

      // the walk starts at footage 2000ms, which is 500ms into the clip
      expect(trimmed).toContain('(t-0.500)');
    });

    it('ignores a zoom marker, which the editor materialises as a zoom', () => {
      expect(
        planFor({
          clips: [source()],
          cursor: [cursorLayer({ effects: [effect({ type: 'zoom' })] })],
        }).svgs,
      ).toEqual([]);
    });

    it('drops an effect that lands past the end of the clip', () => {
      expect(
        planFor({
          clips: [source()],
          cursor: [cursorLayer({ effects: [effect({ tMs: 10000 })] })],
        }).svgs,
      ).toEqual([]);
    });

    it('composites a banner over the effects, as the preview stacks them', () => {
      const args =
        planFor({
          clips: [source()],
          cursor: [cursorLayer()],
          banners: [banner()],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args.indexOf('/work/cursor-0-0.png')).toBeLessThan(
        args.indexOf('/work/banner-0.png'),
      );
    });
  });

  // every overlay costs an ffmpeg input and a composite per frame, so a clip
  // draws what a viewer sees rather than failing to render at all
  describe('the overlays one clip will carry', () => {
    it('caps the click effects', () => {
      const many = Array.from({ length: maxCursorOverlays + 10 }, (_u, index) =>
        effect({ id: `effect-${index}`, tMs: index * 100 }),
      );

      expect(
        planFor({
          clips: [source()],
          cursor: [cursorLayer({ effects: many })],
        }).svgs,
      ).toHaveLength(maxCursorOverlays);
    });

    it('caps the banners the same way', () => {
      const many = Array.from({ length: maxBannerOverlays + 5 }, (_u, index) =>
        banner({ id: `banner-${index}`, startMs: index * 100 }),
      );

      expect(planFor({ clips: [source()], banners: many }).svgs).toHaveLength(
        maxBannerOverlays,
      );
    });
  });

  describe('a clip with a captured pointer', () => {
    const captured = [
      { tMs: 0, x: 0.2, y: 0.2 },
      { tMs: 500, x: 0.5, y: 0.4 },
      { tMs: 1000, x: 0.8, y: 0.7 },
    ];

    const plan = planFor({
      clips: [source()],
      cursor: [cursorLayer({ path: captured, effects: [] })],
    });

    it('walks one pointer image along the whole capture', () => {
      expect(plan.steps[0]).toMatchSnapshot();
    });

    it('hands the caller one image to rasterise, however long the path', () => {
      expect(plan.svgs.map(({ path }) => path)).toEqual([
        '/work/pointer-0-0.png',
      ]);
    });

    it('shows the pointer only for as long as the capture runs', () => {
      expect(plan.steps[0]?.args.join(' ')).toContain(
        "enable='between(t,0.000,1.000)'",
      );
    });

    it('nudges the pointer by the layer offset, as it nudges the clicks', () => {
      expect(
        planFor({
          clips: [source()],
          cursor: [
            cursorLayer({ path: captured, effects: [], offsetMs: 2000 }),
          ],
        }).steps[0]?.args.join(' '),
      ).toContain("enable='between(t,2.000,3.000)'");
    });

    it('draws the pointer the layer asked for', () => {
      expect(
        planFor({
          clips: [source()],
          cursor: [
            cursorLayer({ path: captured, effects: [], pointer: 'ring' }),
          ],
        }).svgs[0]?.svg,
      ).toContain('A150,150');
    });

    it('draws no pointer for a clip whose capture is empty', () => {
      expect(
        planFor({ clips: [source()], cursor: [cursorLayer()] }).svgs,
      ).toEqual([expect.objectContaining({ path: '/work/cursor-0-0.png' })]);
    });

    // the ring marks where a click landed and the pointer is what did the
    // clicking, so the pointer goes on top
    it('composites the pointer over the click rings', () => {
      const args =
        planFor({
          clips: [source()],
          cursor: [cursorLayer({ path: captured })],
        }).steps[0]?.args.join(' ') ?? '';

      expect(args.indexOf('/work/cursor-0-0.png')).toBeLessThan(
        args.indexOf('/work/pointer-0-0.png'),
      );
    });
  });

  describe('a clip with a zoom and cursor effects', () => {
    const walked = [
      { tMs: 0, x: 0.2, y: 0.2 },
      { tMs: 2000, x: 0.5, y: 0.4 },
      { tMs: 4000, x: 0.8, y: 0.7 },
    ];

    const plan = planFor({
      clips: [source()],
      zooms: [zoom({ focus: { x: 0.25, y: 0.75 } })],
      cursor: [cursorLayer({ path: walked })],
    });

    const args = plan.steps[0]?.args.join(' ') ?? '';

    it('zooms the picture and composites the effects over it', () => {
      expect(plan.steps[0]).toMatchSnapshot();
    });

    // the ring used to sit at the address the button had before the zoom, while
    // the pointer clicking it had already followed the picture
    it('carries the click ring through the same window as the picture', () => {
      // the ring's own box moves with it, from the corner it was drawn at
      expect(args).toContain("overlay=x='273+(414-w)/2+((((480)-(");
      expect(args).toContain(')*1920)*(1+1.000*if(between(t,');
    });

    it('carries the pointer through it too, on the same clock', () => {
      // the walked pointer's x opens with its own ramp sum, carried through
      // the same zoom window expression the ring rides
      expect(
        args.match(/-\(clip\(0\.2500\*\(1-1\//g)?.length,
      ).toBeGreaterThanOrEqual(2);
    });

    it('leaves the ring where it was drawn when nothing is zooming', () => {
      expect(
        planFor({
          clips: [source()],
          cursor: [cursorLayer()],
        }).steps[0]?.args.join(' '),
      ).toContain("overlay=x='273+(414-w)/2':y='603+(414-h)/2'");
    });

    // moving a full frame scrim would uncover the very edge it is darkening
    it('leaves a spotlight scrim covering the whole frame', () => {
      expect(
        planFor({
          clips: [source()],
          zooms: [zoom()],
          cursor: [cursorLayer({ effects: [effect({ type: 'spotlight' })] })],
        }).steps[0]?.args.join(' '),
      ).toContain('overlay=0:0');
    });
  });

  describe('every clip step carries exactly one audio stream', () => {
    const silentFixtures: [string, Partial<Timeline>][] = [
      ['a muted clip', { clips: [source({ volume: 0 })] }],
      ['an asset with no audio', { clips: [source({ assetId: 'silent-1' })] }],
      ['a title card', { clips: [title()] }],
      [
        'a muted clip joined with a crossfade',
        {
          clips: [
            source({ id: 'a', outMs: 4000, volume: 0 }),
            source({
              id: 'b',
              assetId: 'asset-2',
              outMs: 6000,
              transitionIn: { type: 'crossfade', durationMs: 1000 },
            }),
          ],
        },
      ],
    ];

    it.each(silentFixtures)('never emits -an for %s', (_, overrides) => {
      planFor(overrides).steps.forEach((step) => {
        expect(step.args).not.toContain('-an');
      });
    });

    it.each(silentFixtures)('gives %s generated silence', (_, overrides) => {
      expect(planFor(overrides).steps[0]?.args.join(' ')).toContain(
        '-i anullsrc=channel_layout=stereo:sample_rate=48000',
      );
    });

    it('replaces the source audio of a muted clip with silence', () => {
      expect(
        planFor({ clips: [source({ volume: 0 })] }).steps[0],
      ).toMatchSnapshot();
    });

    it('replaces the source audio of an unprobed silent asset with silence', () => {
      expect(
        planFor({ clips: [source({ assetId: 'silent-1' })] }).steps[0]?.args,
      ).toMatchSnapshot();
    });

    // hasAudio missing means the ingest has not looked yet; assuming audio put
    // a stream-less clip into the join and the whole export failed on ':a'
    it('gives a genuinely unprobed asset silence rather than a maybe-stream', () => {
      const args =
        planFor({ clips: [source({ assetId: 'unprobed-1' })] }).steps[0]
          ?.args ?? [];

      expect(args.join(' ')).toContain('anullsrc');
      expect(args).toContain('1:a');
      expect(args).not.toContain('0:a?');
    });

    it('keeps the volume filter on a muted clip', () => {
      expect(
        planFor({ clips: [source({ volume: 0 })] }).steps[0]?.args,
      ).toEqual(
        expect.arrayContaining([
          'volume=0,aresample=async=1:first_pts=0,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad=whole_dur=10.000',
        ]),
      );
    });

    it('lets the join blend clip audio directly, with no substitute inputs', () => {
      const plan = planFor({
        clips: [
          source({ id: 'a', outMs: 4000, volume: 0 }),
          source({
            id: 'b',
            assetId: 'asset-2',
            outMs: 6000,
            transitionIn: { type: 'crossfade', durationMs: 1000 },
          }),
        ],
      });
      const args = plan.steps.at(-1)?.args.join(' ') ?? '';

      // the demuxer the picture is copied off holds input 0, so the clips the
      // audio is rebuilt from start at 1
      expect(args).toContain('[1:a][2:a]acrossfade=d=1.000');
      expect(args).not.toContain('anullsrc');
    });
  });

  it('joins a cut inside an otherwise blended timeline without a transition', () => {
    const plan = planFor({
      clips: [
        source({ id: 'a', outMs: 4000 }),
        source({ id: 'b', assetId: 'asset-2', outMs: 4000 }),
        source({
          id: 'c',
          outMs: 4000,
          transitionIn: { type: 'crossfade', durationMs: 800 },
        }),
      ],
    });

    // the cut boundary needs no piece of its own: the two clips either side of
    // it are copied whole and simply abut in the list
    expect(plan.listFile?.content).toBe(
      [
        "file '/work/clip-0.mp4'",
        "file '/work/piece-1.mp4'",
        "file '/work/blend-2.mp4'",
        "file '/work/piece-2.mp4'",
        '',
      ].join('\n'),
    );
    expect(plan.steps.at(-1)?.args.join(' ')).toContain(
      '[1:a][2:a]concat=n=2:v=0:a=1[a1];[a1][3:a]acrossfade=d=0.800[a2]',
    );
  });
});

describe('describePlan', () => {
  it('writes one line per step for the job log', () => {
    expect(
      describePlan(
        planFor({
          clips: [source({ id: 'a', outMs: 4000 }), title({ id: 't' })],
        }),
      ),
    ).toEqual([
      '1/3 clip 0 (source asset-1) -> /work/clip-0.mp4',
      '2/3 clip 1 (title "Attendance") -> /work/clip-1.mp4',
      '3/3 join 2 clips (concat) -> /work/out.mp4',
    ]);
  });

  it('names a single clip join in the singular', () => {
    expect(describePlan(planFor({ clips: [source()] }))).toEqual([
      '1/2 clip 0 (source asset-1) -> /work/clip-0.mp4',
      '2/2 join 1 clip (concat) -> /work/out.mp4',
    ]);
  });
});

// the creator's pixel trim shifts the burnt-in ring exactly as the preview
// shifts its own
it('moves an export ring by the layer trim', () => {
  const at = (align: Partial<CursorLayer>) => {
    const args =
      planFor({
        clips: [source()],
        cursor: [cursorLayer(align)],
      }).steps[0]?.args.join(' ') ?? '';
    const match =
      /overlay=x='(-?\d+)\+\(414-w\)\/2':y='(-?\d+)\+\(414-h\)\/2'/.exec(args);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : undefined;
  };

  const plain = at({});
  const trimmed = at({ alignXPx: 100, alignYPx: -40 });

  expect(trimmed?.x).toBe((plain?.x ?? 0) + 100);
  expect(trimmed?.y).toBe((plain?.y ?? 0) - 40);
});

// a screen capture writes no frames while nothing changes, so a take whose
// last seconds were pointer travel alone ends its footage early: the clip's
// picture is held to its own end rather than cut, and the audio padded to it
it('holds the last frame of footage that ends before the clip does', () => {
  const short: RenderAsset[] = [
    { assetId: 'asset-1', path: '/a.mp4', durationMs: 7000, hasAudio: true },
  ];
  const args =
    buildRenderPlan({
      timeline: timelineOf({ clips: [source({ outMs: 10000 })] }),
      assets: short,
      workDir: '/work',
      output: '/work/out.mp4',
    }).steps[0]?.args.join(' ') ?? '';

  expect(args).toContain('tpad=stop_mode=clone:stop_duration=3.000');
  expect(args).toContain('apad=whole_dur=10.000');
});

it('pads nothing when the footage covers the clip', () => {
  const args =
    planFor({ clips: [source({ outMs: 10000 })] }).steps[0]?.args.join(' ') ??
    '';

  expect(args).not.toContain('tpad');
});
