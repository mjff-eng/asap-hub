/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  Clip,
  ClipPlacement,
  limits,
  Transition,
} from '@asap-hub/demo-timeline';
import { FC } from 'react';
import { ProjectAsset } from '../../api/types';
import EditorButton from './EditorButton';
import {
  mutedStyles,
  TimecodeField,
  panelHeadingStyles,
  panelStyles,
  readingStyles,
  SelectField,
  VolumeField,
} from './fields';
import { formatTimecode } from './geometry';
import { TrashIcon } from './icons';
import { maxOverlapMs } from './overlap';

const nameStyles = css({ fontSize: 14, fontWeight: 600 });

const rowButtonsStyles = css({ display: 'flex', gap: 6 });

type Props = {
  readonly placement?: ClipPlacement;
  readonly asset?: ProjectAsset;
  // the one trim ceiling every surface shares; see ProjectEditor.trimBoundOf
  readonly trimBoundMs?: number;
  readonly readOnly: boolean;
  readonly index: number;
  readonly clipCount: number;
  readonly onTrim: (change: { inMs?: number; outMs?: number }) => void;
  readonly onVolume: (volume: number) => void;
  readonly onMove: (toIndex: number) => void;
  readonly onRemove: () => void;
  readonly onTransition: (transition?: Transition) => void;
  // the clip this one blends out of, which bounds how long the blend can be
  readonly previousPlacement?: ClipPlacement;
};

const transitionOptions = [
  { value: 'cut', label: 'Cut' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'slide', label: 'Slide' },
];

const defaultTransitionMs = 500;
const minTransitionMs = 100;

const clipName = (clip: Clip, asset?: ProjectAsset): string =>
  clip.kind === 'title' ? clip.text || 'Title card' : asset?.label ?? 'Clip';

const ClipInspector: FC<Props> = ({
  placement,
  asset,
  trimBoundMs,
  readOnly,
  index,
  clipCount,
  onTrim,
  onVolume,
  onMove,
  onRemove,
  onTransition,
  previousPlacement,
}) => {
  if (!placement) {
    return (
      <aside css={panelStyles} aria-label="Clip" tabIndex={0}>
        <h2 css={panelHeadingStyles}>Clip</h2>
        <p css={mutedStyles}>Select a clip on the timeline to edit it.</p>
      </aside>
    );
  }

  const { clip } = placement;
  const source = clip.kind === 'source' ? clip : undefined;

  return (
    <aside css={panelStyles} aria-label="Clip" tabIndex={0}>
      <h2 css={panelHeadingStyles}>Clip</h2>
      <span css={nameStyles}>{clipName(clip, asset)}</span>

      <div css={readingStyles}>
        <span css={mutedStyles}>Starts</span>
        <span>{formatTimecode(placement.startMs)}</span>
      </div>
      <div css={readingStyles}>
        <span css={mutedStyles}>Length</span>
        <span>{formatTimecode(placement.durationMs)}</span>
      </div>

      {source ? (
        <>
          <TimecodeField
            label="Trim start"
            value={source.inMs}
            disabled={readOnly}
            maxMs={source.outMs - limits.minClipMs}
            onChange={(inMs) => onTrim({ inMs })}
          />
          <TimecodeField
            label="Trim end"
            value={source.outMs}
            disabled={readOnly}
            minMs={source.inMs + limits.minClipMs}
            maxMs={trimBoundMs ?? asset?.durationMs}
            onChange={(outMs) => onTrim({ outMs })}
          />
          <VolumeField
            label="Volume"
            value={source.volume}
            disabled={readOnly}
            onChange={onVolume}
          />
        </>
      ) : null}

      {index > 0 ? (
        <SelectField
          label="Transition from the clip before"
          value={clip.transitionIn?.type ?? 'cut'}
          disabled={readOnly}
          options={transitionOptions}
          onChange={(type) =>
            onTransition(
              type === 'cut'
                ? undefined
                : {
                    type: type as Transition['type'],
                    durationMs:
                      clip.transitionIn?.durationMs ?? defaultTransitionMs,
                  },
            )
          }
        />
      ) : null}

      {index > 0 &&
      clip.transitionIn &&
      clip.transitionIn.type !== 'cut' &&
      previousPlacement &&
      maxOverlapMs(previousPlacement, placement) >= minTransitionMs ? (
        <TimecodeField
          label="Transition length"
          value={clip.transitionIn.durationMs}
          disabled={readOnly}
          minMs={minTransitionMs}
          // the same ceiling the lane applies: half the shorter neighbour,
          // and never past what the document itself accepts
          maxMs={maxOverlapMs(previousPlacement, placement)}
          onChange={(durationMs) =>
            clip.transitionIn
              ? onTransition({ ...clip.transitionIn, durationMs })
              : undefined
          }
        />
      ) : null}

      <div css={rowButtonsStyles}>
        <EditorButton
          disabled={readOnly || index === 0}
          onClick={() => onMove(index - 1)}
        >
          Move earlier
        </EditorButton>
        <EditorButton
          disabled={readOnly || index >= clipCount - 1}
          onClick={() => onMove(index + 1)}
        >
          Move later
        </EditorButton>
      </div>

      <EditorButton
        danger
        icon={<TrashIcon size={15} />}
        disabled={readOnly}
        onClick={onRemove}
      >
        Remove clip
      </EditorButton>
    </aside>
  );
};

export default ClipInspector;
