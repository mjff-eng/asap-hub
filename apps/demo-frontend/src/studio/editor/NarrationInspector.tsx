/** @jsxImportSource @emotion/react */
import { NarrationClip } from '@asap-hub/demo-timeline';
import { FC } from 'react';
import { ProjectAsset } from '../../api/types';
import EditorButton from './EditorButton';
import {
  mutedStyles,
  TimecodeField,
  panelHeadingStyles,
  panelStyles,
  readingStyles,
  VolumeField,
} from './fields';
import { formatTimecode } from './geometry';
import { TrashIcon } from './icons';

type Props = {
  readonly narration: NarrationClip;
  readonly asset?: ProjectAsset;
  readonly readOnly: boolean;
  readonly onChange: (change: Partial<NarrationClip>) => void;
  readonly onRemove: () => void;
};

const NarrationInspector: FC<Props> = ({
  narration,
  asset,
  readOnly,
  onChange,
  onRemove,
}) => (
  <aside css={panelStyles} aria-label="Voice over" tabIndex={0}>
    <h2 css={panelHeadingStyles}>Voice over</h2>

    <div css={readingStyles}>
      <span css={mutedStyles}>Track</span>
      <span>{asset?.label ?? 'Recorded audio'}</span>
    </div>
    <div css={readingStyles}>
      <span css={mutedStyles}>Length</span>
      <span>{formatTimecode(narration.outMs - narration.inMs)}</span>
    </div>

    <TimecodeField
      label="Starts at"
      value={narration.startMs}
      disabled={readOnly}
      onChange={(startMs) => onChange({ startMs })}
    />
    <TimecodeField
      label="Trim start"
      value={narration.inMs}
      disabled={readOnly}
      maxMs={narration.outMs - 1}
      onChange={(inMs) => onChange({ inMs })}
    />
    <TimecodeField
      label="Trim end"
      value={narration.outMs}
      disabled={readOnly}
      minMs={narration.inMs + 1}
      maxMs={asset?.durationMs}
      onChange={(outMs) => onChange({ outMs })}
    />

    <VolumeField
      label="Volume"
      value={narration.volume}
      disabled={readOnly}
      onChange={(volume) => onChange({ volume })}
    />

    <p css={mutedStyles}>
      Drag it along the voice over lane to line it up, or drag either edge to
      change how much of the recording is used.
    </p>

    <EditorButton
      danger
      icon={<TrashIcon size={15} />}
      disabled={readOnly}
      onClick={onRemove}
    >
      Remove this voice over
    </EditorButton>
  </aside>
);

export default NarrationInspector;
