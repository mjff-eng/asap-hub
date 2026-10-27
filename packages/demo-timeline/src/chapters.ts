import { layoutClips } from './clips';
import { Timeline } from './schema';

export type ResolvedChapter = {
  // the marker's own id, or the title card's clip id: the editor needs a stable
  // identity so renaming a chapter does not remount its field on every keystroke
  id: string;
  kind: 'marker' | 'title';
  startMs: number;
  title: string;
};

const byStart = (a: ResolvedChapter, b: ResolvedChapter): number =>
  a.startMs - b.startMs;

// The watch page reads chapters off the video item, so the clip-anchored markers
// and the title cards have to be resolved into program time. A title card is a
// section heading by definition, so it becomes a chapter without being asked.
export type ResolveOptions = {
  // The editor shows every marker exactly as stored: a half typed name must not
  // make its row vanish under the cursor, and two markers landing on the same
  // frame have to stay visible or there is no way to delete the spare one. The
  // render collapses both cases, because a player cannot use them.
  forEditing?: boolean;
};

export const resolveChapters = (
  timeline: Timeline,
  { forEditing = false }: ResolveOptions = {},
): ResolvedChapter[] => {
  const placements = layoutClips(timeline.clips);
  // the editor re-resolves on every keystroke, so the markers are looked up
  // against an index rather than scanned against the clip list one by one
  const startByClipId = new Map(
    placements.map((placement) => [placement.clip.id, placement.startMs]),
  );

  const fromTitles = placements.flatMap((placement) =>
    placement.clip.kind === 'title' && placement.clip.text.trim()
      ? [
          {
            id: placement.clip.id,
            kind: 'title' as const,
            startMs: placement.startMs,
            title: placement.clip.text.trim(),
          },
        ]
      : [],
  );

  const fromMarkers = timeline.chapters.flatMap((marker) => {
    const start = startByClipId.get(marker.clipId);
    return start === undefined || (!marker.title.trim() && !forEditing)
      ? []
      : [
          {
            id: marker.id,
            kind: 'marker' as const,
            startMs: start + marker.offsetMs,
            // the editor keeps what is stored so a space being typed stays put,
            // and everything else gets the name the watch page should show
            title: forEditing ? marker.title : marker.title.trim(),
          },
        ];
  });

  const resolved = [...fromTitles, ...fromMarkers].sort(byStart);

  // two chapters on the same frame would give the player an empty segment
  return forEditing
    ? resolved
    : resolved.filter(
        (chapter, index) =>
          index === 0 || chapter.startMs !== resolved[index - 1]?.startMs,
      );
};

export type VideoChapter = { startMs: number; title: string };

// what the video row carries for the watch page: the editor's id and kind are
// its own business, and the row's schema does not declare them
export const videoChapters = (timeline: Timeline): VideoChapter[] =>
  resolveChapters(timeline).map(({ startMs, title }) => ({ startMs, title }));

export type SectionSpan = { startMs: number; endMs: number };

// one chapter's stretch of the finished stream, cut for its own download; the
// spans meet at the chapter starts and the last one runs to the end. A chapter
// that shares its start with the next one, or that starts at or after the end,
// has no stretch left and so gets no span and no file.
export const chapterSpan = (
  chapters: { startMs: number }[],
  index: number,
  durationMs: number,
): SectionSpan | undefined => {
  const chapter = chapters[index];
  if (!chapter) return undefined;
  const startMs = Math.max(0, Math.min(chapter.startMs, durationMs));
  const endMs = Math.min(
    chapters[index + 1]?.startMs ?? durationMs,
    durationMs,
  );
  return endMs > startMs ? { startMs, endMs } : undefined;
};

export const sectionSpans = (
  chapters: { startMs: number }[],
  durationMs: number,
): SectionSpan[] =>
  chapters.flatMap(
    (_chapter, index) => chapterSpan(chapters, index, durationMs) ?? [],
  );

// which section file each chapter was cut into, or undefined for a chapter that
// has none. The render names the files by their position among the spans it cut,
// so a chapter without a span leaves every later chapter's file one index lower,
// and sectionCount is how many of those cuts landed before the render gave up.
export const chapterSectionIndexes = (
  chapters: { startMs: number }[],
  durationMs: number,
  sectionCount: number,
): (number | undefined)[] => {
  let cut = 0;
  return chapters.map((_chapter, index) => {
    if (!chapterSpan(chapters, index, durationMs)) return undefined;
    const at = cut;
    cut += 1;
    return at < sectionCount ? at : undefined;
  });
};
