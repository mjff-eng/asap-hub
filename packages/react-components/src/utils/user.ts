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
};

export type UserSocialType = keyof typeof baseUrls;

export const formatUserSocial = (social: string, type: UserSocialType) =>
  social.startsWith(baseUrls[type]) ? social.split(baseUrls[type])[1] : social;

// Mirrors SocialIcons, deliberately down to the domains baseUrls above spells
// differently: that one strips what a member pastes, this one builds links.
const socialProfileUrls = {
  blueSky: 'https://bsky.app/profile/',
  twitter: 'https://twitter.com/',
  linkedIn: 'https://www.linkedin.com/in/',
  github: 'https://github.com/',
  googleScholar: 'https://scholar.google.co.uk/citations?user=',
  researchGate: 'https://www.researchgate.net/profile/',
  // Only publons.com translates a legacy numeric id to its ResearcherID;
  // webofscience.com reads it as someone else's profile.
  researcherId: 'https://publons.com/researcher/',
};

export type UserSocialProfileType = keyof typeof socialProfileUrls;

export const toUserSocialUrl = (
  social: string,
  type: UserSocialProfileType,
): string => {
  const value = social.trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const base = socialProfileUrls[type];
  const path = base.replace(/^https?:\/\/[^/]+\//, '');
  const handle = value.replace(/^\/+/, '');
  return `${base}${
    handle.startsWith(path) ? handle.slice(path.length) : handle
  }`;
};
