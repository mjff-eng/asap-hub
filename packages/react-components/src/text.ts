import { isValidElement } from 'react';
import { CSSObject } from '@emotion/react';

import { casFontFamily, casTextStyles } from './cas-tokens.generated';
import { rem } from './pixels';

export type TextChild = React.ReactText | boolean | null | undefined;
export type TextChildren = TextChild | ReadonlyArray<TextChild>;
export type AllowedElement = React.ReactElement<HTMLElement>;
export type AllowedChildren =
  | TextChildren
  | AllowedElement
  | ReadonlyArray<AllowedElement | AllowedChildren>;

const isTextChild = (child: unknown): child is TextChild =>
  child === null ||
  ['string', 'number', 'boolean', 'undefined'].includes(typeof child);

export const isTextChildren = (children: unknown): children is TextChildren => {
  if (isTextChild(children)) return true;
  if (Array.isArray(children))
    return children.every((child) => isTextChildren(child));
  return false;
};

export function assertIsTextChildren(
  children: unknown,
): asserts children is TextChildren {
  if (!isTextChildren(children)) {
    throw new Error(`Expected text children, got ${String(children)}`);
  }
}

const isAllowedElement = (child: unknown): child is AllowedElement => {
  if (
    typeof child === 'object' &&
    isValidElement(child) &&
    typeof child.type === 'string' &&
    ['i', 'em', 'b', 'strong', 'u'].includes(child.type.toLowerCase())
  )
    return true;
  return false;
};

export const isAllowedChildren = (
  children: unknown,
): children is AllowedChildren => {
  if (isTextChild(children)) return true;

  if (isAllowedElement(children)) {
    if (children.props.children) {
      return isAllowedChildren(children.props.children);
    }
    return true;
  }

  if (Array.isArray(children))
    return children.every(
      (child) => isAllowedChildren(child) || isAllowedElement(child),
    );
  return false;
};

const body = casTextStyles.body.regular;

export const fontStyles = {
  fontFamily: `${casFontFamily.body}, 'Roboto Slab', Calibri, Mukta, Candara, Segoe, 'Segoe UI', Optima, Arial, sans-serif`,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'auto',

  // This value must be declared in pixels so that the rest of the UI inherits its base value from it
  fontSize: `${body.fontSize}px`,
  lineHeight: rem(body.lineHeight),
} as const;
export const captionStyles = {
  fontSize: rem(14),
};
export const layoutStyles = {
  marginTop: '12px',
  marginBottom: '12px',

  ':empty': {
    display: 'none',
  },
} as const;
type TextStyle = {
  readonly family: keyof typeof casFontFamily;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: number;
};
const textStyle = ({
  family,
  fontSize,
  lineHeight,
  fontWeight,
}: TextStyle): CSSObject => ({
  fontFamily: casFontFamily[family],
  fontSize: `${fontSize}px`,
  lineHeight: `${lineHeight}px`,
  fontWeight,
});

// Each level takes the Figma style closest to its size before CAS (Elena, 22 Oct 2026)
export const headlineStyles = {
  1: textStyle(casTextStyles.heading[2].bold),
  2: textStyle(casTextStyles.heading[3].bold),
  3: textStyle(casTextStyles.heading[4].bold),
  4: textStyle(casTextStyles.heading[6].bold),
  5: {
    ...fontStyles,
    fontFamily: casFontFamily.body,
    fontWeight: casTextStyles.body.bold.fontWeight,
  } as CSSObject,
  6: {
    ...fontStyles,
    fontWeight: body.fontWeight,
  } as CSSObject,
} as const;

export type AccentColorName =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'brand'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'disabled';
