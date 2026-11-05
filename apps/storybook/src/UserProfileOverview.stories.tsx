import { createUserResponse } from '@asap-hub/fixtures';
import { UserProfileOverview } from '@asap-hub/react-components';

export default {
  title: 'Templates / User Profile / Overview',
};

const props = {
  ...createUserResponse(),
  biography:
    'Tess W. B. Goetz, PhD is an Assistant Professor at Yale University. Based in the department of Biology, Tess investigates how image sampling can advance sectors and industries through multi-levelled and networked innovation. Her work increasingly explores the intersection between biology systems and transitions theory to consider new methodological opportunities.',
  expertiseAndResourceDescription:
    'Tess’s lab specialises in live-cell and high-content imaging of protein aggregation in neurons, with a focus on how alpha-synuclein spreads between cells. The team has experience with confocal, light-sheet and super-resolution microscopy, and with building automated image analysis pipelines in Python and Fiji.',
  tags: [
    { id: '1', name: 'Alpha-synuclein' },
    { id: '2', name: 'Microscopy' },
    { id: '3', name: 'iPSC' },
    { id: '4', name: 'Image analysis' },
    { id: '5', name: 'LRRK2' },
  ],
  responsibilities:
    'Tess is a Co-PI on her CRN team and leads its imaging work across three sites. She also co-chairs the Imaging working group.',
  researchInterests:
    'Tess studies how alpha-synuclein spreads between neurons and whether slowing that spread can protect dopaminergic cells.',
  orcid: '0000-0002-1825-0097',
  orcidWorks: [
    {
      id: '1',
      doi: 'https://doi.org/10.1000/1',
      title:
        'Alpha-synuclein transfer between iPSC-derived neurons in co-culture',
      type: 'JOURNAL_ARTICLE' as const,
      publicationDate: { year: '2025', month: '03', day: '14' },
      lastModifiedDate: '2025-03-14T00:00:00Z',
    },
  ],
  questions: [
    'Are alpha-synuclein deposits the cause or consequence of something deeper wrong with neurons?',
    'How much do we have to knock down extracellular alpha-synuclein to measurably slow cell to cell transmission (if this approach even works)?',
  ],
};

export const Normal = () => <UserProfileOverview {...props} />;

export const OwnProfile = () => (
  <UserProfileOverview
    {...props}
    editHrefs={{
      biography: '#edit',
      expertiseAndResources: '#edit',
      role: '#edit',
    }}
  />
);

export const Empty = () => (
  <UserProfileOverview
    {...props}
    questions={[]}
    tags={[]}
    biography={undefined}
    expertiseAndResourceDescription={undefined}
    responsibilities={undefined}
    researchInterests={undefined}
    reachOut={undefined}
    orcidWorks={[]}
  />
);
