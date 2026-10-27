import { Banner } from '@asap-hub/demo-timeline';
import { act, render, screen } from '@testing-library/react';
import { createRef, Profiler } from 'react';
import BannerLayer, { BannerLayerHandle } from '../BannerLayer';

// on screen from 1s to 4s, fading in and out over 300ms either side
const banner = (overrides: Partial<Banner> = {}): Banner => ({
  id: 'banner-1',
  startMs: 1000,
  durationMs: 3000,
  preset: 'lowerThird',
  text: 'Release 4.2',
  position: 'bottom',
  animation: 'fade',
  ...overrides,
});

const bandOf = (text: string): HTMLElement => {
  const band = screen.getByText(text).parentElement;
  if (!band) {
    throw new Error(`expected a band around ${text}`);
  }
  return band;
};

// how far a sliding banner sits from its resting place, in percent of its
// own height: below it is positive, above it negative
const offsetOf = (band: HTMLElement): number =>
  Number(/translateY\((-?[\d.]+)%\)/.exec(band.style.transform)?.[1] ?? 0);

describe('the banner layer', () => {
  it('shows a banner while the playhead is inside it', () => {
    render(
      <BannerLayer
        banners={[banner({ subtitle: 'Shipped on Friday' })]}
        tMs={2000}
      />,
    );

    expect(screen.getByText('Release 4.2')).toBeVisible();
    expect(screen.getByText('Shipped on Friday')).toBeVisible();
  });

  it('shows the heading alone when there is no subtitle', () => {
    render(<BannerLayer banners={[banner()]} tMs={2000} />);

    expect(bandOf('Release 4.2')).toHaveTextContent(/^Release 4\.2$/);
  });

  it('shows nothing before a banner starts or after it ends', () => {
    const before = render(<BannerLayer banners={[banner()]} tMs={500} />);
    expect(screen.queryByText('Release 4.2')).not.toBeInTheDocument();
    before.unmount();

    render(<BannerLayer banners={[banner()]} tMs={4500} />);
    expect(screen.queryByText('Release 4.2')).not.toBeInTheDocument();
  });

  it('draws a top banner as well as a bottom one', () => {
    render(
      <BannerLayer
        banners={[
          banner(),
          banner({ id: 'banner-2', text: 'Agenda', position: 'top' }),
        ]}
        tMs={2000}
      />,
    );

    expect(screen.getByText('Release 4.2')).toBeVisible();
    expect(screen.getByText('Agenda')).toBeVisible();
  });
});

describe('a sliding banner', () => {
  it('rises into place from below as it fades in', () => {
    render(
      <BannerLayer
        banners={[banner({ animation: 'slide' })]}
        tMs={1000 + 150}
      />,
    );

    expect(offsetOf(bandOf('Release 4.2'))).toBeCloseTo(15);
  });

  it('drops into place from above when it sits at the top', () => {
    render(
      <BannerLayer
        banners={[banner({ animation: 'slide', position: 'top' })]}
        tMs={1000 + 150}
      />,
    );

    expect(offsetOf(bandOf('Release 4.2'))).toBeCloseTo(-15);
  });

  it('rests in place once fully in', () => {
    render(
      <BannerLayer banners={[banner({ animation: 'slide' })]} tMs={2000} />,
    );

    expect(offsetOf(bandOf('Release 4.2'))).toBe(0);
  });

  it('does not move at all when it only fades', () => {
    render(<BannerLayer banners={[banner()]} tMs={1000 + 150} />);

    expect(offsetOf(bandOf('Release 4.2'))).toBe(0);
  });
});

describe('following the playhead', () => {
  it('brings a banner on as the playhead reaches it and takes it off after', () => {
    const ref = createRef<BannerLayerHandle>();
    render(<BannerLayer ref={ref} banners={[banner()]} tMs={0} />);
    expect(screen.queryByText('Release 4.2')).not.toBeInTheDocument();

    act(() => ref.current?.setTime(2000));
    expect(screen.getByText('Release 4.2')).toBeVisible();

    act(() => ref.current?.setTime(4500));
    expect(screen.queryByText('Release 4.2')).not.toBeInTheDocument();
  });

  // a fade is written straight to the node every frame; only a banner
  // arriving or leaving is worth a render
  it('fades a banner out without React committing a render', () => {
    const ref = createRef<BannerLayerHandle>();
    const commits: string[] = [];
    render(
      <Profiler id="banners" onRender={(id) => commits.push(id)}>
        <BannerLayer
          ref={ref}
          banners={[banner({ animation: 'slide' })]}
          tMs={2000}
        />
      </Profiler>,
    );
    const band = bandOf('Release 4.2');
    const mounted = commits.length;

    act(() => ref.current?.setTime(4000 - 150));

    expect(Number(band.style.opacity)).toBeCloseTo(0.5);
    expect(offsetOf(band)).toBeCloseTo(15);
    expect(commits).toHaveLength(mounted);
  });
});
