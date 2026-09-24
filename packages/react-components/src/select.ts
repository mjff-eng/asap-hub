import { Theme } from '@emotion/react';
import { CSSObject } from '@emotion/serialize';
import { GroupBase, InputProps, StylesConfig } from 'react-select';
import { ellipsisStyles } from './atoms/Ellipsis';
import { MultiSelectOptionsType } from './atoms/MultiSelect';
import { colour, colorFromHex } from './colors';
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
  color: colour.foreground.tertiary,
  svg: {
    fill: colour.foreground.tertiary,
  },
  backgroundColor: colour.background.tertiary,
};

const baseSelectStyles = {
  input: (provided: CSSObject) => ({
    ...provided,
    padding: 0,
    margin: '0 2px',
    width: '100%',
    color: colour.foreground.primary,
    input: {
      width: '100% !important',
      color: `${colour.foreground.primary} !important`,
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
    boxShadow: `0px 2px 4px ${colour.neutral[100]}`,
  }),
  menuList: (provided: CSSObject) => ({
    ...provided,

    borderStyle: 'solid',
    borderWidth: rem(borderWidth),
    borderColor: colour.border.tertiary,
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

      backgroundColor: isFocused ? colour.background['hover-brand'] : 'unset',
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
            color: colour.foreground.error,
            borderColor: colour.border.error,
            backgroundColor: colour.background.error,
          }
        : {}),
      ...(isDisabled ? disabledStyles : {}),
    }),
    singleValue: (provided, { getValue }) => ({
      ...provided,
      margin: 0,
      color: getValue()?.some((option) => option.value !== '')
        ? 'unset'
        : colour.neutral[200],
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: 0,
      paddingRight: rem(indicatorPadding),
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isInvalid ? colour.foreground.error : colour.neutral[600],
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

      backgroundColor: isFocused ? colour.background['hover-brand'] : 'unset',
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
            borderColor: isFocused
              ? primary900.rgba
              : colour.utilitarian.red[600],
            backgroundColor: isFocused
              ? colour.neutral[0]
              : colour.utilitarian.red[100],
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
      borderColor: isInvalid ? colour.border.secondary : colour.neutral[100],
      borderRadius: rem(18),
      backgroundColor: colour.neutral[0],
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      ...ellipsisStyles,
      padding: 0,
      color: colour.foreground.primary,
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
      color: isInvalid ? colour.foreground.error : provided.color,
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
