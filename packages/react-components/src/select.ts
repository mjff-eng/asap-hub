import { Theme } from '@emotion/react';
import { CSSObject } from '@emotion/serialize';
import { GroupBase, InputProps, StylesConfig } from 'react-select';
import { ellipsisStyles } from './atoms/Ellipsis';
import { MultiSelectOptionsType } from './atoms/MultiSelect';
import {
  charcoal,
  colour,
  error500,
  neutral900,
  success100,
  error100,
  neutral300,
  neutral500,
  neutral700,
  colorFromHex,
} from './colors';
import {
  borderWidth,
  indicatorPadding,
  paddingLeftRight,
  styles,
} from './form';
import { lineHeight, rem } from './pixels';

export interface Option<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
}

// Compatibility type for v5 migration (replaces react-select's removed OptionsType)
export type OptionsType<T> = readonly T[];

const { ...baseStyles } = styles;

const disabledStyles = {
  color: neutral900.rgb,
  svg: {
    fill: neutral900.rgb,
  },
  backgroundColor: neutral300.rgb,
};

const baseSelectStyles = {
  input: (provided: CSSObject) => ({
    ...provided,
    padding: 0,
    margin: '0 2px',
    width: '100%',
    color: charcoal.rgb,
    input: {
      width: '100% !important',
      color: `${charcoal.rgb} !important`,
    },
  }),
  indicatorSeparator: () => ({
    padding: `0 ${rem(6)}`,
  }),
  indicatorsContainer: (provided: CSSObject) => ({
    ...provided,

    minWidth: rem(lineHeight),
    minHeight: rem(lineHeight),
    paddingRight: rem(3),

    justifyContent: 'flex-end',
    alignItems: 'center',
  }),

  menu: (provided: CSSObject) => ({
    ...provided,

    margin: 0,
    paddingTop: rem(9),

    borderRadius: 0,
    boxShadow: `0px 2px 4px ${neutral500.rgb}`,
  }),
  menuList: (provided: CSSObject) => ({
    ...provided,

    borderStyle: 'solid',
    borderWidth: rem(borderWidth),
    borderColor: neutral500.rgb,
  }),

  noOptionsMessage: () => ({
    ...disabledStyles,
    padding: `${rem(12)} ${rem(paddingLeftRight)}`,
  }),
};

export const reactSelectStyles = <
  T extends { value: string; label: string } = { value: string; label: string },
  M extends boolean = boolean,
>(
  {
    colors: {
      primary100 = success100,
      primary500 = colorFromHex(colour.brand.crn[500]),
      primary900 = colorFromHex(colour.brand.crn[800]),
    } = {},
  }: Theme,
  isInvalid: boolean,
): StylesConfig<T, M, GroupBase<T>> =>
  ({
    ...baseSelectStyles,
    option: (provided, { isFocused }) => ({
      ...provided,

      padding: `${rem(12)} ${rem(paddingLeftRight)}`,

      backgroundColor: isFocused ? primary100.rgba : 'unset',
      color: isFocused ? primary900.rgba : 'unset',
      ':active': undefined,
    }),
    control: (_provided, { isFocused, isDisabled }) => ({
      ...baseStyles,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',

      ...(isFocused ? { borderColor: primary500.rgba } : {}),
      ...(isInvalid
        ? {
            color: error500.rgb,
            borderColor: error500.rgb,
            backgroundColor: error100.rgb,
          }
        : {}),
      ...(isDisabled ? disabledStyles : {}),
    }),
    singleValue: (provided, { getValue }) => ({
      ...provided,
      margin: 0,
      color: getValue()?.some((option) => option.value !== '')
        ? 'unset'
        : neutral700.rgb,
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: 0,
      paddingRight: rem(indicatorPadding),
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isInvalid ? error500.rgb : neutral900.rgb,
      opacity: isInvalid ? 0.4 : provided.opacity,
    }),
    menu: (provided: CSSObject) => ({
      ...provided,

      zIndex: 300,
    }),
  }) as StylesConfig<T, M, GroupBase<T>>;

export const reactMultiSelectStyles = <
  T extends MultiSelectOptionsType,
  M extends boolean = true,
