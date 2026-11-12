import { layoutClips } from '../../clips';
import { Canvas, SourceClip, TitleClip } from '../../schema';
import {
  chain,
  clipAudioFilters,
  filterSegment,
  fitToCanvasFilters,
  graph,
  overlayFadeRamps,
  overlayFilter,
  overlayInputFilters,
  pictureBox,
  secondsFromMs,
  videoFilters,
  xfadeTransition,
} from '../filters';

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

const title = (overrides: Partial<TitleClip> = {}): TitleClip => ({
  kind: 'title',
  id: 'title-1',
  durationMs: 3000,
  preset: 'centered',
  text: 'Attendance',
  ...overrides,
});

describe('secondsFromMs', () => {
  it.each([
    [0, '0.000'],
    [1500, '1.500'],
    [333, '0.333'],
    [60000, '60.000'],
  ])('renders %sms as %s', (ms, expected) => {
    expect(secondsFromMs(ms)).toBe(expected);
  });
});

describe('filterSegment', () => {
  it('joins labelled inputs, a filter chain and an output label', () => {
    expect(filterSegment(['0:v', '1:v'], ['overlay=0:0'], 'v1')).toBe(
      '[0:v][1:v]overlay=0:0[v1]',
    );
  });

  it('separates segments with a semicolon', () => {
    expect(graph(['a', 'b'])).toBe('a;b');
  });

  it('separates filters with a comma', () => {
    expect(chain(['a', 'b'])).toBe('a,b');
  });
});

describe('fitToCanvasFilters', () => {
  it('letterboxes the source into the canvas without stretching it', () => {
    expect(fitToCanvasFilters(canvas)).toEqual([
      'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos:out_color_matrix=bt709',
      'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black',
      'setsar=1',
      'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709',
    ]);
  });
});

// The zoom now reads its pixels out of the picture rather than the padded
// frame, so where the fit puts that picture has to be known to the pixel. Both
// halves are ffmpeg's own behaviour, measured on ffmpeg 9.0.1 rather than
// reasoned about: the sizes below are what `scale` actually reported.
describe('pictureBox', () => {
  it.each([
    [2560, 1664, 1662, 1080],
    [2880, 1864, 1668, 1080],
    [3024, 1964, 1662, 1080],
    [3456, 2234, 1670, 1080],
    [2880, 1800, 1728, 1080],
    [1920, 1080, 1920, 1080],
    // wider than the canvas, so the bars are above and below instead
    [3440, 1440, 1920, 804],
  ])(
    'lands where force_divisible_by=2 lands for %ix%i',
    (width, height, pw, ph) => {
      expect(pictureBox({ width, height }, canvas)).toMatchObject({ pw, ph });
    },
  );

  // 1080*2560/1664 is 1661.54 and the fit still reports 1662: the divisor is
  // applied to the nearest even size, not to the largest one that fits
  it('rounds up to the even size past the exact fit', () => {
    expect(pictureBox({ width: 2560, height: 1664 }, canvas).pw).toBe(1662);
  });

  // (1920-1662)/2 is 129, and pad silently floors an odd offset to an even one
  // under yuv420p's chroma subsampling rather than refusing it
  it('offsets the picture where pad silently floors it to', () => {
    expect(pictureBox({ width: 3024, height: 1964 }, canvas)).toEqual({
      pw: 1662,
      ph: 1080,
      ox: 128,
      oy: 0,
    });
    expect(pictureBox({ width: 3440, height: 1440 }, canvas)).toEqual({
      pw: 1920,
      ph: 804,
      ox: 0,
      oy: 138,
    });
  });
});

describe('videoFilters', () => {
  it('fits a source clip to the canvas', () => {
    const [placement] = layoutClips([source()]);

    expect(placement && videoFilters({ canvas, placement })).toEqual(
      fitToCanvasFilters(canvas),
    );
  });

  it('leaves a generated title background at its own size', () => {
    const [placement] = layoutClips([title()]);

    expect(placement && videoFilters({ canvas, placement })).toEqual([
      'setsar=1',
      'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709',
    ]);
  });
});

