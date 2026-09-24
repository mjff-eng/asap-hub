import { casTheme } from './cas-tokens.generated';
import { colour, cssColour } from './colors';

export type ThemeVariant = 'light' | 'grey' | 'dark';
export const defaultThemeVariant: ThemeVariant = 'light';

export const themes: Record<
  ThemeVariant,
  { backgroundColor: string; color: string }
> = {
  light: { backgroundColor: colour.neutral[0], color: colour.neutral[900] },
  grey: { backgroundColor: colour.neutral[200], color: colour.neutral[700] },
  dark: { backgroundColor: colour.neutral[900], color: colour.neutral[0] },
};

export type Product = keyof typeof casTheme;

export const themeVariables = (product: Product): Record<string, string> =>
  Object.fromEntries(
    Object.entries(casTheme[product]).map(([name, { hex, alpha }]) => [
      `--${name.replace(/\//g, '-')}`,
      cssColour(hex, alpha),
    ]),
  );
