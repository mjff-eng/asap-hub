/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useEffect, useRef } from 'react';
import EditorButton from '../editor/EditorButton';
import { editorTheme } from '../editor/editorTheme';
import { formatDuration } from '../editor/geometry';
import { PauseIcon, PlayIcon, RecordIcon } from '../editor/icons';
import { screenCapture, useCaptureHolder, useHoldCapture } from './captureLock';
import { RecorderStatus } from './useScreenRecorder';

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

const statusStyles = css({
  fontSize: 12,
  color: editorTheme.muted,
  fontVariantNumeric: 'tabular-nums',
});

const liveStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: editorTheme.record,
  fontWeight: 600,
  fontSize: 12,
});

const dotStyles = css({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: editorTheme.record,
});

const checkboxStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: editorTheme.muted,
});

const errorStyles = css({ fontSize: 12, color: editorTheme.record });

// the mic fallback is information, not a failure: the take carries on
const playingDown = (message: string): boolean =>
  message === 'The microphone was not available, recording without it.';

const countStyles = css({
  fontSize: 26,
  fontWeight: 700,
  color: editorTheme.record,
  fontVariantNumeric: 'tabular-nums',
  minWidth: 20,
  textAlign: 'center',
});

export const delayChoices = [
  { value: 0, label: 'No delay' },
  { value: 3000, label: '3s delay' },
  { value: 5000, label: '5s delay' },
  { value: 10000, label: '10s delay' },
];

export const selectStyles = css({
  height: 26,
  borderRadius: 6,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.muted,
  fontSize: 12,
});

type Props = {
  readonly status: RecorderStatus;
  readonly elapsedMs: number;
  readonly countdownMsLeft: number;
  readonly countdownMs: number;
  readonly error?: string;
  readonly withMicrophone: boolean;
  readonly readOnly: boolean;
  readonly unsupportedReason?: string;
  readonly onCountdownChange: (ms: number) => void;
  readonly onMicrophoneChange: (value: boolean) => void;
  readonly onStart: () => void;
  readonly onStartNow: () => void;
  readonly onCancel: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onStop: () => void;
};

const RecorderPanel: FC<Props> = ({
  status,
  elapsedMs,
  countdownMsLeft,
  countdownMs,
  error,
  withMicrophone,
  readOnly,
  unsupportedReason,
  onCountdownChange,
  onMicrophoneChange,
  onStart,
  onStartNow,
  onCancel,
  onPause,
  onResume,
  onStop,
}) => {
  const idle = status === 'idle';
  useHoldCapture(screenCapture, !idle);
  const holder = useCaptureHolder();
  const busyElsewhere = holder !== undefined && holder !== screenCapture;
  const counting = status === 'counting';
  const secondsLeft = Math.max(1, Math.ceil(countdownMsLeft / 1000));

  // the creator is on the tab they are demoing while the count runs, so the
  // count ticks where they can still see it: this tab's own title
  const titleRef = useRef<string>();
  useEffect(() => {
    if (counting) {
      titleRef.current ??= document.title;
      document.title = `${secondsLeft}\u2026 recording soon`;
    } else if (titleRef.current !== undefined) {
      document.title = titleRef.current;
      titleRef.current = undefined;
    }
  }, [counting, secondsLeft]);
  useEffect(
    () => () => {
      if (titleRef.current !== undefined) {
        document.title = titleRef.current;
      }
    },
    [],
  );

  if (unsupportedReason) {
    return <p css={errorStyles}>{unsupportedReason}</p>;
  }

  return (
    <div css={rowStyles}>
      {idle ? (
        <>
          <EditorButton
            danger
            icon={<RecordIcon size={14} />}
            disabled={readOnly || busyElsewhere}
            title={busyElsewhere ? `${holder} is already running` : undefined}
            onClick={onStart}
          >
            Record screen
          </EditorButton>
          <label css={checkboxStyles}>
            <input
              type="checkbox"
              checked={withMicrophone}
              disabled={readOnly || busyElsewhere}
              onChange={(event) => onMicrophoneChange(event.target.checked)}
            />
            Microphone
          </label>
          <select
            css={selectStyles}
            aria-label="Delay before recording"
            value={countdownMs}
            disabled={readOnly || busyElsewhere}
            onChange={(event) => onCountdownChange(Number(event.target.value))}
          >
            {delayChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </>
      ) : counting ? (
        <>
          <span css={countStyles} role="timer" aria-label="Recording begins in">
            {secondsLeft}
          </span>
          <span css={statusStyles}>
            Get set on the tab you are demoing; this tab's title counts along.
          </span>
          <EditorButton primary onClick={onStartNow}>
            Start now
          </EditorButton>
          <EditorButton onClick={onCancel}>Cancel</EditorButton>
        </>
      ) : (
        <>
          <span css={liveStyles}>
            <span css={dotStyles} />
            {status === 'paused' ? 'Paused' : 'Recording'}
          </span>
          <span css={statusStyles}>{formatDuration(elapsedMs)}</span>
          {status === 'paused' ? (
            <EditorButton icon={<PlayIcon size={14} />} onClick={onResume}>
              Resume
            </EditorButton>
          ) : (
            <EditorButton
              icon={<PauseIcon size={14} />}
              disabled={status === 'finishing'}
              onClick={onPause}
            >
              Pause
            </EditorButton>
          )}
          <EditorButton
            primary
            disabled={status === 'finishing'}
            onClick={onStop}
          >
            {status === 'finishing' ? 'Saving…' : 'Stop'}
          </EditorButton>
        </>
      )}
      {error ? (
        <span
          css={playingDown(error) ? statusStyles : errorStyles}
          role={playingDown(error) ? undefined : 'alert'}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default RecorderPanel;
