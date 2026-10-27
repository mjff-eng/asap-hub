import {
  CaptureEvent,
  CaptureEventType,
  captureEventTypes,
  CaptureGeometry,
} from './types';

const isCaptureEventType = (value: unknown): value is CaptureEventType =>
  typeof value === 'string' &&
  (captureEventTypes as readonly string[]).includes(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const geometryFields = [
  'screenX',
  'screenY',
  'screenW',
  'screenH',
  'screenLeft',
  'screenTop',
  'winX',
  'winY',
  'winW',
  'winH',
] as const;

// a stream written before the snippet reported the screen simply has none of
// these, and the event maps through the viewport the way it always did
const geometryOf = (record: Record<string, unknown>): CaptureGeometry =>
  geometryFields.reduce<CaptureGeometry>((geometry, field) => {
    const value = record[field];
    return isFiniteNumber(value) ? { ...geometry, [field]: value } : geometry;
  }, {});

const toCaptureEvent = (line: string): CaptureEvent | undefined => {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const {
    id,
    client,
    type,
    t,
    x,
    y,
    viewportW,
    viewportH,
    devicePixelRatio,
    target,
    platform,
  } = record;
  if (typeof id !== 'string' || id.length === 0 || !isCaptureEventType(type)) {
    return undefined;
  }
  if (
    !isFiniteNumber(t) ||
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(viewportW) ||
    !isFiniteNumber(viewportH)
  ) {
    return undefined;
  }

  return {
    id,
    ...(typeof client === 'string' && client.length > 0 ? { client } : {}),
    ...(isFiniteNumber(devicePixelRatio) && devicePixelRatio > 0
      ? { devicePixelRatio }
      : {}),
    type,
    t,
    x,
    y,
    viewportW,
    viewportH,
    ...geometryOf(record),
    ...(isFiniteNumber(devicePixelRatio) && devicePixelRatio > 0
      ? { devicePixelRatio }
      : {}),
    ...(typeof target === 'string' ? { target } : {}),
    ...(typeof platform === 'string' && platform.length > 0
      ? { platform }
      : {}),
  };
};

// The snippet injected into one page more than once runs a full reporter per
// copy, and every copy reports the same pointer under its own event ids. The
// copies read the same clock and the same pointer, so an event repeating
// another's instant, type and position is the same event and only one is kept.
export const dedupeCaptureEvents = (events: CaptureEvent[]): CaptureEvent[] => {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.t}|${event.type}|${event.x}|${event.y}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// the stream is written by a snippet running in someone else's page, so a
// truncated or unknown line is skipped rather than failing the whole recording
export const parseCaptureEvents = (ndjson: string): CaptureEvent[] =>
  dedupeCaptureEvents(
    ndjson
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .flatMap((line) => {
        const event = toCaptureEvent(line);
        return event ? [event] : [];
      }),
  );
