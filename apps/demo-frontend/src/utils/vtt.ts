export type ThumbnailCue = {
  startSeconds: number;
  endSeconds: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const parseTimestamp = (value: string): number => {
  const parts = value.trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return NaN;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

const cueLinePattern = /^(\S+)\s+-->\s+(\S+)/;

export const parseThumbnailsVtt = (source: string): ThumbnailCue[] => {
  const cues: ThumbnailCue[] = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const timing = cueLinePattern.exec(line.trim());
    if (!timing) return;

    const startSeconds = parseTimestamp(timing[1] as string);
    const endSeconds = parseTimestamp(timing[2] as string);
    if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) return;

    const payload = (lines[index + 1] ?? '').trim();
    const xywh = /#xywh=(\d+),(\d+),(\d+),(\d+)/.exec(payload);
    if (!xywh) return;

    cues.push({
      startSeconds,
      endSeconds,
      x: Number(xywh[1]),
      y: Number(xywh[2]),
      width: Number(xywh[3]),
      height: Number(xywh[4]),
    });
  });

  return cues;
};

const distanceTo = (cue: ThumbnailCue, seconds: number): number =>
  seconds < cue.startSeconds
    ? cue.startSeconds - seconds
    : Math.max(0, seconds - cue.endSeconds);

/**
 * The covering cue, or the nearest one when the sheet is sparse: a short demo
 * gets very few cues, so every preview outside them falls back to the closest
 * frame instead of always the last one.
 */
export const cueAt = (
  cues: ThumbnailCue[],
  seconds: number,
): ThumbnailCue | undefined => {
  const covering = cues.find(
    (cue) => seconds >= cue.startSeconds && seconds < cue.endSeconds,
  );
  if (covering) return covering;
  return cues.reduce<ThumbnailCue | undefined>(
    (nearest, cue) =>
      nearest && distanceTo(nearest, seconds) <= distanceTo(cue, seconds)
        ? nearest
        : cue,
    undefined,
  );
};
