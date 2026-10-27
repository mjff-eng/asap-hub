import { bannerBand, bannerSvg } from '../banner';

const canvas = { width: 1920, height: 1080 };

describe('bannerBand', () => {
  // the band hugs one line of each face plus the preview's width-relative
  // paddings, rather than claiming a fixed slice of the frame
  it('sits low against the bottom edge', () => {
    expect(bannerBand('lowerThird', 'bottom', canvas)).toEqual({
      x: 0,
      y: 819,
      width: 1920,
      height: 261,
    });
  });

  it('hangs from the top edge', () => {
    expect(bannerBand('lowerThird', 'top', canvas)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 261,
    });
  });

  it('scales with the canvas', () => {
    expect(
      bannerBand('lowerThird', 'top', { width: 1280, height: 720 }),
    ).toEqual({ x: 0, y: 0, width: 1280, height: 174 });
  });
});

describe('bannerSvg', () => {
  it('renders a lower third with a heading and a subtitle', () => {
    expect(
      bannerSvg({
        preset: 'lowerThird',
        text: 'Rebecca Nunn',
        subtitle: 'Project manager, ASAP',
        position: 'bottom',
        canvas,
      }),
    ).toMatchSnapshot();
  });

  it('renders a heading on its own at the top', () => {
    expect(
      bannerSvg({
        preset: 'lowerThird',
        text: 'Rebecca Nunn',
        position: 'top',
        canvas,
      }),
    ).toMatchSnapshot();
  });

  // the scrim is the preview's gradient, solid at the frame edge and gone by
  // the top of the band, never a flat slab across the picture
  it('is a rising gradient, not a flat slab', () => {
    const svg = bannerSvg({
      preset: 'lowerThird',
      text: 'Rebecca Nunn',
      position: 'bottom',
      canvas,
    });

    expect(svg.match(/<rect/g)).toHaveLength(1);
    expect(svg).toContain('fill="url(#scrim)"');
    expect(svg).toContain('stop-opacity="0.78"');
    expect(svg).toContain(
      'offset="0.6" stop-color="#000000" stop-opacity="0.45"',
    );
    expect(svg).toContain('stop-opacity="0"');
  });

  // a one line banner keeps its low band; only a wrapped heading grows it
  it('grows the band only when the heading wraps', () => {
    const short = bannerSvg({
      preset: 'lowerThird',
      text: 'Rebecca Nunn',
      position: 'bottom',
      canvas,
    });
    const wrapped = bannerSvg({
      preset: 'lowerThird',
      text: 'A banner heading that runs far past the width of the frame and keeps going',
      position: 'bottom',
      canvas,
    });

    const heightOf = (svg: string): number =>
      Number(/<rect[^>]*height="(\d+)"/.exec(svg)?.[1]);
    expect(heightOf(short)).toBe(216);
    expect(heightOf(wrapped)).toBeGreaterThan(heightOf(short));
  });

  it('is left aligned with generous padding', () => {
    expect(
      bannerSvg({
        preset: 'lowerThird',
        text: 'Rebecca Nunn',
        position: 'bottom',
        canvas,
      }),
    ).toContain('x="115"');
  });

  it('wraps and truncates a long heading', () => {
    const svg = bannerSvg({
      preset: 'lowerThird',
      text: 'A banner heading that runs far past the width of the frame and keeps going',
      subtitle: 'a subtitle that also runs far past the width of the frame',
      position: 'bottom',
      canvas,
    });

    expect(svg.match(/<text/g)).toHaveLength(3);
    expect(svg).toMatchSnapshot();
  });

  it('escapes the text', () => {
    expect(
      bannerSvg({
        preset: 'lowerThird',
        text: `Q&A: "the hub"`,
        position: 'bottom',
        canvas,
      }),
    ).toContain('Q&amp;A: &quot;the hub&quot;');
  });
});
