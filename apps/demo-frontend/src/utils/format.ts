import type { Role, Video } from '../api/types';

// a library accumulates sprint demos, so a bare day and month makes a demo from
// two years ago read as this week's
export const formatUploadedOn = (
  isoDate: string,
  now: Date = new Date(),
): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(date);
};

// a studio project is assembled in the editor, so it was never uploaded
export const dateLabel = (video: Pick<Video, 'kind'>): string =>
  video.kind === 'studio' ? 'Created' : 'Uploaded';

const divisions: ReadonlyArray<{
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly seconds: number;
}> = [
  { unit: 'year', seconds: 31557600 },
  { unit: 'month', seconds: 2629800 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

export const formatEditedAgo = (
  isoDate: string,
  now: Date = new Date(),
): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const elapsed = (date.getTime() - now.getTime()) / 1000;
  const format = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  const division = divisions.find(
    ({ seconds }) => Math.abs(elapsed) >= seconds,
  );
  return division
    ? format.format(Math.round(elapsed / division.seconds), division.unit)
    : format.format(0, 'second');
};

export const roleLabel = (role: Role): string =>
  ({ admin: 'Admin', creator: 'Creator', member: 'Member' })[role];

export const videoCount = (count: number): string =>
  `${count} ${count === 1 ? 'video' : 'videos'}`;

export const folderCount = (count: number): string =>
  `${count} ${count === 1 ? 'folder' : 'folders'}`;

export const chapterCount = (count: number): string =>
  `${count} ${count === 1 ? 'chapter' : 'chapters'}`;
