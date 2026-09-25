import { css, SerializedStyles } from '@emotion/react';
import { colour } from '../colors';
import { borderWidth } from '../form';
import { mobileScreen, rem } from '../pixels';

const containerStyles = css({
  padding: rem(6),
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(8),
});

// Opt-in: pills span the full row (stacking one per line) instead of
// sizing to their own text, and the group's own padding drops (at every
// breakpoint) so it aligns flush with the parent's content width exactly.
const fullWidthOnMobileContainerStyles = css({
  padding: 0,
  [`@media (max-width: ${mobileScreen.max}px)`]: { gap: rem(16) },
});

const fullWidthOnMobilePillStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: { width: '100%' },
});

const disabledStyles = css({
  borderColor: colour.border.secondary,
  color: colour.foreground.disabled,
  cursor: 'not-allowed',
});

const pillStyles = (selected: boolean, error: boolean) =>
  css({
    padding: `${rem(5)} ${rem(15)} ${rem(5)}`,

    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: rem(8),

    borderStyle: 'solid',
    borderWidth: `${borderWidth}px`,
    borderColor: error
      ? colour.border.secondary
      : selected
        ? colour.border.info
        : colour.border.tertiary,
    borderRadius: rem(24),
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: selected
      ? colour.background.info
      : colour.background.primary,
    color: selected ? colour.foreground.info : colour.foreground.tertiary,
    '> svg': {
      width: rem(24),
      height: rem(24),
      flexShrink: 0,
    },
  });

const hoverStyles = css({
  ':hover': {
    backgroundColor: colour.background.info,
    borderColor: colour.border.info,
    color: colour.foreground.info,
  },
});

type PillOption<V extends string> = {
  value: V;
  label: string;
  icon?: React.ReactNode;
};

type PillSelectorProps<V extends string> = {
  options: PillOption<V>[];
  value: V[];
  onChange: (value: V[]) => void;
  enabled?: boolean;
  error?: boolean;
  fullWidthOnMobile?: boolean;
  overrideStyles?: SerializedStyles;
};

const PillSelector = <V extends string>({
  options,
  value,
  onChange,
  enabled = true,
  error = false,
  fullWidthOnMobile = false,
  overrideStyles,
}: PillSelectorProps<V>) => {
  const toggle = (val: V) => {
    if (!enabled) return;
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div
      css={[
        containerStyles,
        fullWidthOnMobile && fullWidthOnMobileContainerStyles,
      ]}
    >
      {options.map((option) => {
        const selected = value.includes(option.value);

        return (
          <button
            key={option.value}
            disabled={!enabled}
            css={[
              pillStyles(selected, error),
              ...(enabled ? [hoverStyles] : [disabledStyles]),
              fullWidthOnMobile && fullWidthOnMobilePillStyles,
              overrideStyles,
            ]}
            type="button"
            onClick={() => toggle(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default PillSelector;
