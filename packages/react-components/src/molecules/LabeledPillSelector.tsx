import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { Paragraph, PillSelector } from '../atoms';
import { validationMessageStyles } from '../form';
import { neutral900, error100, neutral300, neutral500 } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { colors } from '..';

const fieldsetStyles = css({
  border: 'none',
  padding: 0,
  margin: 0,
  minInlineSize: 0,
});

const legendStyles = css({
  width: '100%',
});

const subtitleStyles = css({
  paddingLeft: rem(6),
});

const descriptionStyles = css({
  color: neutral900.rgb,
  display: 'inline-block',
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    display: 'unset',
  },
});

const containerStyles = (hasError: boolean, enabled: boolean) =>
  css({
    border: '1px solid',
    borderColor: hasError ? colors.error500.rgba : neutral500.rgba,
    padding: `${rem(3)} ${rem(9)}`,

    backgroundColor: enabled
      ? hasError
        ? error100.rgba
        : '#fff'
      : neutral300.rgba,
  });

type LabeledPillSelectorProps = ComponentProps<typeof PillSelector> & {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly validationMessage?: string;
};

export default function LabeledPillSelector({
  title,
  subtitle,
  description,
  validationMessage,
  ...pillProps
}: LabeledPillSelectorProps) {
  return (
    <fieldset css={fieldsetStyles}>
      <legend css={legendStyles}>
        <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
          <strong>{title}</strong>
          <span css={subtitleStyles}>{subtitle}</span>

          {description ? (
            <>
              <br />
              <span css={descriptionStyles}>{description}</span>
            </>
          ) : null}
        </Paragraph>
      </legend>

      <div
        css={containerStyles(!!validationMessage, pillProps.enabled ?? true)}
      >
        <PillSelector {...pillProps} error={!!validationMessage} />
      </div>
      {validationMessage && (
        <div css={validationMessageStyles}>{validationMessage}</div>
      )}
    </fieldset>
  );
}
