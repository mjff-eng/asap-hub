import { casPrimitives, casThemeVariables } from './cas-tokens.generated';

export interface OpaqueColor {
  r: number;
  g: number;
  b: number;
  rgb: string;
  rgba: string;
  hex: string;
}
export interface TransparentColor {
  r: number;
  g: number;
  b: number;
  a: number;
  rgba: string;
}

export function color(r: number, g: number, b: number): OpaqueColor;
export function color(
  r: number,
  g: number,
  b: number,
  a: number,
): TransparentColor;
export function color(
  r: number,
  g: number,
  b: number,
  a?: number,
): OpaqueColor | TransparentColor {
  return typeof a === 'number'
    ? {
        r,
        g,
        b,
        a,
        rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
      }
    : {
        r,
        g,
        b,
        rgb: `rgb(${r}, ${g}, ${b})`,
        rgba: `rgba(${r}, ${g}, ${b}, 1)`,
        hex:
          // eslint-disable-next-line prefer-template
          '#' +
          r.toString(16).padStart(2, '0') +
          g.toString(16).padStart(2, '0') +
          b.toString(16).padStart(2, '0'),
      };
}

export const colorWithTransparency = (
  opaqueColor: OpaqueColor,
  a: number,
): TransparentColor => color(opaqueColor.r, opaqueColor.g, opaqueColor.b, a);

export const colorFromHex = (hex: string): OpaqueColor =>
  color(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  );

type PrimitiveValues<T> = T extends readonly number[]
  ? string
  : { readonly [K in keyof T]: PrimitiveValues<T[K]> };

const toCss = (channels: readonly number[]): string =>
  channels.length === 4
    ? `rgba(${channels.join(', ')})`
    : `#${channels
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}`;

const toValues = <T>(node: T): PrimitiveValues<T> =>
  (Array.isArray(node)
    ? toCss(node)
    : Object.fromEntries(
        Object.entries(node as Record<string, unknown>).map(([key, child]) => [
          key,
          toValues(child),
        ]),
      )) as PrimitiveValues<T>;

export const colour = {
  ...toValues(casPrimitives),
  ...casThemeVariables,
};

// Monochrome
/** @deprecated use `colour.background.secondary`. */
export const pearl = colorFromHex(colour.neutral[25]);
/** @deprecated use `colour.foreground.primary`. */
export const charcoal = colorFromHex(colour.neutral[900]);

// Accent

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const cerulean = colorFromHex(colour.brand.gp2[500]);

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const space = color(0, 69, 97);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const azure = colorFromHex(colour.brand.gp2[25]);

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const magenta = color(207, 47, 179);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const berry = color(154, 35, 134);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const lilac = colorFromHex(colour.general.purple.lavender[25]);

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const iris = color(140, 78, 159);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const mauve = color(105, 59, 119);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const lavender = colorFromHex(colour.general.purple.iris[25]);

/** @deprecated use `colour.background.error`. */
export const error100 = colorFromHex(colour.utilitarian.red[100]);
/** @deprecated use `colour.foreground.error` for text and icons, `colour.border.error` for borders. */
export const error500 = colorFromHex(colour.utilitarian.red[600]);
/** @deprecated use `colour.background.button.utilitarian.error.hover`. */
export const error900 = colorFromHex(colour.utilitarian.red[700]);

/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info100 = colorFromHex(colour.brand.gp2[25]);
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info150 = colorFromHex(colour.brand.gp2[100]);
/** @deprecated a green named info; waiting on a design decision (see the CAS colours Notion doc). */
export const info200 = colorFromHex(colour.brand.crn[100]);
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info500 = colorFromHex(colour.brand.gp2[500]);
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info900 = colorFromHex(colour.brand.gp2[800]);

/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const information100 = colorFromHex(colour.brand.gp2[25]);
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const information500 = colorFromHex(colour.brand.gp2[500]);
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const information900 = colorFromHex(colour.brand.gp2[800]);

/** @deprecated closest is `colour.background.secondary` (#FCFCFD instead of #FAFAFA). */
export const neutral200 = colorFromHex(colour.neutral[50]);
/** @deprecated use `colour.background.tertiary`. */
export const neutral300 = colorFromHex(colour.general.blue.cerulean[25]);
/** @deprecated use `colour.border.tertiary` for borders, `colour.background.hover` for backgrounds. */
export const neutral500 = colorFromHex(colour.neutral[100]);
/** @deprecated use `colour.border.secondary`. */
export const neutral700 = colorFromHex(colour.neutral[200]);
/** @deprecated no CAS role; waiting on a design decision (see the CAS colours Notion doc). */
export const neutral800 = colorFromHex(colour.neutral[400]);
/** @deprecated no CAS role for secondary text; waiting on a design decision (see the CAS colours Notion doc). */
export const neutral900 = colorFromHex(colour.neutral[600]);
/** @deprecated use `colour.foreground.primary`. */
export const neutral1000 = colorFromHex(colour.neutral[900]);

/** @deprecated CAS success is utilitarian green; waiting on a design decision (see the CAS colours Notion doc). */
export const success100 = colorFromHex(colour.brand.crn[25]);
/** @deprecated CAS success is utilitarian green; waiting on a design decision (see the CAS colours Notion doc). */
export const success500 = colorFromHex(colour.brand.crn[500]);
/** @deprecated CAS success is utilitarian green; waiting on a design decision (see the CAS colours Notion doc). */
export const success900 = colorFromHex(colour.brand.crn[800]);

/** @deprecated closest is `colour.background.warning` (orange 100 instead of 50). */
export const warning100 = colorFromHex(colour.utilitarian.orange[50]);
/** @deprecated use `colour.background.warning`. */
export const warning150 = colorFromHex(colour.utilitarian.orange[100]);
/** @deprecated use `colour.foreground.warning` for text and icons, `colour.border.warning` for borders. */
export const warning500 = colorFromHex(colour.utilitarian.orange[600]);
/** @deprecated use `colour.background.button.utilitarian.warning.hover`. */
export const warning900 = colorFromHex(colour.utilitarian.orange[700]);
