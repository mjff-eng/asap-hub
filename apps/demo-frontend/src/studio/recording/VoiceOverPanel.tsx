/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';
import EditorButton from '../editor/EditorButton';
import { editorTheme } from '../editor/editorTheme';
import { formatDuration } from '../editor/geometry';
import { MicrophoneIcon } from '../editor/icons';
import { useCaptureHolder, useHoldCapture, voiceCapture } from './captureLock';
import { delayChoices, selectStyles } from './RecorderPanel';
import { VoiceRecorderStatus } from './useVoiceRecorder';

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

const liveStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: editorTheme.record,
  fontWeight: 600,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
});

const dotStyles = css({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: editorTheme.record,
});

const errorStyles = css({ fontSize: 12, color: editorTheme.record });

type Props = {
  readonly status: VoiceRecorderStatus;
  readonly elapsedMs: number;
  readonly countdownMs: number;
  readonly countdownMsLeft: number;
  readonly onCountdownChange: (ms: number) => void;
  readonly error?: string;
  readonly saving: boolean;
  readonly readOnly: boolean;
  readonly unsupportedReason?: string;
  readonly onStart: () => void;
  readonly onStartNow: () => void;
  readonly onCancel: () => void;
  readonly onStop: () => void;
};

// the voice over lands on the timeline where the playhead is, so a creator can
// scrub to the section they want to narrate and talk over it
const VoiceOverPanel: FC<Props> = ({
  status,
  elapsedMs,
  countdownMs,
  countdownMsLeft,
  onCountdownChange,
  error,
  saving,
  readOnly,
  unsupportedReason,
  onStart,
  onStartNow,
  onCancel,
  onStop,
}) => {
  useHoldCapture(voiceCapture, status !== 'idle' || saving);
  const holder = useCaptureHolder();
  const busyElsewhere = holder !== undefined && holder !== voiceCapture;

  return unsupportedReason ? (
    <p css={errorStyles}>{unsupportedReason}</p>
  ) : (
    <div css={rowStyles}>
      {status === 'counting' ? (
        <>
          <span css={liveStyles} role="timer">
            Recording in {Math.ceil(countdownMsLeft / 1000)}…
          </span>
          <EditorButton primary onClick={onStartNow}>
            Start now
          </EditorButton>
          <EditorButton onClick={onCancel}>Cancel</EditorButton>
        </>
      ) : status === 'recording' ? (
        <>
          <span css={liveStyles}>
            <span css={dotStyles} />
            {formatDuration(elapsedMs)}
          </span>
          <EditorButton primary onClick={onStop}>
            Stop the voice over
          </EditorButton>
        </>
      ) : (
        <>
          <EditorButton
            icon={<MicrophoneIcon size={14} />}
            disabled={readOnly || saving || busyElsewhere}
            title={busyElsewhere ? `${holder} is already running` : undefined}
            onClick={onStart}
          >
            {saving ? 'Saving…' : 'Record a voice over'}
          </EditorButton>
          <select
            css={selectStyles}
            aria-label="Delay before the voice over"
            value={countdownMs}
            disabled={readOnly || saving || busyElsewhere}
            onChange={(event) => onCountdownChange(Number(event.target.value))}
          >
            {delayChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </>
      )}
      {error ? <span css={errorStyles}>{error}</span> : null}
    </div>
  );
};

export default VoiceOverPanel;
