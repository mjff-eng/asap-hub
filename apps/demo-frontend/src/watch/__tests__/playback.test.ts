import type { Chapter } from '../../api/types';
import {
  activeChapterIndex,
  chapterAt,
  chapterEndMs,
  clamp,
  clampTooltip,
} from '../playback';

const chapters: Chapter[] = [
  { startMs: 0, title: 'Intro' },
  { startMs: 60000, title: 'Middle' },
  { startMs: 180000, title: 'Outro' },
];

describe('activeChapterIndex', () => {
  it.each`
    seconds | expected
    ${0}    | ${0}
    ${59}   | ${0}
    ${60}   | ${1}
    ${179}  | ${1}
    ${180}  | ${2}
    ${9999} | ${2}
  `('returns $expected at $seconds', ({ seconds, expected }) => {
    expect(activeChapterIndex(chapters, seconds)).toEqual(expected);
  });

  it('reports no chapter before the first one starts', () => {
    expect(activeChapterIndex([{ startMs: 5000, title: 'Late' }], 0)).toEqual(
      -1,
    );
  });

  it('reports no chapter without chapters', () => {
    expect(activeChapterIndex([], 10)).toEqual(-1);
  });
});

describe('chapterAt', () => {
  it.each`
    seconds | expected
    ${0}    | ${'Intro'}
    ${59}   | ${'Intro'}
    ${60}   | ${'Middle'}
    ${179}  | ${'Middle'}
    ${180}  | ${'Outro'}
    ${9999} | ${'Outro'}
  `('returns $expected at $seconds', ({ seconds, expected }) => {
    expect(chapterAt(chapters, seconds)?.title).toEqual(expected);
  });

  // the control bar, the panel and the side list all read this one answer, so
  // nothing may be labelled before its chapter has started
  it('agrees with activeChapterIndex before the first chapter starts', () => {
    const late: Chapter[] = [{ startMs: 5000, title: 'Late' }];

    expect(chapterAt(late, 0)).toBeUndefined();
    expect(activeChapterIndex(late, 0)).toEqual(-1);
    expect(chapterAt(late, 5)?.title).toEqual('Late');
  });

  it('returns undefined without chapters', () => {
    expect(chapterAt([], 10)).toBeUndefined();
  });
});

describe('chapterEndMs', () => {
  it('uses the next chapter start', () => {
    expect(chapterEndMs(chapters, 0, 300000)).toEqual(60000);
  });

  it('uses the duration for the last chapter', () => {
    expect(chapterEndMs(chapters, 2, 300000)).toEqual(300000);
  });
});

describe('clamp', () => {
  it('bounds the value', () => {
    expect(clamp(-1, 0, 10)).toEqual(0);
    expect(clamp(11, 0, 10)).toEqual(10);
    expect(clamp(5, 0, 10)).toEqual(5);
  });
});

describe('clampTooltip', () => {
  it('keeps the tooltip inside the player', () => {
    expect(clampTooltip(0, 100, 600)).toEqual(58);
    expect(clampTooltip(600, 100, 600)).toEqual(542);
    expect(clampTooltip(300, 100, 600)).toEqual(300);
  });
});
