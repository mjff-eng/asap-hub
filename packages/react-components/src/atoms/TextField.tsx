/** @jsxImportSource @emotion/react */
import { css, Theme } from '@emotion/react';
import { InputHTMLAttributes } from 'react';
import { colour, colorFromHex } from '../colors';
import {
  indicatorPadding,
  indicatorSize,
  paddingLeftRight,
  paddingTopBottom,
  styles,
  useValidation,
  validationMessageStyles,
} from '../form';
import { rem } from '../pixels';
import { getSvgAspectRatio, noop } from '../utils';

type Position = 'left' | 'right';
type FieldType =
  | 'text'
  | 'search'
  | 'email'
  | 'tel'
  | 'url'
  | 'password'
  | 'date'
  | 'number';

const disabledStyles = css({
  color: colour.foreground.tertiary,
  backgroundColor: colour.background.tertiary,
  '&[type="date"]': {
    color: colour.foreground.tertiary,
  },
});

const LABEL_INDICATOR_CLASS_NAME = 'labelIndicator';
const labelIndicatorStyles = css({
  padding: `${rem(15)} ${rem(18)}`,
  backgroundColor: colour.background.tertiary,
  border: `1px solid ${colour.border.tertiary}`,
  borderRight: 0,
  display: 'flex',
  color: colour.foreground.tertiary,
  order: -1,
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
    '~ div': {
      color: colour.foreground.error,
    },
    '~ div svg': {
      fill: colour.foreground.error,
    },
    [`& ~ .${LABEL_INDICATOR_CLASS_NAME}`]: {
      backgroundColor: colour.background['error-inverse'],
      borderColor: colour.border.error,
      color: colour.neutral[0],
      svg: {
        stroke: colour.neutral[0],
        fill: 'white',
      },
    },
  },
});

const textFieldStyles = (
  hasValue: boolean,
  { primary900 = colorFromHex(colour.brand.crn[800]) }: Theme['colors'] = {},
) =>
  css({
    backgroundPosition: `right ${rem(paddingLeftRight)} top ${rem(
      paddingTopBottom,
    )}`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `auto ${rem(indicatorSize)}`,

    '::placeholder': {
      color: colour.neutral[200],
    },
    '&[type="date"]': {
      color: hasValue ? '#000' : colour.neutral[400],
    },

    // see invalid
    '~ div:last-of-type': {
      display: 'none',
    },
    '~ div svg': {
      stroke: colour.foreground.tertiary,
    },
    ':focus ~ div svg': {
      stroke: primary900.rgba,
    },
  });

const containerStyles = css({
  flexBasis: '100%',
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  position: 'relative',
});

const getIndicatorPadding = (icon: React.ReactElement) => {
  const aspectRatio = getSvgAspectRatio(icon);
  return rem(paddingLeftRight + indicatorSize * aspectRatio + indicatorPadding);
};

const getIndicatorStyles = (aspectRatio: number, position: Position) =>
  css({
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',

    top: rem(paddingTopBottom),
    [position]: rem(paddingLeftRight),

    height: rem(indicatorSize),
    width: rem(indicatorSize * aspectRatio),
  });

type TextFieldProps = {
  readonly type?: FieldType;
  readonly enabled?: boolean;

  readonly customValidationMessage?: string;

  readonly leftIndicator?: React.ReactElement;
  readonly rightIndicator?: React.ReactElement;

  readonly labelIndicator?: React.ReactElement | string;
  readonly getValidationMessage?: Parameters<typeof useValidation>[1];

  readonly value: string;
  readonly onChange?: (newValue: string) => void;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'id'
  | 'placeholder'
  | 'required'
  | 'maxLength'
  | 'pattern'
  | 'max'
  | 'onBlur'
  | 'step'
>;
const TextField: React.FC<TextFieldProps> = ({
  type = 'text',
  enabled = true,

  required,
  maxLength,
  max,
  pattern,

  customValidationMessage = '',

  leftIndicator,
  rightIndicator,

  labelIndicator,

  getValidationMessage,

  value,
  onChange = noop,
  onBlur,

  ...props
}) => {
  const { validationMessage, validationTargetProps } =
    useValidation<HTMLInputElement>(
      customValidationMessage,
      getValidationMessage,
    );

  return (
    <div css={containerStyles}>
      <input
        {...props}
        {...validationTargetProps}
        type={type}
        disabled={!enabled}
        required={required}
        maxLength={maxLength}
        max={max}
        pattern={pattern}
        value={value}
        onChange={({ currentTarget: { value: newValue } }) =>
          onChange(newValue)
        }
        css={({ colors }) => [
          styles,
          textFieldStyles(Boolean(value), colors),
          enabled || disabledStyles,

          validationMessage && invalidStyles,
          !labelIndicator && { gridColumn: '1 / span 2' },

          leftIndicator && {
            paddingLeft: getIndicatorPadding(leftIndicator),
          },

          rightIndicator && {
            paddingRight: getIndicatorPadding(rightIndicator),
          },
          colors?.primary500 && {
            ':focus': { borderColor: colors.primary500.rgba },
          },
        ]}
        {...(onBlur ? { onBlur } : {})}
      />

      {labelIndicator && (
        <div className={LABEL_INDICATOR_CLASS_NAME} css={labelIndicatorStyles}>
          {labelIndicator}
        </div>
      )}

      {leftIndicator && (
        <div css={getIndicatorStyles(getSvgAspectRatio(leftIndicator), 'left')}>
          {leftIndicator}
        </div>
      )}

      {rightIndicator && (
        <div
          css={getIndicatorStyles(getSvgAspectRatio(rightIndicator), 'right')}
        >
          {rightIndicator}
        </div>
      )}

      <div css={[validationMessageStyles, { gridColumn: '1 / span 2' }]}>
        {validationMessage}
      </div>
    </div>
  );
};

export default TextField;
