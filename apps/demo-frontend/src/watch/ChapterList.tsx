/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';

import type { Chapter } from '../api/types';
import {
  charcoal,
  lead,
  mint,
  paper,
  pine,
  rem,
  silver,
  steel,
} from '../ui/theme';
import { formatDuration } from '../utils/time';
import { activeChapterIndex } from './playback';

const panelStyles = css({
  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(8),
  overflow: 'hidden',
});

const headingStyles = css({
  fontSize: rem(12),
  letterSpacing: rem(1.2),
  textTransform: 'uppercase',
  color: lead.rgb,
  fontWeight: 'bold',
  padding: `${rem(16)} ${rem(16)} ${rem(8)}`,
  margin: 0,
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  maxHeight: rem(420),
  overflowY: 'auto',
});

const itemButtonStyles = css({
  flex: 1,
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: `${rem(56)} 1fr`,
  gap: rem(12),
  alignItems: 'baseline',
  textAlign: 'left',
  border: 'none',
  borderTop: `1px solid ${silver.rgb}`,
  backgroundColor: 'transparent',
  padding: `${rem(10)} ${rem(16)}`,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: rem(15),
  color: charcoal.rgb,
  ':hover, :focus-visible': { backgroundColor: silver.rgb },
});

const activeItemStyles = css({
  backgroundColor: mint.rgb,
  color: pine.rgb,
  fontWeight: 'bold',
  ':hover, :focus-visible': { backgroundColor: mint.rgb },
});

const timeStyles = css({
  fontVariantNumeric: 'tabular-nums',
  color: lead.rgb,
  fontSize: rem(13),
});

const emptyStyles = css({
  padding: rem(16),
  color: lead.rgb,
  fontSize: rem(14),
});

const captionStyles = css({
  margin: 0,
  padding: `0 ${rem(16)} ${rem(8)}`,
  color: lead.rgb,
  fontSize: rem(12),
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'stretch',
  gap: rem(4),
});

// a sibling of the chapter button, never a child: an interactive element
// inside another is unreachable for assistive tech
const downloadStyles = css({
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${rem(10)}`,
  fontSize: rem(12),
  color: lead.rgb,
  textDecoration: 'none',
  borderRadius: rem(4),
  ':hover, :focus-visible': { backgroundColor: mint.rgb, color: pine.rgb },
});

const ChapterList: FC<{
  readonly chapters: Chapter[];
  readonly currentSeconds: number;
  readonly onSelect: (chapter: Chapter) => void;
  readonly onHover?: (chapter: Chapter | null) => void;
  // where a chapter's own file can be fetched, when the render published them;
  // a chapter the render cut no file for gets no url and no link
  readonly sectionUrlOf?: (index: number) => string | undefined;
  readonly sectionFileNameOf?: (chapter: Chapter) => string;
}> = ({
  chapters,
  currentSeconds,
  onSelect,
  onHover,
  sectionUrlOf,
  sectionFileNameOf,
}) => {
  const active = activeChapterIndex(chapters, currentSeconds);
  const sectionUrls = chapters.map((_chapter, index) => sectionUrlOf?.(index));

  return (
    <nav css={panelStyles} aria-label="Chapters">
      <h2 css={headingStyles}>Chapters</h2>
      {sectionUrls.some(Boolean) ? (
        <p css={captionStyles}>Each chapter can be downloaded on its own.</p>
      ) : null}
      {chapters.length === 0 ? (
        <p css={emptyStyles}>This demo has no chapters yet.</p>
      ) : (
        <ul css={listStyles}>
          {chapters.map((chapter, index) => (
            <li key={`${chapter.startMs}-${chapter.title}`} css={rowStyles}>
              <button
                type="button"
                css={[itemButtonStyles, index === active && activeItemStyles]}
                aria-current={index === active}
                onClick={() => onSelect(chapter)}
                onMouseEnter={() => onHover?.(chapter)}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => onHover?.(chapter)}
                onBlur={() => onHover?.(null)}
              >
                <span css={timeStyles}>{formatDuration(chapter.startMs)}</span>
                <span>{chapter.title}</span>
              </button>
              {sectionUrls[index] ? (
                <a
                  css={downloadStyles}
                  href={sectionUrls[index]}
                  download={sectionFileNameOf?.(chapter)}
                  aria-label={`Download ${chapter.title}`}
                  title={`Download ${chapter.title}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 18.5h16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};

export default ChapterList;
