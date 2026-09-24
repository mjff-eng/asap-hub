/** @jsxImportSource @emotion/react */
import { InputHTMLAttributes } from 'react';
import { css } from '@emotion/react';

import { useValidation, styles, validationMessageStyles } from '../form';
import { noop } from '../utils';
import { colour, colorFromHex } from '../colors';
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
    color: colour.neutral[200],
  },
});
const disabledStyles = css({
  color: colour.foreground.tertiary,
  backgroundColor: colour.background.tertiary,
});
const invalidStyles = css({
  ':invalid': {
    color: colour.foreground.error,
    borderColor: colour.border.error,
    backgroundColor: colour.background.error,

    '::placeholder': {
      color: colour.foreground.error,
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
            css={({
              colors: { primary500 = colorFromHex(colour.brand.crn[500]) } = {},
            }) => [
              validationMessageStyles,
              limitStyles,
              {
                color: reachedMaxLength
                  ? colour.foreground.error
                  : primary500.rgba,
              },
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
