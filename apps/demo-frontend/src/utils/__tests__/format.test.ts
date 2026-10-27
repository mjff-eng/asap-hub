import type { Role } from '../../api/types';
import {
  chapterCount,
  dateLabel,
  folderCount,
  formatEditedAgo,
  formatUploadedOn,
  roleLabel,
  videoCount,
} from '../format';

const now = new Date('2026-08-28T12:00:00.000Z');

describe('formatUploadedOn', () => {
  it.each([
    ['2026-08-14T09:00:00.000Z', '14 Aug'],
    ['2026-01-01T23:59:59.000Z', '1 Jan'],
    ['2026-12-31T00:00:00.000Z', '31 Dec'],
  ])('leaves the current year off %s', (iso, expected) => {
    expect(formatUploadedOn(iso, now)).toBe(expected);
  });

  it.each([
    ['2024-08-14T09:00:00.000Z', '14 Aug 2024'],
    ['2027-01-01T00:00:00.000Z', '1 Jan 2027'],
  ])('names the year of %s', (iso, expected) => {
    expect(formatUploadedOn(iso, now)).toBe(expected);
  });

  it.each(['', 'not-a-date'])('returns an empty string for %p', (input) => {
    expect(formatUploadedOn(input, now)).toBe('');
  });
});

describe('dateLabel', () => {
  it('calls an upload uploaded', () => {
    expect(dateLabel({ kind: 'upload' })).toBe('Uploaded');
  });

  it('never claims a studio project was uploaded', () => {
    expect(dateLabel({ kind: 'studio' })).toBe('Created');
  });
});

describe('formatEditedAgo', () => {
  it.each([
    ['2026-08-28T11:59:40.000Z', 'now'],
    ['2026-08-28T11:30:00.000Z', '30 minutes ago'],
    ['2026-08-28T09:00:00.000Z', '3 hours ago'],
    ['2026-08-26T12:00:00.000Z', '2 days ago'],
    ['2026-08-14T12:00:00.000Z', '2 weeks ago'],
    ['2026-05-28T12:00:00.000Z', '3 months ago'],
    ['2024-08-28T12:00:00.000Z', '2 years ago'],
  ])('describes %s as %s', (iso, expected) => {
    expect(formatEditedAgo(iso, now)).toBe(expected);
  });

  it.each(['', 'not-a-date'])('returns an empty string for %p', (input) => {
    expect(formatEditedAgo(input, now)).toBe('');
  });
});

describe('roleLabel', () => {
  it.each<[Role, string]>([
    ['admin', 'Admin'],
    ['creator', 'Creator'],
    ['member', 'Member'],
  ])('labels %s as %s', (role, expected) => {
    expect(roleLabel(role)).toBe(expected);
  });
});

describe('counts', () => {
  it.each([
    [0, '0 videos'],
    [1, '1 video'],
    [2, '2 videos'],
  ])('pluralises %i videos', (count, expected) => {
    expect(videoCount(count)).toBe(expected);
  });

  it.each([
    [0, '0 folders'],
    [1, '1 folder'],
    [5, '5 folders'],
  ])('pluralises %i folders', (count, expected) => {
    expect(folderCount(count)).toBe(expected);
  });

  it.each([
    [1, '1 chapter'],
    [4, '4 chapters'],
  ])('pluralises %i chapters', (count, expected) => {
    expect(chapterCount(count)).toBe(expected);
  });
});
