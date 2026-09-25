import { css } from '@emotion/react';

import { colour } from './colors';
import { formTargetWidth, mobileScreen, rem } from './pixels';

const borderWidth = 1;
const styles = css({
  flexGrow: 1,
  display: 'inline-flex',
  justifyContent: 'center',
  textAlign: 'center',

  maxWidth: rem(formTargetWidth),

  outline: 'none',

  boxSizing: 'border-box',
  borderStyle: 'solid',
  borderWidth: rem(borderWidth),
  borderRadius: rem(4),

  cursor: 'pointer',

  lineHeight: 'unset',
  fontWeight: 'bold',

  '+ button': {
    marginTop: 0,
  },

  transition: '200ms',

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexGrow: 1,
    minWidth: '100%',
  },
});

const fullWidthStyles = css({
  flexGrow: 1,
  minWidth: '100%',
});

const largeStyles = css({
  '> svg': {
    height: rem(24),
    width: 'auto',
  },
  '> svg + span': {
    marginLeft: rem(10),
  },
  ':has(> svg + span)': {
    paddingLeft: rem(24 - borderWidth),
  },
  '> span + svg': {
    marginLeft: rem(10),
  },
  ':has(> span + svg )': {
    paddingRight: rem(24 - borderWidth),
  },

  paddingTop: rem(15 - borderWidth),
  paddingBottom: rem(15 - borderWidth),
  paddingLeft: rem(32 - borderWidth),
  paddingRight: rem(32 - borderWidth),
});

const largeWithSpaceStyles = css({
  marginTop: rem(18),
  marginBottom: rem(18),
});
const smallWithSpaceStyles = css({
  marginTop: rem(12),
  marginBottom: rem(12),
});

const smallStyles = css({
  '> svg': {
    height: rem(18),
    paddingTop: rem(3),
    paddingBottom: rem(3),
    width: 'auto',
  },
  '> svg + span': {
    marginLeft: rem(6),
  },
  ':has(> svg + span)': {
    paddingLeft: rem(8 - borderWidth),
  },
  '> span + svg': {
    marginLeft: rem(6),
  },
  ':has(> span + svg )': {
    paddingRight: rem(8 - borderWidth),
  },

  paddingTop: rem(6 - borderWidth),
  paddingBottom: rem(6 - borderWidth),
  paddingLeft: rem(16 - borderWidth),
  paddingRight: rem(16 - borderWidth),
});

const largeTextOnlyStyles = css({
  paddingLeft: rem(42 - borderWidth),
  paddingRight: rem(42 - borderWidth),
});
const largeIconOnlyStyles = css({
  paddingLeft: rem(15 - borderWidth),
  paddingRight: rem(15 - borderWidth),
});
const smallIconOnlyStyles = css({
  paddingLeft: rem(9 - borderWidth),
  paddingRight: rem(9 - borderWidth),
});

const boxShadow = (color: string) => `0px 2px 4px -2px ${color}`;

const primaryStyles = css({
  color: colour.foreground.button.primary.default,
  backgroundColor: colour.background.button.primary.default,
  borderColor: colour.border.button.primary.default,
  boxShadow: boxShadow(colour.border.button.primary.default),
  svg: {
    stroke: colour.foreground.button.primary.default,
  },
  ':hover, :focus': {
    color: colour.foreground.button.primary.hover,
    backgroundColor: colour.background.button.primary.hover,
    borderColor: colour.border.button.primary.hover,
    boxShadow: boxShadow(colour.neutral[600]),
  },
  ':active': {
    backgroundColor: colour.background.button.primary.hover,
    borderColor: colour.border.button.primary.hover,
    boxShadow: 'none',
  },
});
export const secondaryStyles = css({
  backgroundColor: colour.background.button.secondary.default,
  borderColor: colour.border.button.secondary.default,
  boxShadow: boxShadow(colour.neutral[100]),

  ':hover, :focus': {
    borderColor: colour.border.button.secondary.hover,
    boxShadow: boxShadow(colour.neutral[100]),
  },

  ':active': {
    borderColor: colour.border.button.secondary.default,
    boxShadow: 'none',
  },
});

export const warningStyles = css({
  backgroundColor: colour.background.button.utilitarian.error.default,
  color: colour.foreground['primary-inverse'],
  borderColor: colour.utilitarian.red[700],
  boxShadow: boxShadow(colour.neutral[100]),

  ':hover, :focus, :active': {
    backgroundColor: colour.background.button.utilitarian.error.hover,
    boxShadow: 'none',
  },
});

const disabledStyles = css({
  color: colour.foreground.tertiary,
  backgroundColor: colour.background.disabled,
  borderColor: colour.border.disabled,
  boxShadow: 'none',

  cursor: 'unset',

  svg: {
    filter: 'grayscale(1)',
    stroke: colour.foreground.disabled,
  },
});

export const activePrimaryStyles = css({
  backgroundColor: colour.background.active,
  borderColor: 'transparent',
  color: colour.foreground.brand,
  svg: {
    stroke: colour.foreground.brand,
    '& > path': {
      fill: colour.foreground.brand,
    },
  },
  ':hover, :focus': {
    backgroundColor: colour.background.active,
    color: colour.foreground.brand,
  },
});
export const activeSecondaryStyles = css({
  backgroundColor: colour.background.primary,
  color: colour.foreground.primary,
  borderColor: colour.neutral[900],

  svg: {
    stroke: colour.foreground.primary,
  },
  ':hover, :focus': {
    backgroundColor: colour.background.primary,
    color: colour.foreground.primary,
    borderColor: colour.neutral[900],
  },
});

export const getButtonStyles = ({
  primary = false,
  warning = false,
  small = false,
  enabled = true,
  active = false,
  children = [] as React.ReactNode,
  noMargin = false,
  fullWidth = false,
}: {
  primary?: boolean;
  warning?: boolean;
  small?: boolean;
  enabled?: boolean;
  active?: boolean;
  noMargin?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}) =>
  css([
    styles,
    small ? smallStyles : largeStyles,
    !noMargin && small && smallWithSpaceStyles,
    !noMargin && !small && largeWithSpaceStyles,
    enabled
      ? active
        ? primary
          ? activePrimaryStyles
          : activeSecondaryStyles
        : primary
          ? primaryStyles
          : secondaryStyles
      : disabledStyles,
    warning && enabled && warningStyles,
    (Array.isArray(children)
      ? children.some((child) => child && typeof child === 'object')
      : children && typeof children === 'object') ||
      (small ? null : largeTextOnlyStyles),
    (Array.isArray(children)
      ? children.some((child) => typeof child === 'string')
      : typeof children === 'string') ||
      (small ? smallIconOnlyStyles : largeIconOnlyStyles),
    fullWidth && fullWidthStyles,
  ]);

export const buttonLoadingContentStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

export const getButtonChildren = (children = [] as React.ReactNode) =>
  Array.isArray(children) ? (
    children.map((child) =>
      typeof child === 'string' ? <span key={child}>{child}</span> : child,
    )
  ) : typeof children === 'string' ? (
    <span>{children}</span>
  ) : (
    children
  );
