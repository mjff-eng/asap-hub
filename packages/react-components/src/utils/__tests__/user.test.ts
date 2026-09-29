import { formatUserLocation, formatUserSocial, toUserSocialUrl } from '../user';

describe('formatUserLocation', () => {
  it.each`
    country      | stateOrProvince      | city         | text
    ${undefined} | ${undefined}         | ${undefined} | ${''}
    ${undefined} | ${undefined}         | ${'City'}    | ${'City'}
    ${undefined} | ${'StateOrProvince'} | ${undefined} | ${'StateOrProvince'}
    ${'Country'} | ${undefined}         | ${undefined} | ${'Country'}
    ${undefined} | ${'StateOrProvince'} | ${'City'}    | ${'City, StateOrProvince'}
    ${'Country'} | ${undefined}         | ${'City'}    | ${'City, Country'}
    ${'Country'} | ${'StateOrProvince'} | ${undefined} | ${'StateOrProvince, Country'}
    ${'Country'} | ${'StateOrProvince'} | ${'City'}    | ${'City, StateOrProvince, Country'}
  `(
    'generates the location description "$text"',
    ({ text, city, stateOrProvince, country }) => {
      expect(formatUserLocation(city, stateOrProvince, country)).toEqual(text);
    },
  );
});

describe('formatUserSocial', () => {
  it.each`
    social                                 | type               | result
    ${'https://twitter.com/username'}      | ${'twitter'}       | ${'username'}
    ${'https://bsky.app/profile/username'} | ${'blueSky'}       | ${'username'}
    ${'https://github.com/username'}       | ${'linkedIn'}      | ${'https://github.com/username'}
    ${''}                                  | ${'googleScholar'} | ${''}
  `(
    'generates the correct result for "$type" type',
    ({ social, type, result }) => {
      expect(formatUserSocial(social, type)).toEqual(result);
    },
  );
});

describe('toUserSocialUrl', () => {
  it.each`
    social                                 | type               | result
    ${'dnvs97'}                            | ${'linkedIn'}      | ${'https://www.linkedin.com/in/dnvs97'}
    ${'fritzsedlazeck'}                    | ${'github'}        | ${'https://github.com/fritzsedlazeck'}
    ${'aimeuramin.bsky.social'}            | ${'blueSky'}       | ${'https://bsky.app/profile/aimeuramin.bsky.social'}
    ${'E-4548-2018'}                       | ${'researcherId'}  | ${'https://publons.com/researcher/E-4548-2018'}
    ${'2722514'}                           | ${'researcherId'}  | ${'https://publons.com/researcher/2722514'}
    ${'2MAOoaIAAAAJ'}                      | ${'googleScholar'} | ${'https://scholar.google.co.uk/citations?user=2MAOoaIAAAAJ'}
    ${'https://Linkedin.com'}              | ${'linkedIn'}      | ${'https://Linkedin.com'}
    ${'/NeuroBioMed'}                      | ${'twitter'}       | ${'https://twitter.com/NeuroBioMed'}
    ${'/profile/Benjamin_Hobson'}          | ${'researchGate'}  | ${'https://www.researchgate.net/profile/Benjamin_Hobson'}
    ${'citations?user=_N6YhZUAAAAJ&hl=en'} | ${'googleScholar'} | ${'https://scholar.google.co.uk/citations?user=_N6YhZUAAAAJ&hl=en'}
    ${'1410134/guillermo-arango-duque/'}   | ${'researcherId'}  | ${'https://publons.com/researcher/1410134/guillermo-arango-duque/'}
    ${'www.linkedin.com/in/mind23'}         | ${'linkedIn'}      | ${'https://www.linkedin.com/in/mind23'}
    ${'linkedin.com/in/priya14929'}         | ${'linkedIn'}      | ${'https://www.linkedin.com/in/priya14929'}
    ${'researchgate.net/profile/Xu-Qingru'} | ${'researchGate'}  | ${'https://www.researchgate.net/profile/Xu-Qingru'}
    ${'fraserlab.com'}                      | ${'blueSky'}       | ${'https://bsky.app/profile/fraserlab.com'}
    ${'   '}                                | ${'twitter'}       | ${''}
  `('builds the profile url for "$social"', ({ social, type, result }) => {
    expect(toUserSocialUrl(social, type)).toEqual(result);
  });
});
