import React, { ComponentProps } from 'react';
import { css } from '@emotion/react';

import { rem } from '../pixels';
import { validationMessageStyles } from '../form';
import { CheckboxGroup } from '../organisms';
import { neutral900 } from '../colors';

export type LabeledCheckboxGroupProps = ComponentProps<typeof CheckboxGroup> & {
  readonly title?: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly validationMessage?: string;
};

const containerStyles = css({
  border: 'none',
  margin: 0,
  padding: 0,
});

const legendStyles = css({
  fontSize: rem(17),
  lineHeight: `${24 / 17}em`,
});
const subtitleStyles = css({
  paddingLeft: rem(6),
});

const descriptionStyles = css({
  display: 'inline-block',
  color: neutral900.rgb,
  fontSize: rem(17),
  lineHeight: `${24 / 17}em`,
  marginBottom: rem(12),
});

export default function LabeledCheckboxGroup({
  title,
  subtitle,
  description,
  validationMessage,
  ...checkboxGroupProps
}: LabeledCheckboxGroupProps): ReturnType<React.FC> {
  return (
    <fieldset css={containerStyles}>
      {title || subtitle ? (
        <legend css={legendStyles}>
          <strong>{title}</strong>
          <span css={subtitleStyles}>{subtitle}</span>
        </legend>
      ) : null}
      {description ? <span css={descriptionStyles}>{description}</span> : null}
      <CheckboxGroup {...checkboxGroupProps} />
      {validationMessage && (
        <div css={validationMessageStyles}>{validationMessage}</div>
      )}
    </fieldset>
  );
}
