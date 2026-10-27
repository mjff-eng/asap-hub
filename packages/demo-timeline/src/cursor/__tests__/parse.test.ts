import { parseCaptureEvents } from '../parse';

const line = (event: Record<string, unknown>): string => JSON.stringify(event);

const move = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  type: 'move',
  t: 1_000,
  x: 640,
  y: 360,
  viewportW: 1280,
  viewportH: 720,
  devicePixelRatio: 2,
  screenX: 100,
  screenY: 200,
  ...overrides,
});

describe('parseCaptureEvents', () => {
  // the screen geometry places a whole screen or window recording, and the
  // pixel ratio reads the footage's own size against those boxes
  it('reads one event per line and keeps only the fields the derivation needs', () => {
    expect(parseCaptureEvents(`${line(move())}\n`)).toEqual([
      {
        id: 'e1',
        type: 'move',
        devicePixelRatio: 2,
        screenX: 100,
        screenY: 200,
        t: 1_000,
        x: 640,
        y: 360,
        viewportW: 1280,
        viewportH: 720,
      },
    ]);
  });

  it('keeps a target when the snippet recorded one', () => {
    const [event] = parseCaptureEvents(
      line(move({ id: 'e2', type: 'over', target: 'button.primary' })),
    );

    expect(event?.target).toBe('button.primary');
  });

  it('ignores blank lines and surrounding whitespace', () => {
    expect(
      parseCaptureEvents(
        `\n  ${line(move())}  \n\n${line(move({ id: 'e2', t: 1_050 }))}`,
      ),
    ).toHaveLength(2);
  });

  it('skips a truncated line rather than failing the whole recording', () => {
    const events = parseCaptureEvents(
      [
        line(move()),
        '{"id":"e2","type":"mo',
        line(move({ id: 'e3', t: 1_050 })),
      ].join('\n'),
    );

    expect(events.map(({ id }) => id)).toEqual(['e1', 'e3']);
  });

  it.each([
    ['an unknown type', move({ type: 'visibility' })],
    ['a missing id', { ...move(), id: undefined }],
    ['a non-numeric timestamp', move({ t: 'now' })],
    ['a missing viewport', { ...move(), viewportW: undefined }],
    ['an infinite coordinate', move({ x: Infinity })],
  ])('drops a line with %s', (_label, event) => {
    expect(parseCaptureEvents(line(event))).toEqual([]);
  });

  it('drops a line that is not an object', () => {
    expect(parseCaptureEvents('42\n"nope"\nnull')).toEqual([]);
  });

  // seen in a real capture: the snippet injected three times into one page ran
  // three reporters, and every event arrived three times under three ids
  it('keeps one of the copies a stacked snippet reported', () => {
    const events = parseCaptureEvents(
      [
        line(move({ id: 'e86', type: 'click', t: 5_000 })),
        line(move({ id: 'e135', type: 'click', t: 5_000 })),
        line(move({ id: 'e208', type: 'click', t: 5_000 })),
        line(move({ id: 'e87', type: 'move', t: 5_050, x: 700 })),
      ].join('\n'),
    );

    expect(events.map(({ id }) => id)).toEqual(['e86', 'e87']);
  });

  it('keeps two genuine events that only differ in position', () => {
    const events = parseCaptureEvents(
      [
        line(move({ id: 'e1', t: 5_000, x: 640 })),
        line(move({ id: 'e2', t: 5_000, x: 644 })),
      ].join('\n'),
    );

    expect(events).toHaveLength(2);
  });
});

// a whole screen or a window recording cannot be placed without them
describe('the screen geometry', () => {
  it('reads every field the mappings need', () => {
    const [event] = parseCaptureEvents(
      line(
        move({
          screenW: 1920,
          screenH: 1080,
          screenLeft: -1920,
          screenTop: 0,
          winX: 40,
          winY: 25,
          winW: 1280,
          winH: 800,
        }),
      ),
    );

    expect(event).toEqual(
      expect.objectContaining({
        screenW: 1920,
        screenH: 1080,
        screenLeft: -1920,
        screenTop: 0,
        winX: 40,
        winY: 25,
        winW: 1280,
        winH: 800,
      }),
    );
  });

  it('leaves out anything the snippet did not send, rather than inventing a zero', () => {
    const [event] = parseCaptureEvents(
      line({
        id: 'e3',
        type: 'move',
        t: 1000,
        x: 10,
        y: 20,
        viewportW: 800,
        viewportH: 600,
      }),
    );

    expect(event).not.toHaveProperty('screenW');
    expect(event).not.toHaveProperty('winX');
  });

  it('drops a field that is not a number at all', () => {
    const [event] = parseCaptureEvents(line(move({ screenW: 'wide' })));

    expect(event).not.toHaveProperty('screenW');
    expect(event?.screenX).toBe(100);
  });

  it('keeps the platform, which is what a fabricated origin is told by', () => {
    const [event] = parseCaptureEvents(line(move({ platform: 'Win32' })));

    expect(event?.platform).toBe('Win32');
  });

  it('leaves out a platform the snippet never sent', () => {
    expect(parseCaptureEvents(line(move()))[0]).not.toHaveProperty('platform');
  });

  it('keeps the tab an event was reported by', () => {
    const [event] = parseCaptureEvents(line(move({ client: 'tab-a' })));

    expect(event?.client).toBe('tab-a');
  });

  it('leaves out a tab a stream written before it was sent never named', () => {
    expect(parseCaptureEvents(line(move()))[0]).not.toHaveProperty('client');
  });
});
