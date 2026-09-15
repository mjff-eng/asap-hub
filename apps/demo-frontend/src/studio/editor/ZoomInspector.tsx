/** @jsxImportSource @emotion/react */
import { Zoom } from '@asap-hub/demo-timeline';
import { FC } from 'react';
import EditorButton from './EditorButton';
import {
  mutedStyles,
  PointField,
  TimecodeField,
  panelHeadingStyles,
  panelStyles,
  readingStyles,
  SelectField,
} from './fields';
import { formatTimecode } from './geometry';
import { TrashIcon } from './icons';
import { zoomDurationMs } from './zoom';

type Props = {
  readonly zoom: Zoom;
  readonly readOnly: boolean;
  // how long the zoom's clip runs, so a start past the end cannot be typed
  readonly spanMs?: number;
  readonly onChange: (change: Partial<Zoom>) => void;
  readonly onRemove: () => void;
};

// what is left of the clip once the other three parts of the zoom have taken
// their share; without a span there is nothing to divide and the field falls
// back to its own ceiling
const remainingMs = (
  spanMs: number | undefined,
  ...taken: number[]
): { maxMs?: number } =>
  spanMs === undefined
    ? {}
    : {
        maxMs: Math.max(0, spanMs - taken.reduce((total, ms) => total + ms, 0)),
      };

const ZoomInspector: FC<Props> = ({
  zoom,
  readOnly,
  spanMs,
  onChange,
  onRemove,
}) => (
  <aside css={panelStyles} aria-label="Zoom" tabIndex={0}>
    <h2 css={panelHeadingStyles}>Zoom</h2>

    <div css={readingStyles}>
      <span css={mutedStyles}>Length</span>
      <span>{formatTimecode(zoomDurationMs(zoom))}</span>
    </div>

    <SelectField
      label="Scale"
      value={String(zoom.scale)}
      disabled={readOnly}
      options={[
        { value: '1.5', label: '1.5x' },
        { value: '2', label: '2x' },
        { value: '2.5', label: '2.5x' },
        { value: '3', label: '3x' },
      ]}
      onChange={(scale) => onChange({ scale: Number(scale) })}
    />
    <TimecodeField
      label="Starts in the clip"
      value={zoom.startMs}
      disabled={readOnly}
      {...remainingMs(spanMs, zoom.rampInMs, zoom.holdMs, zoom.rampOutMs)}
      onChange={(startMs) => onChange({ startMs })}
    />
    <TimecodeField
      label="Ramp in"
      value={zoom.rampInMs}
      disabled={readOnly}
      {...remainingMs(spanMs, zoom.startMs, zoom.holdMs, zoom.rampOutMs)}
      onChange={(rampInMs) => onChange({ rampInMs })}
    />
    <TimecodeField
      label="Hold"
      value={zoom.holdMs}
      disabled={readOnly}
      {...remainingMs(spanMs, zoom.startMs, zoom.rampInMs, zoom.rampOutMs)}
      onChange={(holdMs) => onChange({ holdMs })}
    />
    <TimecodeField
      label="Ramp out"
      value={zoom.rampOutMs}
      disabled={readOnly}
      {...remainingMs(spanMs, zoom.startMs, zoom.rampInMs, zoom.holdMs)}
      onChange={(rampOutMs) => onChange({ rampOutMs })}
    />

    <PointField
      label="Focus"
      value={zoom.focus}
      disabled={readOnly}
      onChange={(focus) => onChange({ focus })}
    />
    <p css={mutedStyles}>Or drag the picture to aim it.</p>
    <p css={mutedStyles}>
      The preview holds this zoom while it is selected, so what you see is what
      the export frames. Drag either edge of its block to change how long it
      lasts.
    </p>

    <EditorButton
      danger
      icon={<TrashIcon size={15} />}
      disabled={readOnly}
      onClick={onRemove}
    >
      Remove zoom
    </EditorButton>
  </aside>
);

export default ZoomInspector;
