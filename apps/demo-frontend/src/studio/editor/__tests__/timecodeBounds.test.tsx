import {
  Banner,
  ClipPlacement,
  createEmptyTimeline,
  limits,
  NarrationClip,
  timelineSchema,
  TitleClip,
  Zoom,
} from '@asap-hub/demo-timeline';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useState } from 'react';
import BannerInspector from '../BannerInspector';
import NarrationInspector from '../NarrationInspector';
import TitleCardInspector from '../TitleCardInspector';
import ZoomInspector from '../ZoomInspector';

// far past the four hours the document allows, in the m:ss.cc the fields read
const absurd = '99999999:00.00';

const type = async (label: RegExp, text: string): Promise<void> => {
  const field = screen.getByLabelText(label);
  await userEvent.clear(field);
  await userEvent.type(field, `${text}{Enter}`);
};

const aZoom: Zoom = {
  id: 'zoom-1',
  clipId: 'clip-1',
  startMs: 1000,
  rampInMs: 500,
  holdMs: 1000,
  rampOutMs: 500,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
};

const aBanner: Banner = {
  id: 'banner-1',
  startMs: 1000,
  durationMs: 4000,
  preset: 'lowerThird',
  text: 'Attendance',
  position: 'bottom',
  animation: 'fade',
};

const aTitle: TitleClip = {
  kind: 'title',
  id: 'clip-1',
  durationMs: 4000,
  preset: 'centered',
  text: 'Attendance',
};

const aNarration: NarrationClip = {
  id: 'narration-1',
  assetId: 'asset-1',
  startMs: 1000,
  inMs: 0,
  outMs: 8000,
  volume: 1,
};

const placementOf = (clip: TitleClip): ClipPlacement => ({
  clip,
  index: 0,
  startMs: 0,
  endMs: clip.durationMs,
  durationMs: clip.durationMs,
  overlapMs: 0,
});

const EditableZoom: FC<{
  readonly spanMs?: number;
  readonly onZoom: (zoom: Zoom) => void;
}> = ({ spanMs, onZoom }) => {
  const [zoom, setZoom] = useState(aZoom);
  return (
    <ZoomInspector
      zoom={zoom}
      readOnly={false}
      {...(spanMs !== undefined ? { spanMs } : {})}
      onChange={(change) => {
        const next = { ...zoom, ...change };
        setZoom(next);
        onZoom(next);
      }}
      onRemove={jest.fn()}
    />
  );
};

const EditableBanner: FC<{
  readonly programmeMs?: number;
  readonly onBanner: (banner: Banner) => void;
}> = ({ programmeMs, onBanner }) => {
  const [banner, setBanner] = useState(aBanner);
  return (
    <BannerInspector
      banner={banner}
      {...(programmeMs !== undefined ? { programmeMs } : {})}
      readOnly={false}
      onChange={(change) => {
        const next = { ...banner, ...change };
        setBanner(next);
        onBanner(next);
      }}
      onRemove={jest.fn()}
    />
  );
};

const EditableTitle: FC<{ readonly onTitle: (clip: TitleClip) => void }> = ({
  onTitle,
}) => {
  const [clip, setClip] = useState(aTitle);
  return (
    <TitleCardInspector
      placement={placementOf(clip)}
      clip={clip}
      readOnly={false}
      onChange={(change) => {
        const next = { ...clip, ...change };
        setClip(next);
        onTitle(next);
      }}
      onRemove={jest.fn()}
    />
  );
};

const EditableNarration: FC<{
  readonly onNarration: (narration: NarrationClip) => void;
}> = ({ onNarration }) => {
  const [narration, setNarration] = useState(aNarration);
  return (
    <NarrationInspector
      narration={narration}
      readOnly={false}
      onChange={(change) => {
        const next = { ...narration, ...change };
        setNarration(next);
        onNarration(next);
      }}
      onRemove={jest.fn()}
    />
  );
};

const zoomDocument = (zoom: Zoom) => ({
  ...createEmptyTimeline(),
  clips: [aTitle],
  zooms: [zoom],
});

// One typed time used to make the whole document fail its own schema, so every
// save after it was rejected until the creator found and undid the value.
describe('a time typed past what the document allows', () => {
  it('leaves a zoom the document still accepts', async () => {
    const onZoom = jest.fn();
    render(<EditableZoom onZoom={onZoom} />);

    await type(/Ramp in/, absurd);

    const zoom = onZoom.mock.calls.at(-1)?.[0] as Zoom;
    expect(zoom.rampInMs).toBe(limits.maxTimelineMs);
    expect(timelineSchema.safeParse(zoomDocument(zoom)).success).toBe(true);
  });

  it('leaves a hold the document still accepts', async () => {
    const onZoom = jest.fn();
    render(<EditableZoom onZoom={onZoom} />);

    await type(/Hold/, absurd);

    const zoom = onZoom.mock.calls.at(-1)?.[0] as Zoom;
    expect(zoom.holdMs).toBe(limits.maxTimelineMs);
    expect(timelineSchema.safeParse(zoomDocument(zoom)).success).toBe(true);
  });

  it('leaves a ramp out the document still accepts', async () => {
    const onZoom = jest.fn();
    render(<EditableZoom onZoom={onZoom} />);

    await type(/Ramp out/, absurd);

    const zoom = onZoom.mock.calls.at(-1)?.[0] as Zoom;
    expect(zoom.rampOutMs).toBe(limits.maxTimelineMs);
    expect(timelineSchema.safeParse(zoomDocument(zoom)).success).toBe(true);
  });

  it('leaves a banner the document still accepts', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner onBanner={onBanner} />);

    await type(/Length/, absurd);

    const banner = onBanner.mock.calls.at(-1)?.[0] as Banner;
    expect(banner.durationMs).toBe(limits.maxTimelineMs);
    expect(
      timelineSchema.safeParse({ ...createEmptyTimeline(), banners: [banner] })
        .success,
    ).toBe(true);
  });

  it('leaves a title card the document still accepts', async () => {
    const onTitle = jest.fn();
    render(<EditableTitle onTitle={onTitle} />);

    await type(/Length/, absurd);

    const clip = onTitle.mock.calls.at(-1)?.[0] as TitleClip;
    expect(clip.durationMs).toBe(limits.maxTimelineMs);
    expect(
      timelineSchema.safeParse({ ...createEmptyTimeline(), clips: [clip] })
        .success,
    ).toBe(true);
  });

  it('leaves a voice over the document still accepts', async () => {
    const onNarration = jest.fn();
    render(<EditableNarration onNarration={onNarration} />);

    await type(/Starts at/, absurd);

    const narration = onNarration.mock.calls.at(-1)?.[0] as NarrationClip;
    expect(narration.startMs).toBe(limits.maxTimelineMs);
    expect(
      timelineSchema.safeParse({
        ...createEmptyTimeline(),
        narration: [narration],
      }).success,
    ).toBe(true);
  });
});

