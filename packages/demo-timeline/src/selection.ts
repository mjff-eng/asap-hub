import { ClipPlacement, layoutClips } from './clips';
import { Banner, NarrationClip, Timeline } from './schema';

// A span of programme time and where it lands in the picked cut. Spans are
// exclusive per clip: during a crossfade two placements share programme time,
// and mapping an item through both would put it in the cut twice, so each
// instant belongs to exactly one clip, the one that started most recently.
type SpanMap = { fromMs: number; toMs: number; atMs: number };

const exclusiveSpans = (
  placements: ClipPlacement[],
  kept: Set<string>,
  picked: ClipPlacement[],
): SpanMap[] =>
  placements.flatMap((placement, index) => {
    if (!kept.has(placement.clip.id)) {
      return [];
    }
    // the next clip only claims the overlap when it is in the cut too: a
    // dropped neighbour's crossfade no longer exists, and in the cut this
    // clip plays its whole length, tail included
    const next = placements[index + 1];
    const nextStartMs =
      next && kept.has(next.clip.id) ? next.startMs : placement.endMs;
    const at = picked.find((each) => each.clip.id === placement.clip.id);
    if (!at) {
      return [];
    }
    return [
      {
        fromMs: placement.startMs,
        toMs: Math.max(
          placement.startMs,
          Math.min(placement.endMs, nextStartMs),
        ),
        atMs: at.startMs,
      },
    ];
  });

type Segment = { startMs: number; durationMs: number; skippedMs: number };

// one piece per picked span the item crosses; adjacent pieces are put back
// together afterwards, so an item running over a kept pair stays whole
const segmentsOf = (
  startMs: number,
  durationMs: number,
  spans: SpanMap[],
): Segment[] => {
  const cut: Segment[] = [];
  spans.forEach((span) => {
    const fromMs = Math.max(startMs, span.fromMs);
    const toMs = Math.min(startMs + durationMs, span.toMs);
    if (toMs <= fromMs) {
      return;
    }
    cut.push({
      startMs: span.atMs + (fromMs - span.fromMs),
      durationMs: toMs - fromMs,
      skippedMs: fromMs - startMs,
    });
  });
  cut.sort((a, b) => a.startMs - b.startMs);

  return cut.reduce<Segment[]>((joined, piece) => {
    const last = joined[joined.length - 1];
    const continues =
      last &&
      piece.startMs === last.startMs + last.durationMs &&
      piece.skippedMs === last.skippedMs + last.durationMs;
    if (last && continues) {
      last.durationMs += piece.durationMs;
      return joined;
    }
    return [...joined, { ...piece }];
  }, []);
};

// suffixed only when an item was actually cut into pieces, so the common case
// keeps the id the document already had
const pieceId = (id: string, piece: number, pieces: number): string =>
  pieces === 1 ? id : `${id.slice(0, 60)}-${piece + 1}`;

// truncating to sixty characters can make two different ids mint the same
// piece id, and one duplicate makes the whole cut unparseable; a colliding id
// is renamed until it stands alone
const withUniqueIds = <T extends { id: string }>(
  items: T[],
  taken: Set<string>,
): T[] =>
  items.map((item) => {
    let { id } = item;
    for (let attempt = 2; taken.has(id); attempt += 1) {
      const suffix = `~${attempt}`;
      id = `${item.id.slice(0, 64 - suffix.length)}${suffix}`;
    }
    taken.add(id);
    return id === item.id ? item : { ...item, id };
  });

const pickedBanners = (banners: Banner[], spans: SpanMap[]): Banner[] =>
  banners.flatMap((banner) => {
    const segments = segmentsOf(banner.startMs, banner.durationMs, spans);
    return segments.map((segment, index) => ({
      ...banner,
      id: pieceId(banner.id, index, segments.length),
      startMs: segment.startMs,
      durationMs: segment.durationMs,
    }));
  });

const pickedNarration = (
  narration: NarrationClip[],
  spans: SpanMap[],
): NarrationClip[] =>
  narration.flatMap((take) => {
    const segments = segmentsOf(take.startMs, take.outMs - take.inMs, spans);
    return segments.map((segment, index) => ({
      ...take,
      id: pieceId(take.id, index, segments.length),
      startMs: segment.startMs,
      inMs: take.inMs + segment.skippedMs,
      outMs: take.inMs + segment.skippedMs + segment.durationMs,
    }));
  });

// The cut a picked set of clips makes, everything the clips carry included:
// their zooms, clicks, pointer walks and chapters travel on the clip id, and
// the banners and voice over takes are cut to the picked spans and re-timed
// into the new programme. A crossfade survives only between clips that were
// already neighbours, because a blend with a clip that is not in the cut has
// nothing to blend with.
export const keepClips = (timeline: Timeline, clipIds: string[]): Timeline => {
  const wanted = new Set(clipIds);
  const keptClips = timeline.clips.filter((clip) => wanted.has(clip.id));
  const kept = new Set(keptClips.map((clip) => clip.id));

  const clips = keptClips.map((clip, index) => {
    const before = timeline.clips[timeline.clips.indexOf(clip) - 1];
    const neighbourKept =
      index > 0 && before !== undefined && kept.has(before.id);
    if (neighbourKept || clip.transitionIn === undefined) {
      return clip;
    }
    return { ...clip, transitionIn: undefined };
  });

  const spans = exclusiveSpans(
    layoutClips(timeline.clips),
    kept,
    layoutClips(clips),
  );

  const onKeptClip = <T extends { clipId: string }>(items: T[]): T[] =>
    items.filter((item) => kept.has(item.clipId));

  const zooms = onKeptClip(timeline.zooms);
  const taken = new Set([
    ...clips.map((clip) => clip.id),
    ...zooms.map((zoom) => zoom.id),
  ]);

  return {
    ...timeline,
    clips,
    zooms,
    cursor: onKeptClip(timeline.cursor),
    chapters: onKeptClip(timeline.chapters),
    banners: withUniqueIds(pickedBanners(timeline.banners, spans), taken),
    narration: withUniqueIds(pickedNarration(timeline.narration, spans), taken),
  };
};
