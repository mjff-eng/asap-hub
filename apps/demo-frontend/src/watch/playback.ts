import type { Chapter } from '../api/types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const ratioAt = (clientX: number, bounds: DOMRect): number =>
  bounds.width <= 0 ? 0 : clamp((clientX - bounds.left) / bounds.width, 0, 1);

/**
 * The single answer to "which chapter is at time t", shared by the control bar,
 * the in-player panel and the side list. Time before the first chapter starts
 * belongs to no chapter (-1): claiming chapter 1 there would label the picture
 * with a chapter that has not begun.
 */
export const activeChapterIndex = (
  chapters: readonly Chapter[],
  seconds: number,
): number => {
  const ms = seconds * 1000;
  let active = -1;
  chapters.forEach((chapter, index) => {
    if (chapter.startMs <= ms) active = index;
  });
  return active;
};

export const chapterAt = (
  chapters: readonly Chapter[],
  seconds: number,
): Chapter | undefined => chapters[activeChapterIndex(chapters, seconds)];

export const chapterEndMs = (
  chapters: Chapter[],
  index: number,
  durationMs: number,
): number => chapters[index + 1]?.startMs ?? durationMs;

export const clampTooltip = (
  left: number,
  width: number,
  playerWidth: number,
): number =>
  clamp(
    left,
    width / 2 + 8,
    Math.max(width / 2 + 8, playerWidth - width / 2 - 8),
  );