describe('clipAudioFilters', () => {
  it('resamples and normalises the format at full volume', () => {
    expect(clipAudioFilters(source())).toEqual([
      'aresample=async=1:first_pts=0',
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo',
    ]);
  });

  it('adds a volume filter for any other level', () => {
    expect(clipAudioFilters(source({ volume: 0.4 }))).toEqual([
      'volume=0.4',
      'aresample=async=1:first_pts=0',
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo',
    ]);
  });
});

describe('overlay filters', () => {
  it('fades a timed overlay in and out over 300ms', () => {
    expect(overlayInputFilters({ startMs: 2000, endMs: 7000 })).toEqual([
      'format=rgba',
      'fade=t=in:st=2.000:d=0.300:alpha=1',
      'fade=t=out:st=6.700:d=0.300:alpha=1',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  it('never fades for longer than half of a short overlay', () => {
    expect(overlayInputFilters({ startMs: 0, endMs: 400 })).toEqual([
      'format=rgba',
      'fade=t=in:st=0.000:d=0.200:alpha=1',
      'fade=t=out:st=0.200:d=0.200:alpha=1',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  it('does not fade an overlay with no visible window at all', () => {
    expect(overlayInputFilters({ startMs: 5000, endMs: 5000 })).toEqual([
      'format=rgba',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  it('does not fade an untimed overlay such as a title card', () => {
    expect(overlayInputFilters()).toEqual([
      'format=rgba',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  // a banner cut in half by a clip boundary used to ramp at the cut, dipping out
  // and back in over 600ms in the middle of a banner that should read as solid
  it('ramps only at the real ends of an overlay the clip cuts short', () => {
    expect(
      overlayInputFilters({
        startMs: 2000,
        endMs: 4000,
        spanStartMs: 2000,
        spanEndMs: 6000,
      }),
    ).toEqual([
      'format=rgba',
      'fade=t=in:st=2.000:d=0.300:alpha=1',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  it('ramps only at the real end of an overlay the clip cuts into', () => {
    expect(
      overlayInputFilters({
        startMs: 0,
        endMs: 2000,
        spanStartMs: -2000,
        spanEndMs: 2000,
      }),
    ).toEqual([
      'format=rgba',
      'fade=t=out:st=1.700:d=0.300:alpha=1',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  // the ring decays at its own rate and is simply cut off, rather than having
  // the whole decay squeezed into whatever is left of the clip
  it('keeps the real fade duration when the window ends first', () => {
    expect(
      overlayInputFilters({
        startMs: 1800,
        endMs: 2000,
        spanStartMs: 1800,
        spanEndMs: 2400,
        fadeInMs: 0,
        fadeOutMs: 600,
      }),
    ).toEqual([
      'format=rgba',
      'fade=t=out:st=1.800:d=0.600:alpha=1',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  // ffmpeg refuses a negative st, so the ramp is written on a rolled forward
  // clock and the roll trimmed back off: at frame 0 the overlay is a third gone
  it('starts an overlay part faded when its ramp began before frame 0', () => {
    expect(
      overlayInputFilters({
        startMs: 0,
        endMs: 400,
        spanStartMs: -200,
        spanEndMs: 400,
        fadeInMs: 0,
        fadeOutMs: 600,
      }),
    ).toEqual([
      'format=rgba',
      'fade=t=out:st=0.000:d=0.600:alpha=1',
      'trim=start=0.200',
      'setpts=PTS-STARTPTS',
      'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
      'format=yuva444p',
    ]);
  });

  it('gates a timed overlay in clip local time', () => {
    expect(overlayFilter({ startMs: 2000, endMs: 7000 })).toBe(
      "overlay=0:0:format=yuv444:enable='between(t,2.000,7.000)'",
    );
  });

  it('composites an untimed overlay at the origin', () => {
    expect(overlayFilter()).toBe('overlay=0:0:format=yuv444');
  });
});

describe('overlayFadeRamps', () => {
  it('uses the default ramp when nothing was asked for', () => {
    expect(overlayFadeRamps({ startMs: 0, endMs: 5000 })).toEqual({
      inMs: 300,
      outMs: 300,
    });
  });

  it('takes the ramps the creator asked for', () => {
    expect(
      overlayFadeRamps({
        startMs: 0,
        endMs: 5000,
        fadeInMs: 1200,
        fadeOutMs: 200,
      }),
    ).toEqual({ inMs: 1200, outMs: 200 });
  });

  // both are scaled together rather than one eating the other, so the shape
  // the creator asked for survives on a card too short to hold it
  it('scales both ramps down to fit a short window', () => {
    expect(
      overlayFadeRamps({
        startMs: 0,
        endMs: 600,
        fadeInMs: 900,
        fadeOutMs: 300,
      }),
    ).toEqual({ inMs: 450, outMs: 150 });
  });

  it('measures the ramps against the real span, not the visible piece', () => {
    expect(
      overlayFadeRamps({
        startMs: 1800,
        endMs: 2000,
        spanStartMs: 1800,
        spanEndMs: 2400,
        fadeInMs: 0,
        fadeOutMs: 600,
      }),
    ).toEqual({ inMs: 0, outMs: 600 });
  });

  it('honours a ramp asked to be nothing at all', () => {
    expect(
      overlayFadeRamps({
        startMs: 0,
        endMs: 5000,
        fadeInMs: 0,
        fadeOutMs: 800,
      }),
    ).toEqual({ inMs: 0, outMs: 800 });
  });
});

describe('a sliding overlay', () => {
  it('rises into place from below for a bottom banner', () => {
    expect(
      overlayFilter({ startMs: 2000, endMs: 7000 }, { distancePx: 281 }),
    ).toBe(
      "overlay=x=0:y='281*(1-min(1,max(0,(t-2.000)/0.300))+min(1,max(0,(t-6.700)/0.300)))':format=yuv444:enable='between(t,2.000,7.000)'",
    );
  });

  it('drops into place from above for a top banner', () => {
    expect(
      overlayFilter({ startMs: 0, endMs: 4000 }, { distancePx: -281 }),
    ).toBe(
      "overlay=x=0:y='-281*(1-min(1,max(0,(t-0.000)/0.300))+min(1,max(0,(t-3.700)/0.300)))':format=yuv444:enable='between(t,0.000,4.000)'",
    );
  });

  it('slides over the same window as the alpha fade', () => {
    expect(
      overlayFilter({ startMs: 0, endMs: 400 }, { distancePx: 281 }),
    ).toContain('/0.200)');
  });

  it('does not slide when there is no room to ramp', () => {
    expect(
      overlayFilter({ startMs: 1000, endMs: 1000 }, { distancePx: 281 }),
    ).toBe("overlay=0:0:format=yuv444:enable='between(t,1.000,1.000)'");
  });
});

describe('xfadeTransition', () => {
  it('maps a crossfade to fade', () => {
    expect(xfadeTransition({ type: 'crossfade', durationMs: 500 })).toBe(
      'fade',
    );
  });

  it('maps a slide to slideleft', () => {
    expect(xfadeTransition({ type: 'slide', durationMs: 500 })).toBe(
      'slideleft',
    );
  });
});

// the exported ring used to sit still and fade while the preview's expanded:
// the art is drawn crisp at its largest and scaled down per frame, so every
// size of the animation is a downscale
describe('a growing overlay', () => {
  const growing = {
    startMs: 800,
    endMs: 1400,
    spanStartMs: 800,
    spanEndMs: 1400,
    fadeInMs: 0,
    fadeOutMs: 600,
    grow: { durationMs: 600, fromScale: 0.1818, width: 414, height: 414 },
  };

  it('scales the art per frame from the click outward', () => {
    const filters = overlayInputFilters(growing).join(',');

    expect(filters).toContain(
      "scale=w='ceil(iw*(0.1818+0.8182*(1-pow(1-clip((t-0.800)/0.600,0,1),2))))'",
    );
    expect(filters).toContain('eval=frame:flags=lanczos');
  });

  it('stays centred on the click while its frame changes size', () => {
    expect(
      overlayFilter(growing, undefined, undefined, { x: 273, y: 603 }),
    ).toBe(
      "overlay=x='273+(414-w)/2':y='603+(414-h)/2':format=yuv444:enable='between(t,0.800,1.400)'",
    );
  });
});
