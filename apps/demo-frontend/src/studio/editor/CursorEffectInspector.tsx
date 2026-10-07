/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  CursorEffect,
  cursorColors,
  defaultCursorColor,
  defaultPointerVariant,
  limits,
  pointerBox,
  pointerLayers,
  pointerVariants,
} from '@asap-hub/demo-timeline';
import { FC, useEffect, useState } from 'react';
import EditorButton from './EditorButton';
import {
  fieldStyles,
  mutedStyles,
  NudgeField,
  PointField,
  TimecodeField,
  panelHeadingStyles,
  panelStyles,
  SelectField,
} from './fields';
import { TrashIcon } from './icons';
import { editorTheme } from './editorTheme';
import { fieldGesture, useGesture } from './gesture';

const swatchRowStyles = css({ display: 'flex', gap: 6, flexWrap: 'wrap' });

const alignRowStyles = css({ display: 'flex', gap: 8 });

// A draft is held while it is being typed, so a minus sign on its way to a
// number is not coerced to zero under the creator's fingers, and the whole
// adjustment lands as one undo step rather than one per keystroke.
const AlignField: FC<{
  readonly label: string;
  readonly value: number;
  readonly disabled?: boolean;
  readonly onChange: (px: number) => void;
}> = ({ label, value, disabled, onChange }) => {
  const gesture = useGesture();
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) {
      setDraft(String(value));
    }
  }, [editing, value]);

  return (
    <label css={fieldStyles}>
      {label}
      <input
        css={alignInputStyles}
        type="number"
        min={-500}
        max={500}
        step={1}
        inputMode="numeric"
        disabled={disabled}
        value={draft}
        onFocus={() => {
          setEditing(true);
          gesture.begin(fieldGesture);
        }}
        onBlur={() => {
          setEditing(false);
          gesture.end(fieldGesture);
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          const px = Number(event.target.value);
          if (event.target.value !== '' && Number.isFinite(px)) {
            onChange(Math.max(-500, Math.min(500, Math.round(px))));
          }
        }}
      />
    </label>
  );
};

