/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';

import { Button } from '../ui/components';
import {
  charcoal,
  ember,
  lead,
  mint,
  paper,
  rem,
  silver,
  steel,
} from '../ui/theme';
import { formatDuration } from '../utils/time';
import { ChapterRow, endMsOf, InvalidFields } from './chapters';

const tableStyles = css({
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: rem(15),
  'th, td': {
    textAlign: 'left' as const,
    padding: `${rem(8)} ${rem(12)}`,
    borderTop: `1px solid ${silver.rgb}`,
    verticalAlign: 'top' as const,
  },
  th: {
    fontSize: rem(12),
    letterSpacing: rem(1.2),
    textTransform: 'uppercase' as const,
    color: lead.rgb,
    borderTop: 'none',
    whiteSpace: 'nowrap' as const,
  },
  // the title column absorbs all spare width
  'th:nth-of-type(2)': { width: '100%' },
});

const activeRowStyles = css({ backgroundColor: mint.rgb });

const inputStyles = css({
  fontFamily: 'inherit',
  fontSize: rem(15),
  color: charcoal.rgb,
  padding: `${rem(6)} ${rem(8)}`,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(4),
  backgroundColor: paper.rgb,
  width: '100%',
  boxSizing: 'border-box' as const,
});

const timecodeInputStyles = css({
  width: rem(96),
  fontVariantNumeric: 'tabular-nums',
});

const invalidInputStyles = css({ borderColor: ember.rgb });

const derivedStyles = css({
  color: lead.rgb,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap' as const,
});

const inlineErrorStyles = css({
  color: ember.rgb,
  fontSize: rem(12),
  paddingTop: rem(4),
});

const emptyStyles = css({ color: lead.rgb });

const actionsCellStyles = css({
  whiteSpace: 'nowrap' as const,
  '& [data-hover-action]': { opacity: 0, transition: 'opacity 0.1s' },
  'tr:hover & [data-hover-action], tr:focus-within & [data-hover-action]': {
    opacity: 1,
  },
});

const ChapterTable: FC<{
  readonly rows: ChapterRow[];
  readonly drafts: Record<string, string>;
  readonly invalid: InvalidFields;
  readonly durationMs: number;
  readonly activeKey?: string;
  readonly readOnly: boolean;
  readonly titleRef: (
    key: string,
  ) => (element: HTMLInputElement | null) => void;
  readonly endDrafts: Record<string, string>;
  readonly endInvalid: InvalidFields;
  readonly onSeek: (startMs: number) => void;
  readonly onTimecodeChange: (key: string, value: string) => void;
  readonly onTimecodeFocus: (key: string) => void;
  readonly onTimecodeBlur: (key: string) => void;
  readonly onEndChange: (key: string, value: string) => void;
  readonly onEndFocus: (key: string) => void;
  readonly onEndBlur: (key: string) => void;
  readonly onTitleChange: (key: string, value: string) => void;
  readonly onDelete: (key: string) => void;
  readonly onInsertBefore: (key: string) => void;
  readonly onInsertAfter: (key: string) => void;
}> = ({
  rows,
  drafts,
  invalid,
  durationMs,
  activeKey,
  readOnly,
  titleRef,
  endDrafts,
  endInvalid,
  onSeek,
  onTimecodeChange,
  onTimecodeFocus,
  onTimecodeBlur,
  onEndChange,
  onEndFocus,
  onEndBlur,
  onTitleChange,
  onDelete,
  onInsertBefore,
  onInsertAfter,
}) => (
  <table css={tableStyles}>
    <thead>
      <tr>
        <th>Start</th>
        <th>Title</th>
        <th>End</th>
        <th>Length</th>
        <th aria-label="Actions" />
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => {
        const endMs = endMsOf(rows, index, durationMs);
        const invalidReason = invalid[row.key];
        const endInvalidReason = endInvalid[row.key];
        const isInvalid = Boolean(invalidReason);
        const isEndInvalid = Boolean(endInvalidReason);
        const isLast = index === rows.length - 1;
        return (
          <tr
            key={row.key}
            css={row.key === activeKey && activeRowStyles}
            onClick={(event) => {
              // clicks in the editable fields and buttons must not seek
              const target = event.target as HTMLElement;
              if (target.closest('input, button')) return;
              onSeek(row.startMs);
            }}
          >
            <td>
              <input
                css={[
                  inputStyles,
                  timecodeInputStyles,
                  isInvalid && invalidInputStyles,
                ]}
                type="text"
                aria-label={`Start time of chapter ${index + 1}`}
                aria-invalid={isInvalid}
                disabled={readOnly}
                value={drafts[row.key] ?? formatDuration(row.startMs)}
                onChange={(event) =>
                  onTimecodeChange(row.key, event.currentTarget.value)
                }
                onFocus={() => onTimecodeFocus(row.key)}
                onBlur={() => onTimecodeBlur(row.key)}
              />
              {isInvalid && (
                <div css={inlineErrorStyles} role="alert">
                  {invalidReason}
                </div>
              )}
            </td>
            <td>
              <input
                ref={titleRef(row.key)}
                css={inputStyles}
                type="text"
                placeholder="Chapter title"
                aria-label={`Title of chapter ${index + 1}`}
                disabled={readOnly}
                value={row.title}
                onChange={(event) =>
                  onTitleChange(row.key, event.currentTarget.value)
                }
              />
            </td>
            <td css={isLast || readOnly ? derivedStyles : undefined}>
              {isLast || readOnly ? (
                formatDuration(endMs)
              ) : (
                <>
                  <input
                    css={[
                      inputStyles,
                      timecodeInputStyles,
                      isEndInvalid && invalidInputStyles,
                    ]}
                    type="text"
                    aria-label={`End time of chapter ${index + 1}`}
                    aria-invalid={isEndInvalid}
                    value={endDrafts[row.key] ?? formatDuration(endMs)}
                    onChange={(event) =>
                      onEndChange(row.key, event.currentTarget.value)
                    }
                    onFocus={() => onEndFocus(row.key)}
                    onBlur={() => onEndBlur(row.key)}
                  />
                  {isEndInvalid && (
                    <div css={inlineErrorStyles} role="alert">
                      {endInvalidReason}
                    </div>
                  )}
                </>
              )}
            </td>
            <td css={derivedStyles}>
              {formatDuration(Math.max(0, endMs - row.startMs))}
            </td>
            <td css={actionsCellStyles}>
              {!readOnly && (
                <span css={{ display: 'inline-flex', gap: rem(6) }}>
                  <span data-hover-action>
                    <Button
                      small
                      aria-label={`Add chapter before chapter ${index + 1}`}
                      onClick={() => onInsertBefore(row.key)}
                    >
                      + Before
                    </Button>
                  </span>
                  <span data-hover-action>
                    <Button
                      small
                      aria-label={`Add chapter after chapter ${index + 1}`}
                      onClick={() => onInsertAfter(row.key)}
                    >
                      + After
                    </Button>
                  </span>
                  <Button
                    small
                    aria-label={`Delete chapter ${index + 1}`}
                    onClick={() => onDelete(row.key)}
                  >
                    Delete
                  </Button>
                </span>
              )}
            </td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr>
          <td colSpan={5} css={emptyStyles}>
            No chapters yet. Press M while the video plays to mark one.
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

export default ChapterTable;
