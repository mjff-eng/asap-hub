import { cueAt, parseThumbnailsVtt } from '../vtt';

const vtt = `WEBVTT

00:00.000 --> 00:10.000
sprite.jpg#xywh=0,0,160,90

00:10.000 --> 00:20.000
sprite.jpg#xywh=160,0,160,90
`;

describe('parseThumbnailsVtt', () => {
  it('parses cue timings and sprite coordinates', () => {
    expect(parseThumbnailsVtt(vtt)).toEqual([
      { startSeconds: 0, endSeconds: 10, x: 0, y: 0, width: 160, height: 90 },
      {
        startSeconds: 10,
        endSeconds: 20,
        x: 160,
        y: 0,
        width: 160,
        height: 90,
      },
    ]);
  });

  it('ignores cues without xywh coordinates', () => {
    expect(
      parseThumbnailsVtt('WEBVTT\n\n00:00.000 --> 00:10.000\nsprite.jpg'),
    ).toEqual([]);
  });

  it('parses hour-long timestamps', () => {
    const [cue] = parseThumbnailsVtt(
      'WEBVTT\n\n01:00:00.000 --> 01:00:10.000\nsprite.jpg#xywh=0,90,160,90',
    );
    expect(cue?.startSeconds).toEqual(3600);
  });
});

describe('cueAt', () => {
  const cues = parseThumbnailsVtt(vtt);

  it('finds the cue covering a time', () => {
    expect(cueAt(cues, 12)?.x).toEqual(160);
  });

  it('falls back to the last cue past the end', () => {
    expect(cueAt(cues, 999)?.x).toEqual(160);
  });

  it('falls back to the nearest cue before the sheet starts', () => {
    const late = parseThumbnailsVtt(
      'WEBVTT\n\n00:30.000 --> 00:40.000\nsprite.jpg#xywh=0,0,160,90\n\n00:40.000 --> 00:50.000\nsprite.jpg#xywh=160,0,160,90',
    );

    expect(cueAt(late, 0)?.x).toEqual(0);
  });

  // a short demo gets a single 10s cue from the server, so every preview shows
  // the same frame; the parser and lookup must still answer rather than throw
  it('answers from a sparse sheet with a single cue', () => {
    const sparse = parseThumbnailsVtt(
      'WEBVTT\n\n00:00.000 --> 00:10.000\nsprite.jpg#xywh=0,0,160,90',
    );

    expect(sparse).toHaveLength(1);
    expect(cueAt(sparse, 0)?.x).toEqual(0);
    expect(cueAt(sparse, 9.9)?.x).toEqual(0);
    expect(cueAt(sparse, 30)?.x).toEqual(0);
  });

  it('has no cue to offer for an empty sheet', () => {
    expect(cueAt([], 5)).toBeUndefined();
  });
});
