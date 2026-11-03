import { UserProfileContext } from '@asap-hub/react-context';
import { UserProfileRecentWorksNew } from '@asap-hub/react-components';

export default {
  title: 'Organisms / User Profile / New Recent Works',
};

const orcid = '0000-0002-1825-0097';

const orcidWorks = [
  {
    id: '1',
    doi: 'https://doi.org/10.1000/1',
    title:
      'Alpha-synuclein transfer between iPSC-derived neurons in co-culture',
    type: 'JOURNAL_ARTICLE' as const,
    publicationDate: { year: '2025', month: '03', day: '14' },
    lastModifiedDate: '2025-03-14T00:00:00Z',
  },
  {
    id: '2',
    title: 'Sampling density and reproducibility in multi-site microscopy',
    type: 'JOURNAL_ARTICLE' as const,
    publicationDate: { year: '2024', month: '09', day: '02' },
    lastModifiedDate: '2024-09-02T00:00:00Z',
  },
];

export const Normal = () => (
  <UserProfileRecentWorksNew orcid={orcid} orcidWorks={orcidWorks} />
);

export const OwnProfile = () => (
  <UserProfileContext.Provider value={{ isOwnProfile: true }}>
    <UserProfileRecentWorksNew orcid={orcid} orcidWorks={orcidWorks} />
  </UserProfileContext.Provider>
);

export const Empty = () => <UserProfileRecentWorksNew orcidWorks={[]} />;

export const EmptyOwnProfile = () => (
  <UserProfileContext.Provider value={{ isOwnProfile: true }}>
    <UserProfileRecentWorksNew orcid={orcid} orcidWorks={[]} />
  </UserProfileContext.Provider>
);
