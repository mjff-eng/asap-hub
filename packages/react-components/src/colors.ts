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

type PrimitiveColours<T> = T extends readonly [number, number, number]
  ? OpaqueColor
  : T extends readonly [number, number, number, number]
    ? TransparentColor
    : { readonly [K in keyof T]: PrimitiveColours<T[K]> };

const toColours = <T>(node: T): PrimitiveColours<T> =>
  (Array.isArray(node)
    ? color(...(node as [number, number, number, number]))
    : Object.fromEntries(
        Object.entries(node as Record<string, unknown>).map(([key, child]) => [
          key,
          toColours(child),
        ]),
      )) as PrimitiveColours<T>;

export const colour = {
  ...toColours(casPrimitives),
  ...casThemeVariables,
};

// Monochrome
/** @deprecated use `colour.background.secondary`. */
export const pearl = colour.neutral[25];
/** @deprecated use `colour.foreground.primary`. */
export const charcoal = colour.neutral[900];

// Accent

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const cerulean = colour.brand.gp2[500];

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const space = color(0, 69, 97);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const azure = colour.brand.gp2[25];

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const magenta = color(207, 47, 179);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const berry = color(154, 35, 134);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const lilac = colour.general.purple.lavender[25];

/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const iris = color(140, 78, 159);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const mauve = color(105, 59, 119);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const lavender = colour.general.purple.iris[25];

/** @deprecated use `colour.background.error`. */
export const error100 = colour.utilitarian.red[100];
/** @deprecated use `colour.foreground.error` for text and icons, `colour.border.error` for borders. */
export const error500 = colour.utilitarian.red[600];
/** @deprecated use `colour.background.button.utilitarian.error.hover`. */
export const error900 = colour.utilitarian.red[700];

/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info100 = colour.brand.gp2[25];
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info150 = colour.brand.gp2[100];
/** @deprecated a green named info; waiting on a design decision (see the CAS colours Notion doc). */
export const info200 = colour.brand.crn[100];
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info500 = colour.brand.gp2[500];
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const info900 = colour.brand.gp2[800];

/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const information100 = colour.brand.gp2[25];
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const information500 = colour.brand.gp2[500];
/** @deprecated CAS info is utilitarian blue; waiting on a design decision (see the CAS colours Notion doc). */
export const information900 = colour.brand.gp2[800];

/** @deprecated closest is `colour.background.secondary` (#FCFCFD instead of #FAFAFA). */
export const neutral200 = colour.neutral[50];
/** @deprecated use `colour.background.tertiary`. */
export const neutral300 = colour.general.blue.cerulean[25];
/** @deprecated use `colour.border.tertiary` for borders, `colour.background.hover` for backgrounds. */
export const neutral500 = colour.neutral[100];
/** @deprecated use `colour.border.secondary`. */
export const neutral700 = colour.neutral[200];
/** @deprecated no CAS role; waiting on a design decision (see the CAS colours Notion doc). */
export const neutral800 = colour.neutral[400];
/** @deprecated no CAS role for secondary text; waiting on a design decision (see the CAS colours Notion doc). */
export const neutral900 = colour.neutral[600];
/** @deprecated use `colour.foreground.primary`. */
export const neutral1000 = colour.neutral[900];

/** @deprecated CAS success is utilitarian green; waiting on a design decision (see the CAS colours Notion doc). */
export const success100 = colour.brand.crn[25];
/** @deprecated CAS success is utilitarian green; waiting on a design decision (see the CAS colours Notion doc). */
export const success500 = colour.brand.crn[500];
/** @deprecated CAS success is utilitarian green; waiting on a design decision (see the CAS colours Notion doc). */
export const success900 = colour.brand.crn[800];

/** @deprecated closest is `colour.background.warning` (orange 100 instead of 50). */
export const warning100 = colour.utilitarian.orange[50];
/** @deprecated use `colour.background.warning`. */
export const warning150 = colour.utilitarian.orange[100];
/** @deprecated use `colour.foreground.warning` for text and icons, `colour.border.warning` for borders. */
export const warning500 = colour.utilitarian.orange[600];
/** @deprecated use `colour.background.button.utilitarian.warning.hover`. */
export const warning900 = colour.utilitarian.orange[700];
