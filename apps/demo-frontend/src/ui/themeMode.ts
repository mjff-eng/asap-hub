export type ThemeMode = 'light' | 'dark' | 'system';

export const themeStorageKey = 'demo-hub.theme';

export const themeModes: readonly ThemeMode[] = ['light', 'dark', 'system'];

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

export const readThemeMode = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

// In system mode the attribute is removed rather than stamped with a resolved
// value, so the prefers-color-scheme fallback in GlobalStyles keeps following
// the OS for the whole session without anything subscribing to matchMedia.
export const applyThemeMode = (mode: ThemeMode): void => {
  if (mode === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
};

export const writeThemeMode = (mode: ThemeMode): void => {
  try {
    window.localStorage.setItem(themeStorageKey, mode);
  } catch {
    // a blocked storage should not break theming
  }
  applyThemeMode(mode);
};

export const nextThemeMode = (mode: ThemeMode): ThemeMode =>
  themeModes[(themeModes.indexOf(mode) + 1) % themeModes.length] as ThemeMode;

export const themeModeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
