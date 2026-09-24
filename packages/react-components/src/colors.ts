import { casPrimitives } from './cas-tokens.generated';

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

export const colour = toColours(casPrimitives);

// Monochrome
export const pearl = colour.neutral[25];
export const charcoal = colour.neutral[900];

// Accent

export const cerulean = colour.brand.gp2[500];

export const space = color(0, 69, 97);
export const azure = colour.brand.gp2[25];

export const magenta = color(207, 47, 179);
export const berry = color(154, 35, 134);
export const lilac = colour.general.purple.lavender[25];

export const iris = color(140, 78, 159);
export const mauve = color(105, 59, 119);
export const lavender = colour.general.purple.iris[25];

export const error100 = colour.utilitarian.red[100];
export const error500 = colour.utilitarian.red[600];
export const error900 = colour.utilitarian.red[700];

export const info100 = colour.brand.gp2[25];
export const info150 = colour.brand.gp2[100];
export const info200 = colour.brand.crn[100];
export const info500 = colour.brand.gp2[500];
export const info900 = colour.brand.gp2[800];

export const information100 = colour.brand.gp2[25];
export const information500 = colour.brand.gp2[500];
export const information900 = colour.brand.gp2[800];

export const neutral200 = colour.neutral[50];
export const neutral300 = colour.general.blue.cerulean[25];
export const neutral500 = colour.neutral[100];
export const neutral700 = colour.neutral[200];
export const neutral800 = colour.neutral[400];
export const neutral900 = colour.neutral[600];
export const neutral1000 = colour.neutral[900];

export const success100 = colour.brand.crn[25];
export const success500 = colour.brand.crn[500];
export const success900 = colour.brand.crn[800];

export const warning100 = colour.utilitarian.orange[50];
export const warning150 = colour.utilitarian.orange[100];
export const warning500 = colour.utilitarian.orange[600];
export const warning900 = colour.utilitarian.orange[700];
