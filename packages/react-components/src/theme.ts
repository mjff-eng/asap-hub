import { charcoal, tin, lead, colour } from './colors';

export type ThemeVariant = 'light' | 'grey' | 'dark';
export const defaultThemeVariant: ThemeVariant = 'light';

export const themes: Record<
  ThemeVariant,
  { backgroundColor: string; color: string }
> = {
  light: { backgroundColor: colour.neutral[0].rgb, color: charcoal.rgb },
  grey: { backgroundColor: tin.rgb, color: lead.rgb },
  dark: { backgroundColor: charcoal.rgb, color: colour.neutral[0].rgb },
};
