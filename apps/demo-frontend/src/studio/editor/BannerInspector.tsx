/** @jsxImportSource @emotion/react */
import { Banner, defaultFadeMs } from '@asap-hub/demo-timeline';
import { FC } from 'react';
import EditorButton from './EditorButton';
import {
  FadeField,
  TimecodeField,
  panelHeadingStyles,
  panelStyles,
  SelectField,
  TextField,
} from './fields';
import { TrashIcon } from './icons';

type Props = {
  readonly banner: Banner;
  // how long the programme runs, so a banner cannot be typed off the end
  readonly programmeMs?: number;
  readonly readOnly: boolean;
  readonly onChange: (change: Partial<Banner>) => void;
  readonly onRemove: () => void;
};

// below this a banner draws nothing and its block on the timeline is too thin
// to get hold of, so it is the one bound that never gives way
const minBannerMs = 200;

// A banner ends inside the programme, and it is the length that gives way to
// keep that, never the start: the start is the value the creator just typed and
// the length is not.
const lengthLeftAfter = (
  programmeMs: number | undefined,
  startMs: number,
): number | undefined =>
  programmeMs === undefined
    ? undefined
    : Math.max(minBannerMs, programmeMs - startMs);

const BannerInspector: FC<Props> = ({
  banner,
  programmeMs,
  readOnly,
  onChange,
  onRemove,
}) => (
  <aside css={panelStyles} aria-label="Banner" tabIndex={0}>
    <h2 css={panelHeadingStyles}>Banner</h2>

    <TextField
      label="Heading"
      value={banner.text}
      disabled={readOnly}
      placeholder="Attendance"
      onChange={(text) => onChange({ text })}
    />
    <TextField
      label="Subtitle"
      value={banner.subtitle ?? ''}
      disabled={readOnly}
      placeholder="A short line of supporting text"
      onChange={(subtitle) => onChange({ subtitle })}
    />
    <TimecodeField
      label="Starts at"
      value={banner.startMs}
      disabled={readOnly}
      {...(programmeMs !== undefined ? { maxMs: programmeMs } : {})}
      onChange={(startMs) => {
        const left = lengthLeftAfter(programmeMs, startMs);
        onChange({
          startMs,
          ...(left !== undefined && banner.durationMs > left
            ? { durationMs: left }
            : {}),
        });
      }}
    />
    <TimecodeField
      label="Length"
      value={banner.durationMs}
      disabled={readOnly}
      minMs={minBannerMs}
      // what is left once the start has taken its share, which the field itself
      // raises back to the floor above when the start has taken all of it
      {...(programmeMs !== undefined
        ? { maxMs: Math.max(0, programmeMs - banner.startMs) }
        : {})}
      onChange={(durationMs) => onChange({ durationMs })}
    />
    <SelectField
      label="Position"
      value={banner.position}
      disabled={readOnly}
      options={[
        { value: 'bottom', label: 'Lower third' },
        { value: 'top', label: 'Upper third' },
      ]}
      onChange={(position) =>
        onChange({ position: position as Banner['position'] })
      }
    />
    <SelectField
      label="Animation"
      value={banner.animation}
      disabled={readOnly}
      options={[
        { value: 'fade', label: 'Fade' },
        { value: 'slide', label: 'Slide' },
      ]}
      onChange={(animation) =>
        onChange({ animation: animation as Banner['animation'] })
      }
    />

    <FadeField
      label="Text fades in over"
      value={banner.fadeInMs ?? defaultFadeMs}
      disabled={readOnly}
      onChange={(fadeInMs) => onChange({ fadeInMs })}
    />
    <FadeField
      label="Text fades out over"
      value={banner.fadeOutMs ?? defaultFadeMs}
      disabled={readOnly}
      onChange={(fadeOutMs) => onChange({ fadeOutMs })}
    />

    <EditorButton
      danger
      icon={<TrashIcon size={15} />}
      disabled={readOnly}
      onClick={onRemove}
    >
      Remove banner
    </EditorButton>
  </aside>
);

export default BannerInspector;
