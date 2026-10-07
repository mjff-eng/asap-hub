export type Flag =
  | 'PERSISTENT_EXAMPLE'
  | 'QUERY_DEVTOOLS' // react query devtools
  | 'STAGING_MODE'
  | 'COMPLIANCE_NOTIFICATION_LIST'
  | 'NEW_EVENT_PAGE';

export type Flags = Partial<Record<Flag, boolean | string | undefined>>;
let overrides: Flags = {
  // flags already live in prod:
  // can also be used to manually disable a flag in development:
  COMPLIANCE_NOTIFICATION_LIST: '',
  // must stay explicitly off by default: envDefaults turn unlisted flags ON
  // in local/test/development, and the React Query devtools icon must only
  // show when deliberately enabled
  QUERY_DEVTOOLS: false,
  STAGING_MODE: false,
  NEW_EVENT_PAGE: false,
};

const envDefaults: Record<string, boolean> = {
  local: true,
  test: true,
  development: true,
  production: false,
};

let currentEnvironment: string | undefined;

export const setEnvironment = (environment?: string) => {
  currentEnvironment = environment;
};

export const isEnabled = (flag: Flag): boolean =>
  !!(
    overrides[flag] ??
    envDefaults[currentEnvironment ?? 'development'] ??
    false
  );
export const getOverrides = (): Flags => overrides;

export const setCurrentOverrides = (
  flags?: Record<string, boolean | string>,
): void => {
  if (flags) {
    overrides = Object.entries(flags).reduce<
      Record<string, boolean | string | undefined>
    >((acc, [name, val]) => {
      acc[name] = flags && flags[name] !== undefined ? flags[name] : val;
      return acc;
    }, overrides);
  }
};
const setOverride = (flag: Flag, value: boolean | string): void => {
  overrides = { ...overrides, [flag]: value };
};
export const disable = (flag: Flag): void => setOverride(flag, false);
export const enable = (flag: Flag, value?: string): void =>
  setOverride(flag, value ?? true);

export const reset = (): void => {
  overrides = {};
};
