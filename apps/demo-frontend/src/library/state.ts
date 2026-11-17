import { useState } from 'react';

import type { FolderDeleteResult, Video } from '../api/types';
import { folderCount, videoCount } from '../utils/format';

export type ViewMode = 'grid' | 'list';
export type SortMode = 'newest' | 'oldest' | 'title';
export type StatusFilter = 'all' | 'published' | 'drafts';

const viewModeKey = 'demo-hub.library.view';

const readViewMode = (): ViewMode => {
  try {
    return window.localStorage.getItem(viewModeKey) === 'list'
      ? 'list'
      : 'grid';
  } catch {
    return 'grid';
  }
};

export const useViewMode = (): [ViewMode, (mode: ViewMode) => void] => {
  const [mode, setMode] = useState<ViewMode>(readViewMode);
  return [
    mode,
    (next: ViewMode) => {
      setMode(next);
      try {
        window.localStorage.setItem(viewModeKey, next);
      } catch {
        // a blocked storage should not break the toggle
      }
    },
  ];
};

export const sortLabels: Record<SortMode, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A-Z',
};

export const sortModes: readonly SortMode[] = ['newest', 'oldest', 'title'];

export const statusFilterLabels: Record<StatusFilter, string> = {
  all: 'All statuses',
  published: 'Published',
  drafts: 'Drafts',
};

export const statusFilters: readonly StatusFilter[] = [
  'all',
  'published',
  'drafts',
];

export const defaultSort: SortMode = 'newest';

export const defaultStatusFilter: StatusFilter = 'all';

// sort and status live in the url so that Back, a reload and a shared link all
// land on the same list rather than silently resetting it
export const parseSort = (value: string | null): SortMode =>
  sortModes.find((mode) => mode === value) ?? defaultSort;

export const parseStatusFilter = (value: string | null): StatusFilter =>
  statusFilters.find((filter) => filter === value) ?? defaultStatusFilter;

// the id breaks every tie, so "oldest" is the exact reverse of "newest"
// instead of two orders that only agree where the dates differ
const byRecordedAt = (a: Video, b: Video): number =>
  a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id);

const byTitle = (a: Video, b: Video): number =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
  a.id.localeCompare(b.id);

export const sortVideos = (
  videos: readonly Video[],
  mode: SortMode,
): Video[] => {
  const sorted = [...videos];
  if (mode === 'title') return sorted.sort(byTitle);
  return sorted.sort((a, b) =>
    mode === 'newest' ? -byRecordedAt(a, b) : byRecordedAt(a, b),
  );
};

export const matchesStatusFilter = (
  video: Video,
  filter: StatusFilter,
): boolean => {
  if (filter === 'published') return video.status === 'published';
  if (filter === 'drafts') return video.status === 'draft';
  return true;
};

// naming the demo is the only guard against deleting the wrong one when several
// of them are still called "Untitled demo"
const namedLimit = 3;

const quoted = (title: string): string => `“${title}”`;

const listed = (titles: readonly string[]): string =>
  titles.length <= namedLimit
    ? titles.map(quoted).join(', ')
    : `${titles.slice(0, namedLimit).map(quoted).join(', ')} and ${
        titles.length - namedLimit
      } more`;

export const deleteTitle = (titles: readonly string[]): string =>
  titles.length === 1 && titles[0]
    ? `Delete ${quoted(titles[0])}?`
    : `Delete ${videoCount(titles.length)}?`;

export const deleteWarning = (titles: readonly string[]): string =>
  titles.length === 1 && titles[0]
    ? `${quoted(
        titles[0],
      )} and its file will be permanently removed and cannot be recovered.`
    : `${listed(
        titles,
      )} and their files will be permanently removed and cannot be recovered.`;

// the server applies what it can and reports the rest back, so the page has to
// say which demos stayed behind and why
export type RefusedVideos = {
  readonly locked?: readonly string[];
  readonly missing?: readonly string[];
  readonly rendering?: readonly string[];
};

export const videoSubject = (
  ids: readonly string[],
  names: ReadonlyMap<string, string>,
): string => {
  const only = ids.length === 1 ? names.get(ids[0] as string) : undefined;
  return only ? quoted(only) : videoCount(ids.length);
};

export const refusedVideosMessage = (
  result: RefusedVideos | undefined,
  action: 'move' | 'delete',
  names: ReadonlyMap<string, string>,
): string | undefined => {
  const locked = result?.locked ?? [];
  const rendering = result?.rendering ?? [];
  const missing = result?.missing ?? [];

  const sentence = (ids: readonly string[], because: string, next: string) =>
    `We did not ${action} ${videoSubject(
      ids,
      names,
    )} because ${because}. ${next}`;

  const parts = [
    locked.length > 0
      ? sentence(
          locked,
          `another creator has ${locked.length === 1 ? 'it' : 'them'} open`,
          'Try again once they are done.',
        )
      : undefined,
    rendering.length > 0
      ? sentence(
          rendering,
          'an export is running',
          'Try again once the export finishes.',
        )
      : undefined,
    missing.length > 0
      ? sentence(
          missing,
          `${
            missing.length === 1 ? 'it is' : 'they are'
          } no longer in the library`,
          'Reload to see what is left.',
        )
      : undefined,
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join(' ') : undefined;
};

export const keptFolderMessage = (
  result: FolderDeleteResult | undefined,
  name: string,
): string | undefined => {
  const kept = result?.kept ?? [];
  if (kept.length === 0) return undefined;

  const locked = result?.locked ?? [];
  const rendering = result?.rendering ?? [];
  const reasons = [
    locked.length > 0
      ? `another creator has ${videoCount(locked.length)} inside open`
      : undefined,
    rendering.length > 0
      ? `an export is running on ${videoCount(rendering.length)} inside`
      : undefined,
  ].filter((reason): reason is string => reason !== undefined);

  const subject =
    kept.length === 1
      ? quoted(name)
      : `${quoted(name)} and ${folderCount(kept.length - 1)} inside it`;

  return `We kept ${subject} because ${
    reasons.length > 0
      ? reasons.join(' and ')
      : 'something inside could not be deleted'
  }. Try again once that is done.`;
};

export const matchesQuery = (video: Video, query: string): boolean =>
  video.title.toLowerCase().includes(query.toLowerCase());

// a studio render writes into media/{id}/r{n}/, so the poster only sits at the
// bare path for an upload the encoder produced
export const thumbnailUrl = (videoId: string, mediaPath?: string): string =>
  [
    '/media',
    encodeURIComponent(videoId),
    ...(mediaPath ? [encodeURIComponent(mediaPath)] : []),
    'thumb.jpg',
  ].join('/');
