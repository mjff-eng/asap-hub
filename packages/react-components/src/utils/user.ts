export const splitDisplayName = (displayName: string) => {
  const [firstName, ...rest] = displayName.split(' ');
  return { firstName, lastName: rest.join(' ') };
};

export const formatUserLocation = (
  city?: string,
  stateOrProvince?: string,
  country?: string,
): string => {
  let formattedLocation = '';

  if (city) {
    formattedLocation += city;
  }

  if (stateOrProvince) {
    formattedLocation += city ? `, ${stateOrProvince}` : stateOrProvince;
  }

  if (country) {
    formattedLocation += city || stateOrProvince ? `, ${country}` : country;
  }

  return formattedLocation;
};

const baseUrls = {
  blueSky: 'https://bsky.app/profile/',
  twitter: 'https://twitter.com/',
  linkedIn: 'https://www.linkedin.com/in/',
  github: 'https://github.com/',
  googleScholar: 'https://scholar.google.com/citations?user=',
  researchGate: 'https://www.researchgate.net/profile/',
  // Only publons.com translates a legacy numeric id to its ResearcherID;
  // webofscience.com reads it as someone else's profile.
  researcherId: 'https://publons.com/researcher/',
};

export type UserSocialType = keyof typeof baseUrls;

export const formatUserSocial = (social: string, type: UserSocialType) =>
  social.startsWith(baseUrls[type]) ? social.split(baseUrls[type])[1] : social;

export const toUserSocialUrl = (
  social: string,
  type: UserSocialType,
): string => {
  const value = social.trim();
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const base = baseUrls[type];
  const host = base.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  const path = base.replace(/^https?:\/\/[^/]+\//, '');
  const prefix = [`www.${host}`, host].find((candidate) =>
    value.toLowerCase().startsWith(candidate),
  );
  const handle = (prefix ? value.slice(prefix.length) : value).replace(
    /^\/+/,
    '',
  );
  return `${base}${
    handle.startsWith(path) ? handle.slice(path.length) : handle
  }`;
};
