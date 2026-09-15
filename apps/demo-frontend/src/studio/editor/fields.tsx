/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { limits, Point } from '@asap-hub/demo-timeline';
import { ChangeEvent, FC, ReactNode, useEffect, useId, useState } from 'react';
import { editorTheme } from './editorTheme';
import { fieldGesture, useGesture } from './gesture';
import { formatMs, parseMs } from './timecode';

// the label and its control, for the fields below and for the one-off controls
// an inspector needs that are not worth a component of their own
export const fieldStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: editorTheme.muted,
});

const controlStyles = css({
  height: 30,
  borderRadius: 6,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  padding: '0 8px',
  font: 'inherit',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
});

const invalidStyles = css({ borderColor: editorTheme.record });

// Both side panels are taller than a laptop screen. An overlay scrollbar draws
// nothing until the pointer is already moving, so the controls below the fold
// looked as though they did not exist: the track and thumb stay drawn instead.
export const scrollingStyles = css({
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'thin',
  scrollbarColor: `${editorTheme.muted} ${editorTheme.surface}`,
  '::-webkit-scrollbar': { width: 10 },
  '::-webkit-scrollbar-track': { backgroundColor: editorTheme.surface },
  '::-webkit-scrollbar-thumb': {
    backgroundColor: editorTheme.muted,
    borderRadius: 5,
    border: `2px solid ${editorTheme.surface}`,
  },
});

export const panelStyles = css(scrollingStyles, {
  gridColumn: 3,
  gridRow: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  borderLeft: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.panel,
  width: 260,
  flexShrink: 0,
  '@media (max-width: 1100px)': { width: 'auto', borderLeft: 0, gridColumn: 1 },
});

export const panelHeadingStyles = css({
  margin: 0,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: editorTheme.muted,
});

export const mutedStyles = css({ color: editorTheme.muted, fontSize: 13 });

export const readingStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
});

