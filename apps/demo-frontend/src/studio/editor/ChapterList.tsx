/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { limits, ResolvedChapter } from '@asap-hub/demo-timeline';
import { FC, useEffect, useState } from 'react';
import { formatDuration, parseTimecode } from '../../utils/time';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';
import { fieldGesture, useGesture } from './gesture';
import { PlusIcon, TrashIcon } from './icons';

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
});

const timeButtonStyles = css({
  flexShrink: 0,
  width: 46,
  height: 26,
  borderRadius: 6,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  font: 'inherit',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'center',
  padding: 0,
  cursor: 'pointer',
});

const invalidTimeStyles = css({ borderColor: editorTheme.record });

const blankHintStyles = css({
  fontSize: 12,
  color: editorTheme.record,
  flexBasis: '100%',
});

const inputStyles = css({
  flex: 1,
  minWidth: 0,
  height: 26,
  borderRadius: 6,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  padding: '0 6px',
  font: 'inherit',
  fontSize: 12,
});

const fixedStyles = css({
  flex: 1,
  minWidth: 0,
  color: editorTheme.muted,
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  fontSize: 12,
  textAlign: 'left',
  cursor: 'pointer',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  ':hover': { textDecoration: 'underline' },
});

const emptyStyles = css({
  margin: 0,
  fontSize: 12,
  color: editorTheme.muted,
  lineHeight: 1.5,
});

const hintStyles = css({
  margin: 0,
  fontSize: 11,
  color: editorTheme.muted,
  lineHeight: 1.5,
});

// The timecode is editable as m:ss, which is the granularity the watch page
// shows, so a chapter can be retimed without dragging the playhead to it.
const ChapterTime: FC<{
  readonly startMs: number;
  readonly label: string;
  readonly readOnly: boolean;
  readonly onRetime: (startMs: number) => void;
}> = ({ startMs, label, readOnly, onRetime }) => {
  const [draft, setDraft] = useState(formatDuration(startMs));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) {
      setDraft(formatDuration(startMs));
    }
  }, [editing, startMs]);

  const parsed = parseTimecode(draft);

  return (
    <input
      css={[
        timeButtonStyles,
        editing && parsed === undefined && invalidTimeStyles,
      ]}
      aria-label={`Start of ${label}`}
      value={draft}
      disabled={readOnly}
      autoComplete="off"
      onFocus={() => setEditing(true)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (parsed !== undefined && parsed !== startMs) {
          onRetime(parsed);
        } else {
          setDraft(formatDuration(startMs));
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(formatDuration(startMs));
          event.currentTarget.blur();
        }
      }}
    />
  );
};

type Props = {
  readonly resolved: ResolvedChapter[];
  readonly readOnly: boolean;
  readonly canAdd: boolean;
  readonly onAdd: () => void;
  readonly onRename: (chapterId: string, title: string) => void;
  readonly onRetime: (chapterId: string, startMs: number) => void;
  readonly onRemove: (chapterId: string) => void;
  readonly onSelectTitle: (clipId: string) => void;
};

// Title cards are chapters by definition, so they show here as rows that lead
// back to the card: renaming, retiming or removing one is done on the card.
const ChapterList: FC<Props> = ({
  resolved,
  readOnly,
  canAdd,
  onAdd,
  onRename,
  onRetime,
  onRemove,
  onSelectTitle,
}) => {
  const gesture = useGesture();

  return (
    <>
      <EditorButton
        icon={<PlusIcon size={15} />}
        disabled={readOnly || !canAdd}
        onClick={onAdd}
      >
        Chapter at the playhead
      </EditorButton>

      {resolved.length === 0 ? (
        <p css={emptyStyles}>
          No chapters yet. Add one at the playhead, or drop in a title card and
          it becomes a chapter of its own.
        </p>
      ) : (
        <>
          <ul css={listStyles}>
            {resolved.map((chapter) => (
              <li key={chapter.id} css={rowStyles}>
                {chapter.kind === 'marker' ? (
                  <>
                    <ChapterTime
                      startMs={chapter.startMs}
                      label={chapter.title || 'this chapter'}
                      readOnly={readOnly}
                      onRetime={(startMs) => onRetime(chapter.id, startMs)}
                    />
                    <input
                      css={inputStyles}
                      value={chapter.title}
                      disabled={readOnly}
                      placeholder="Chapter name"
                      maxLength={limits.textLength}
                      autoComplete="off"
                      aria-label={`Name of the chapter at ${formatDuration(
                        chapter.startMs,
                      )}`}
                      // naming a chapter is one edit, not one per letter
                      onFocus={() => gesture.begin(fieldGesture)}
                      onBlur={() => gesture.end(fieldGesture)}
                      onChange={(event) =>
                        onRename(chapter.id, event.target.value)
                      }
                    />
                    <EditorButton
                      aria-label={`Remove the chapter at ${formatDuration(
                        chapter.startMs,
                      )}`}
                      icon={<TrashIcon size={14} />}
                      disabled={readOnly}
                      onClick={() => onRemove(chapter.id)}
                    />
                    {chapter.title.trim() === '' ? (
                      <span css={blankHintStyles} role="alert">
                        Chapters need a name to appear in the exported demo.
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span css={[timeButtonStyles, { lineHeight: '24px' }]}>
                      {formatDuration(chapter.startMs)}
                    </span>
                    <button
                      type="button"
                      css={fixedStyles}
                      title="Edit this title card"
                      onClick={() => onSelectTitle(chapter.id)}
                    >
                      {`${chapter.title} (title card)`}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p css={hintStyles}>
            A title card is its own chapter. Select one to rename it, move it or
            take it out.
          </p>
        </>
      )}
    </>
  );
};

export default ChapterList;
