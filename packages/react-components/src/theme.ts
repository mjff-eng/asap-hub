import { charcoal, colour, neutral700, neutral900 } from './colors';

export type ThemeVariant = 'light' | 'grey' | 'dark';
export const defaultThemeVariant: ThemeVariant = 'light';

export const themes: Record<
  ThemeVariant,
  { backgroundColor: string; color: string }
> = {
  light: { backgroundColor: colour.neutral[0].rgb, color: charcoal.rgb },
  grey: { backgroundColor: neutral700.rgb, color: neutral900.rgb },
  dark: { backgroundColor: charcoal.rgb, color: colour.neutral[0].rgb },
};
