import {
  nextThemeMode,
  readThemeMode,
  themeStorageKey,
  writeThemeMode,
} from '../themeMode';

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('follows the system until a theme is chosen', () => {
  expect(readThemeMode()).toBe('system');

  window.localStorage.setItem(themeStorageKey, 'dark');
  expect(readThemeMode()).toBe('dark');
});

it('ignores a stored value that is not a theme', () => {
  window.localStorage.setItem(themeStorageKey, 'sepia');

  expect(readThemeMode()).toBe('system');
});

it('cycles light, dark, system and back to light', () => {
  expect(nextThemeMode('light')).toBe('dark');
  expect(nextThemeMode('dark')).toBe('system');
  expect(nextThemeMode('system')).toBe('light');
});

describe('with storage blocked', () => {
  beforeEach(() => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
  });

  it('falls back to the system theme', () => {
    expect(readThemeMode()).toBe('system');
  });

  it('still applies a chosen theme to the page', () => {
    writeThemeMode('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
