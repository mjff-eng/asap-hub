import { RecordedPause } from '../schema';
import { CaptureEvent } from './types';

// One recorded take on the timeline, in the wall clock the capture events
// carry: the clip's cursor layer kept the instant its footage started, and the
// footage runs for the source's own duration from there, plus however long the
// take stood paused.
export type CaptureClipWindow = {
  clipId: string;
  recordedAtEpochMs: number;
  durationMs: number;
  pauses?: RecordedPause[];
};

// A pause writes no frames at all, so the footage jumps straight over it while
// the clock the capture stamps runs on. Every mapping from wall clock to the
// take's own time goes through here, so the preview and the export cannot drift
// apart: the source time of an instant is the wall clock with every pause that
// finished before it taken out.
export const totalPausedMs = (pauses: RecordedPause[] = []): number =>
  pauses.reduce((total, pause) => total + (pause.endMs - pause.startMs), 0);

export const pausedBeforeMs = (
  atEpochMs: number,
  pauses: RecordedPause[] = [],
): number =>
  pauses.reduce(
    (total, pause) =>
      atEpochMs >= pause.endMs ? total + (pause.endMs - pause.startMs) : total,
    0,
  );

// nothing was filmed then, so nothing captured then belongs to the footage
export const isDuringPause = (
  atEpochMs: number,
  pauses: RecordedPause[] = [],
): boolean =>
  pauses.some((pause) => atEpochMs >= pause.startMs && atEpochMs < pause.endMs);

// where an instant of wall clock lands in the take's own time; undefined for an
// instant the recorder was paused through
export const sourceTimeMs = (
  atEpochMs: number,
  recordedAtEpochMs: number,
  pauses: RecordedPause[] = [],
): number | undefined =>
  isDuringPause(atEpochMs, pauses)
    ? undefined
    : atEpochMs - recordedAtEpochMs - pausedBeforeMs(atEpochMs, pauses);

// A session outlives a take: the creator records, stops, fiddles with the
// studio and records again, all into the same event stream. Each event belongs
// to whichever take was filming when it happened, so the stream is cut into
// [start, start + duration + pauses] per clip, and an event that fell between
// takes, or during a pause, belongs to no clip and is dropped. Two clips of the
// same footage share the same window and both receive the events.
export const sliceCaptureEvents = (
  events: CaptureEvent[],
  windows: CaptureClipWindow[],
): Map<string, CaptureEvent[]> =>
  new Map(
    windows.map((window) => {
      const endsAt =
        window.recordedAtEpochMs +
        window.durationMs +
        totalPausedMs(window.pauses);
      return [
        window.clipId,
        events.filter(
          (event) =>
            event.t >= window.recordedAtEpochMs &&
            event.t <= endsAt &&
            !isDuringPause(event.t, window.pauses),
        ),
      ];
    }),
  );