const alignInputStyles = css({
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

const swatchStyles = css({
  width: 24,
  height: 24,
  borderRadius: '50%',
  padding: 0,
  cursor: 'pointer',
  border: `2px solid ${editorTheme.line}`,
  // the same dark edge the ring carries, so the swatch reads on this panel too
  boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.45)',
  ':disabled': { cursor: 'not-allowed', opacity: 0.5 },
});

const chosenSwatchStyles = css({ borderColor: editorTheme.text });

const pointerSwatchStyles = css({
  width: 34,
  height: 34,
  borderRadius: 6,
  padding: 4,
  cursor: 'pointer',
  border: `2px solid ${editorTheme.line}`,
  // the shapes are drawn in white with a dark halo, which is unreadable on a
  // light panel, so each sits on a slate of its own
  backgroundColor: '#3c4250',
  display: 'grid',
  placeItems: 'center',
  ':disabled': { cursor: 'not-allowed', opacity: 0.5 },
});

const originLabels: Record<CursorEffect['origin'], string> = {
  derived: 'From the captured recording',
  'derived-edited': 'Captured, then edited here',
  manual: 'Placed by hand',
};

type Props = {
  readonly effect: CursorEffect;
  readonly readOnly: boolean;
  // the drawn pointer belongs to the whole capture, not to one click, so it is
  // set here but written to the layer
  readonly pointer?: string;
  readonly hasCapture?: boolean;
  // the capture's nudge against the footage, which is the layer's too
  readonly offsetMs?: number;
  // the creator's own pixel trim on the whole capture's position
  readonly alignXPx?: number;
  readonly alignYPx?: number;
  readonly onChangePointer?: (pointer: string) => void;
  readonly onChangeOffset?: (offsetMs: number) => void;
  readonly onChangeAlign?: (alignXPx: number, alignYPx: number) => void;
  // the effect's time is stored against the footage; the field reads and
  // writes it in the clip the creator is looking at, so the trim converts
  readonly inMs?: number;
  readonly spanMs?: number;
  readonly onChange: (change: Partial<CursorEffect>) => void;
  readonly onRemove: () => void;
};

const CursorEffectInspector: FC<Props> = ({
  effect,
  readOnly,
  pointer,
  hasCapture,
  offsetMs = 0,
  alignXPx = 0,
  alignYPx = 0,
  onChangePointer,
  onChangeOffset,
  onChangeAlign,
  onChange,
  onRemove,
  inMs = 0,
  spanMs,
}) => (
  <aside css={panelStyles} aria-label="Cursor effect" tabIndex={0}>
    <h2 css={panelHeadingStyles}>Cursor effect</h2>

    <SelectField
      label="Type"
      value={effect.type}
      disabled={readOnly}
      options={[
        { value: 'ripple', label: 'Click highlight' },
        { value: 'spotlight', label: 'Spotlight' },
      ]}
      onChange={(type) => onChange({ type: type as CursorEffect['type'] })}
    />
    <fieldset css={swatchRowStyles} aria-label="Click colour">
      {cursorColors.map((swatch) => {
        const chosen = (effect.color ?? defaultCursorColor) === swatch.hex;
        return (
          <button
            key={swatch.id}
            type="button"
            css={[swatchStyles, chosen && chosenSwatchStyles]}
            style={{ backgroundColor: swatch.hex }}
            aria-label={swatch.label}
            aria-pressed={chosen}
            disabled={readOnly}
            onClick={() => onChange({ color: swatch.hex })}
          />
        );
      })}
    </fieldset>

    {hasCapture && onChangePointer ? (
      <fieldset css={swatchRowStyles} aria-label="Pointer">
        {pointerVariants.map((variant) => {
          const box = pointerBox(variant);
          const chosen = (pointer ?? defaultPointerVariant) === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              css={[pointerSwatchStyles, chosen && chosenSwatchStyles]}
              aria-label={variant.label}
              aria-pressed={chosen}
              disabled={readOnly}
              onClick={() => onChangePointer(variant.id)}
            >
              <svg
                width={20 * box.aspectRatio}
                height={20}
                viewBox={box.viewBox}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                {pointerLayers(variant).map((layer, index) => (
                  <path
                    key={`${index === 0 ? 'edge' : 'ink'}-${layer.d}`}
                    d={layer.d}
                    fillRule={layer.fillRule}
                    fill={layer.fill}
                    fillOpacity={layer.fillOpacity}
                    stroke={layer.stroke}
                    strokeOpacity={layer.strokeOpacity}
                    strokeWidth={layer.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            </button>
          );
        })}
      </fieldset>
    ) : null}

    {hasCapture && onChangeOffset ? (
      <>
        <NudgeField
          label="Whole capture"
          value={offsetMs}
          limitMs={limits.offsetMs}
          disabled={readOnly}
          onChange={onChangeOffset}
        />
        <p css={mutedStyles}>
          Slides every click and the drawn pointer together, for when the
          capture runs ahead of or behind the footage.
        </p>
        {onChangeAlign ? (
          <fieldset css={fieldStyles}>
            <legend>Fine tune the position, in pixels of the frame</legend>
            <div css={alignRowStyles}>
              <AlignField
                label="Across"
                value={alignXPx}
                disabled={readOnly}
                onChange={(px) => onChangeAlign(px, alignYPx)}
              />
              <AlignField
                label="Down"
                value={alignYPx}
                disabled={readOnly}
                onChange={(px) => onChangeAlign(alignXPx, px)}
              />
            </div>
            <p css={mutedStyles}>
              Moves every click and the pointer by this much, everywhere.
            </p>
          </fieldset>
        ) : null}
      </>
    ) : null}

    <TimecodeField
      label="At, in the clip"
      value={effect.tMs - inMs}
      disabled={readOnly}
      minMs={0}
      {...(spanMs !== undefined ? { maxMs: spanMs } : {})}
      onChange={(tMs) => onChange({ tMs: tMs + inMs })}
    />

    <PointField
      label="Placed"
      value={effect.point}
      disabled={readOnly}
      onChange={(point) => onChange({ point })}
    />
    <p css={mutedStyles}>Or drag its ring on the preview to move it.</p>
    <p css={mutedStyles}>
      It plays for about half a second as the playhead reaches it, and its dot
      on the zoom and cursor lane is what you click to find it again.
    </p>
    <p css={mutedStyles}>{originLabels[effect.origin]}</p>

    <EditorButton
      danger
      icon={<TrashIcon size={15} />}
      disabled={readOnly}
      onClick={onRemove}
    >
      Remove effect
    </EditorButton>
  </aside>
);

export default CursorEffectInspector;
