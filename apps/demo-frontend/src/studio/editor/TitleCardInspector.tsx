/** @jsxImportSource @emotion/react */
import {
  ClipPlacement,
  defaultFadeMs,
  TitleClip,
} from '@asap-hub/demo-timeline';
import { FC } from 'react';
import EditorButton from './EditorButton';
import {
  FadeField,
  TimecodeField,
  panelHeadingStyles,
  panelStyles,
  readingStyles,
  mutedStyles,
  TextField,
} from './fields';
import { formatTimecode } from './geometry';
import { TrashIcon } from './icons';

type Props = {
  readonly placement: ClipPlacement;
  readonly clip: TitleClip;
  readonly readOnly: boolean;
  readonly onChange: (change: {
    text?: string;
    subtitle?: string;
    durationMs?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
  }) => void;
  readonly onRemove: () => void;
};

const TitleCardInspector: FC<Props> = ({
  placement,
  clip,
  readOnly,
  onChange,
  onRemove,
}) => (
  <aside css={panelStyles} aria-label="Title card" tabIndex={0}>
    <h2 css={panelHeadingStyles}>Title card</h2>

    <div css={readingStyles}>
      <span css={mutedStyles}>Starts</span>
      <span>{formatTimecode(placement.startMs)}</span>
    </div>

    <TextField
      label="Heading"
      value={clip.text}
      disabled={readOnly}
      placeholder="Attendance"
      onChange={(text) => onChange({ text })}
    />
    <TextField
      label="Subtitle"
      value={clip.subtitle ?? ''}
      disabled={readOnly}
      placeholder="Under feature flag"
      onChange={(subtitle) => onChange({ subtitle })}
    />
    <TimecodeField
      label="Length"
      value={clip.durationMs}
      disabled={readOnly}
      minMs={500}
      onChange={(durationMs) => onChange({ durationMs })}
    />

    <FadeField
      label="Text fades in over"
      value={clip.fadeInMs ?? defaultFadeMs}
      disabled={readOnly}
      onChange={(fadeInMs) => onChange({ fadeInMs })}
    />
    <FadeField
      label="Text fades out over"
      value={clip.fadeOutMs ?? defaultFadeMs}
      disabled={readOnly}
      onChange={(fadeOutMs) => onChange({ fadeOutMs })}
    />
    <p css={mutedStyles}>
      Both ramps are scaled down together if the card is too short to hold them.
    </p>

    <EditorButton
      danger
      icon={<TrashIcon size={15} />}
      disabled={readOnly}
      onClick={onRemove}
    >
      Remove title card
    </EditorButton>
  </aside>
);

export default TitleCardInspector;
