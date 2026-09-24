import { casPrimitives, casThemeVariables } from './cas-tokens.generated';

export const cssColour = (hex: string, alpha = 1): string =>
  alpha === 1
    ? hex
    : `rgba(${[1, 3, 5]
        .map((start) => parseInt(hex.slice(start, start + 2), 16))
        .join(', ')}, ${alpha})`;

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
export const magenta = '#CF2FB3';
/** @deprecated not in CAS; waiting on a design decision (see the CAS colours Notion doc). */
export const iris = '#8C4E9F';