describe('a time typed past what the surrounding data allows', () => {
  // the four parts of a zoom share the clip it is anchored to
  it('keeps a ramp inside the clip the zoom sits in', async () => {
    const onZoom = jest.fn();
    render(<EditableZoom spanMs={5000} onZoom={onZoom} />);

    await type(/Ramp in/, absurd);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest this can be is 0:02.50.',
    );
    expect(onZoom).toHaveBeenLastCalledWith(
      expect.objectContaining({ rampInMs: 2500 }),
    );
  });

  it('keeps a hold inside the clip the zoom sits in', async () => {
    const onZoom = jest.fn();
    render(<EditableZoom spanMs={5000} onZoom={onZoom} />);

    await type(/Hold/, absurd);

    expect(onZoom).toHaveBeenLastCalledWith(
      expect.objectContaining({ holdMs: 3000 }),
    );
  });

  it('keeps a ramp out inside the clip the zoom sits in', async () => {
    const onZoom = jest.fn();
    render(<EditableZoom spanMs={5000} onZoom={onZoom} />);

    await type(/Ramp out/, absurd);

    expect(onZoom).toHaveBeenLastCalledWith(
      expect.objectContaining({ rampOutMs: 2500 }),
    );
  });

  // the banner starts a second in, so the programme only has eleven left to give
  it('keeps a banner from outlasting the programme', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Length/, absurd);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest this can be is 0:11.00.',
    );
    expect(onBanner).toHaveBeenLastCalledWith(
      expect.objectContaining({ durationMs: 11000 }),
    );
  });

  it('measures the length left from wherever the banner now starts', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, '0:10.00');
    await type(/Length/, absurd);

    expect(onBanner).toHaveBeenLastCalledWith(
      expect.objectContaining({ startMs: 10000, durationMs: 2000 }),
    );
  });

  // a start is where the creator is going, not what they have settled on, so it
  // is held to the programme itself rather than to the length still on the banner
  it('lets a banner start anywhere inside the programme', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, absurd);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest this can be is 0:12.00.',
    );
    expect(onBanner).toHaveBeenLastCalledWith(
      expect.objectContaining({ startMs: 12000 }),
    );
  });
});

const lengthsSeenBy = (onBanner: jest.Mock): number[] =>
  onBanner.mock.calls.map(([banner]: [Banner]) => banner.durationMs);

// A banner ends inside the programme, but it is also never shorter than the
// length below which it draws nothing and its block cannot be grabbed. The two
// bounds meet at the end of the programme, and it used to be the length that
// lost, all the way down to a banner of no length at all.
describe('a banner start and length held against the programme together', () => {
  it('keeps a banner long enough to see when its start spends the programme', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, '0:12.00');
    await type(/Length/, '0:03.00');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest this can be is 0:00.20.',
    );
    const banner = onBanner.mock.calls.at(-1)?.[0] as Banner;
    expect(banner.durationMs).toBe(200);
  });

  it('never writes a banner with no length at all', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, '0:12.00');
    await type(/Length/, '0:00.00');

    expect(lengthsSeenBy(onBanner)).not.toContain(0);
    expect(Math.min(...lengthsSeenBy(onBanner))).toBeGreaterThanOrEqual(200);
  });

  it('shortens a length the moved start no longer has room for', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, '0:11.00');

    expect(onBanner).toHaveBeenLastCalledWith(
      expect.objectContaining({ startMs: 11000, durationMs: 1000 }),
    );
    const banner = onBanner.mock.calls.at(-1)?.[0] as Banner;
    expect(banner.startMs + banner.durationMs).toBe(12000);
  });

  it('leaves a length the moved start still has room for', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, '0:03.00');

    expect(onBanner).toHaveBeenLastCalledWith(
      expect.objectContaining({ startMs: 3000, durationMs: 4000 }),
    );
  });

  it('leaves a banner the document still accepts once its start has spent the programme', async () => {
    const onBanner = jest.fn();
    render(<EditableBanner programmeMs={12000} onBanner={onBanner} />);

    await type(/Starts at/, '0:12.00');

    const banner = onBanner.mock.calls.at(-1)?.[0] as Banner;
    expect(banner.durationMs).toBe(200);
    expect(
      timelineSchema.safeParse({ ...createEmptyTimeline(), banners: [banner] })
        .success,
    ).toBe(true);
  });
});