>(
  {
    colors: {
      primary100 = success100,
      primary500 = colorFromHex(colour.brand.crn[500]),
      primary900 = colorFromHex(colour.brand.crn[800]),
    } = {},
  }: Theme,
  isInvalid: boolean,
  isMulti: boolean,
): StylesConfig<T, M, GroupBase<T>> =>
  ({
    ...baseSelectStyles,
    option: (provided, { isFocused }) => ({
      ...provided,

      padding: `${rem(12)} ${rem(paddingLeftRight)}`,

      backgroundColor: isFocused ? primary100.rgba : 'unset',
      color: isFocused ? primary900.rgba : 'unset',
      ':active': undefined,
    }),
    control: (_provided, { isFocused, isDisabled }) => ({
      ...baseStyles,
      padding: `${rem(3)} ${rem(9)}`,

      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',

      // Ensure single-select has same height as multi-select with chips
      ...(!isMulti ? { minHeight: rem(54) } : {}),

      ...(isFocused ? { borderColor: primary500.rgba } : {}),
      ...(isInvalid
        ? {
            borderColor: isFocused ? primary900.rgba : error500.rgb,
            backgroundColor: isFocused ? colour.neutral[0] : error100.rgb,
            svg: { fill: 'unset' },
          }
        : {}),
      ...(isDisabled ? disabledStyles : {}),
    }),
    multiValue: () => ({
      padding: `${rem(5)} ${rem(15)} ${rem(5)}`,
      margin: `${rem(5)} ${rem(6)} ${rem(5)}`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',

      borderStyle: 'solid',
      borderWidth: `${borderWidth}px`,
      borderColor: isInvalid ? neutral700.rgba : neutral500.rgb,
      borderRadius: rem(18),
      backgroundColor: colour.neutral[0],
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      ...ellipsisStyles,
      padding: 0,
      color: charcoal.rgb,
      fontSize: 'unset',
    }),
    multiValueRemove: (provided, state) =>
      state.data.isFixed
        ? { ...provided, display: 'none' }
        : {
            ...provided,
            padding: 0,
            marginLeft: rem(9),
            display: 'flex',
            cursor: 'pointer',
            svg: { width: '12px', height: '12px', strokeWidth: '2.5' },
            ':hover': {},
          },
    indicatorsContainer: () => ({ display: 'none' }),
    valueContainer: (provided) => ({
      ...provided,
      padding: 0,
    }),
    input: (provided: CSSObject, state: InputProps<T, M, GroupBase<T>>) => {
      const hasSingleSelectedValue =
        !isMulti && state.selectProps.value !== null;

      return {
        ...provided,
        ...(hasSingleSelectedValue
          ? {
              margin: 0,
            }
          : {
              padding: `${rem(5)} 0 ${rem(5)}`,
              margin: `${rem(6)} ${rem(6)} ${rem(6)}`,
            }),
      };
    },
    placeholder: (provided) => ({
      ...provided,
      color: isInvalid ? error500.rgb : provided.color,
      opacity: isInvalid ? 0.4 : provided.opacity,
      marginLeft: rem(6),
    }),
    menu: (provided: CSSObject) => ({
      ...provided,
      zIndex: 300,
    }),
  }) as StylesConfig<T, M, GroupBase<T>>;

/**
 * Extracts multiValue CSS styles from react-select's styles config.
 *
 * Use this helper in custom MultiValueContainer components to get the
 * configured multiValue styles without type casting gymnastics.
 *
 * @example
 * ```tsx
 * MultiValueContainer: (props) => (
 *   <div css={{ ...getMultiValueStyles(props.selectProps.styles), paddingLeft: rem(8) }}>
 *     {props.children}
 *   </div>
 * )
 * ```
 */
export const getMultiValueStyles = (
  selectStyles: { multiValue?: unknown } | undefined,
): CSSObject => {
  if (
    selectStyles?.multiValue &&
    typeof selectStyles.multiValue === 'function'
  ) {
    // The multiValue style function signature is (base, state) => CSSObject
    // but our implementation ignores both arguments, so we can safely call with empty args
    return (selectStyles.multiValue as () => CSSObject)();
  }
  return {};
};