// The server rejects any text past this, and it rejects the whole document, so
// a pasted heading that is too long used to make every later save fail as well.
export const TextField: FC<{
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
}> = ({ label, value, disabled, placeholder, onChange }) => {
  const gesture = useGesture();
  return (
    <label css={fieldStyles}>
      {label}
      <input
        css={controlStyles}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={limits.textLength}
        autoComplete="off"
        // typing a name is one edit, not one per letter: without this two
        // headings used half the hundred steps undo keeps
        onFocus={() => gesture.begin(fieldGesture)}
        onBlur={() => gesture.end(fieldGesture)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
      />
    </label>
  );
};

export const SelectField: FC<{
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly options: { value: string; label: string }[];
  readonly onChange: (value: string) => void;
}> = ({ label, value, disabled, options, onChange }) => (
  <label css={fieldStyles}>
    {label}
    <select
      css={controlStyles}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const sliderStyles = css({ width: '100%', accentColor: editorTheme.playhead });

const fadeLimitMs = 2000;
const fadeStepMs = 50;

const describeFade = (ms: number): string =>
  ms === 0 ? 'instant' : `${(ms / 1000).toFixed(2)}s`;

// dragging a slider is one edit however many values it passes through on the way
export const FadeField: FC<{
  readonly label: string;
  readonly value: number;
  readonly disabled?: boolean;
  readonly onChange: (ms: number) => void;
}> = ({ label, value, disabled, onChange }) => {
  const gesture = useGesture();
  return (
    <label css={fieldStyles}>
      {`${label} ${describeFade(value)}`}
      <input
        css={sliderStyles}
        type="range"
        min={0}
        max={fadeLimitMs}
        step={fadeStepMs}
        disabled={disabled}
        value={Math.min(fadeLimitMs, value)}
        onFocus={() => gesture.begin(fieldGesture)}
        onBlur={() => gesture.end(fieldGesture)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
      />
    </label>
  );
};

const nudgeStepMs = 50;

// signed and read in seconds, because what the creator is judging is how far
// the capture sits from the footage, not a count of milliseconds
const describeNudge = (ms: number): string => {
  if (ms === 0) {
    return 'in step with the video';
  }
  const seconds = (Math.abs(ms) / 1000).toFixed(2);
  return ms > 0 ? `${seconds}s later` : `${seconds}s earlier`;
};

// Slides a whole cursor capture against the clip it belongs to. The origin is
// derived from the take, so this is only ever the residual, but an imported
// video has no derived origin at all and this is the only alignment it has.
export const NudgeField: FC<{
  readonly label: string;
  readonly value: number;
  readonly limitMs: number;
  readonly disabled?: boolean;
  readonly onChange: (ms: number) => void;
}> = ({ label, value, limitMs, disabled, onChange }) => {
  const gesture = useGesture();
  const bounded = Math.max(-limitMs, Math.min(limitMs, value));
  return (
    <label css={fieldStyles}>
      {`${label}: ${describeNudge(value)}`}
      <input
        css={sliderStyles}
        type="range"
        min={-limitMs}
        max={limitMs}
        step={nudgeStepMs}
        disabled={disabled}
        value={bounded}
        onFocus={() => gesture.begin(fieldGesture)}
        onBlur={() => gesture.end(fieldGesture)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
      />
    </label>
  );
};

export const maxVolume = 2;

export const VolumeField: FC<{
  readonly label: string;
  readonly value: number;
  readonly disabled?: boolean;
  readonly onChange: (volume: number) => void;
}> = ({ label, value, disabled, onChange }) => {
  const gesture = useGesture();
  return (
    <label css={fieldStyles}>
      {`${label} ${Math.round(value * 100)}%`}
      <input
        css={sliderStyles}
        type="range"
        min={0}
        max={maxVolume}
        step={0.05}
        disabled={disabled}
        value={value}
        onFocus={() => gesture.begin(fieldGesture)}
        onBlur={() => gesture.end(fieldGesture)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
      />
    </label>
  );
};

const noticeStyles = css({ fontSize: 12, color: editorTheme.record });

const pointRowStyles = css({ display: 'flex', gap: 8 });

// Aiming a zoom or a click was a drag across the picture and nothing else, so
// from a keyboard there was no way to place either of them at all.
export const PointField: FC<{
  readonly label: string;
  readonly value: Point;
  readonly disabled?: boolean;
  readonly onChange: (point: Point) => void;
}> = ({ label, value, disabled, onChange }) => {
  const gesture = useGesture();
  const axis = (
    name: string,
    at: number,
    change: (unit: number) => Point,
  ): ReactNode => (
    <label css={fieldStyles}>
      {name}
      <input
        css={controlStyles}
        type="number"
        min={0}
        max={100}
        step={1}
        inputMode="numeric"
        disabled={disabled}
        value={Math.round(at * 100)}
        onFocus={() => gesture.begin(fieldGesture)}
        onBlur={() => gesture.end(fieldGesture)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(
            change(Math.min(1, Math.max(0, Number(event.target.value) / 100))),
          )
        }
      />
    </label>
  );

  return (
    <fieldset css={fieldStyles}>
      <legend>{label}</legend>
      <div css={pointRowStyles}>
        {axis('% across', value.x, (x) => ({ ...value, x }))}
        {axis('% down', value.y, (y) => ({ ...value, y }))}
      </div>
    </fieldset>
  );
};

// Every time in the studio is entered the way it is read: m:ss.cc. The draft is
// held while it is being typed so a half finished value never reaches the
// document, and a value that cannot be used says so rather than quietly
// springing back to what was there before.
export const TimecodeField: FC<{
  readonly label: string;
  readonly value: number;
  readonly disabled?: boolean;
  readonly minMs?: number;
  // defaults to the furthest the document itself accepts: without a ceiling a
  // typed time went straight in and every later save was rejected whole
  readonly maxMs?: number;
  readonly onChange: (ms: number) => void;
}> = ({
  label,
  value,
  disabled,
  minMs = 0,
  maxMs = limits.maxTimelineMs,
  onChange,
}) => {
  const [draft, setDraft] = useState(formatMs(value));
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string>();
  const noticeId = useId();
  useEffect(() => {
    if (!editing) {
      setDraft(formatMs(value));
    }
  }, [editing, value]);

  const parsed = parseMs(draft);
  const unreadable = editing && parsed === undefined;

  const settle = () => {
    setEditing(false);
    if (parsed === undefined) {
      setNotice(`Times read as m:ss.cc, like ${formatMs(65250)}.`);
      setDraft(formatMs(value));
      return;
    }

    // the floor is the field's own and the ceiling is only what surrounds it,
    // so where the surroundings leave less room than the floor, the floor wins
    const bounded = Math.max(minMs, Math.min(maxMs, parsed));
    if (bounded < parsed) {
      setNotice(`The latest this can be is ${formatMs(bounded)}.`);
    } else if (bounded > parsed) {
      setNotice(`The earliest this can be is ${formatMs(bounded)}.`);
    } else {
      setNotice(undefined);
    }

    // the field only shows hundredths, so a value that reads back the same was
    // not edited: firing anyway retimed the item by a few milliseconds and
    // recorded an undo step for merely tabbing through
    if (formatMs(bounded) !== formatMs(value)) {
      onChange(bounded);
    } else {
      setDraft(formatMs(value));
    }
  };

  return (
    <label css={fieldStyles}>
      {label}
      <input
        css={[controlStyles, (unreadable || notice) && invalidStyles]}
        value={draft}
        disabled={disabled}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={Boolean(unreadable || notice)}
        aria-describedby={notice ? noticeId : undefined}
        onFocus={() => {
          setEditing(true);
          setNotice(undefined);
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setDraft(event.target.value)
        }
        onBlur={settle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setNotice(undefined);
            setDraft(formatMs(value));
            event.currentTarget.blur();
          }
        }}
      />
      {notice ? (
        <span id={noticeId} css={noticeStyles} role="alert">
          {notice}
        </span>
      ) : null}
    </label>
  );
};
