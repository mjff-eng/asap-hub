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

// Accent colours with no CAS equivalent yet; design question 3 decides their future.
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const magenta = color(207, 47, 179);
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const iris = color(140, 78, 159);
