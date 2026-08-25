/** @jsxImportSource @emotion/react */
import { InputHTMLAttributes } from 'react';
import { css } from '@emotion/react';

import { useValidation, styles, validationMessageStyles } from '../form';
import { noop } from '../utils';
import {
  colour,
  error500,
  error100,
  neutral700,
  neutral900,
  neutral300,
} from '../colors';
import { rem, tabletScreen } from '../pixels';

const containerStyles = css({
  flexBasis: '100%',

  // see invalid
  '~ div:last-of-type': {
    display: 'none',
  },
});
const textareaStyles = css({
  display: 'block',
  resize: 'vertical',

  boxSizing: 'border-box',
  height: rem(318),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    height: rem(150),
  },

  '::placeholder': {
    color: neutral700.rgb,
  },
});
const disabledStyles = css({
  color: neutral900.rgb,
  backgroundColor: neutral300.rgb,
});
const invalidStyles = css({
  ':invalid': {
    color: error500.rgb,
    borderColor: error500.rgb,
    backgroundColor: error100.rgb,

    '::placeholder': {
      color: error500.rgb,
      opacity: 0.4,
    },
    '~ div:last-of-type': {
      display: 'block',
    },
  },
});

const limitStyles = css({
  textAlign: 'right',
  fontWeight: 'bold',
  paddingTop: rem(16),
  flex: 1,
});

const validationContainerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const extrasStyles = css({
  paddingBottom: rem(16),
});

type TextAreaProps = {
  readonly enabled?: boolean;

  readonly customValidationMessage?: string;
  readonly getValidationMessage?: Parameters<typeof useValidation>[1];

  readonly value: string;
  readonly onChange?: (newValue: string) => void;

  readonly extras?: React.ReactNode;
} & Pick<
  InputHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'placeholder' | 'required' | 'maxLength' | 'onBlur'
>;
const TextArea: React.FC<TextAreaProps> = ({
  enabled = true,

  required,
  maxLength,

  customValidationMessage = '',
  getValidationMessage,

  value,
  onChange = noop,
  onBlur,

  extras,

  ...props
}) => {
  const { validationMessage, validationTargetProps } =
    useValidation<HTMLTextAreaElement>(
      customValidationMessage,
      getValidationMessage,
    );

  const reachedMaxLength =
    value.length >= (maxLength ?? Number.POSITIVE_INFINITY);

  return (
    <div css={containerStyles}>
      {extras && <div css={extrasStyles}>{extras}</div>}
      <textarea
        {...props}
        {...validationTargetProps}
        disabled={!enabled}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={({ currentTarget: { value: newValue } }) =>
          onChange(newValue)
        }
        css={({ colors }) => [
          styles,
          textareaStyles,
          enabled || disabledStyles,
          validationMessage && invalidStyles,
          colors?.primary500 && {
            ':focus': {
              borderColor: colors?.primary500.rgba,
            },
          },
        ]}
        {...(onBlur ? { onBlur } : {})}
      />
      <div css={validationContainerStyles}>
        <div css={[validationMessageStyles, css({ flex: 3 })]}>
          {validationMessage || (reachedMaxLength && 'Character count reached')}
        </div>

        {maxLength !== undefined && (
          <div
            css={({ colors: { primary500 = colour.brand.crn[500] } = {} }) => [
              validationMessageStyles,
              limitStyles,
              { color: reachedMaxLength ? error500.rgb : primary500.rgba },
            ]}
          >
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextArea;
