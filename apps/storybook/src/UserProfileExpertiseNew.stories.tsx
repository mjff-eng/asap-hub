import { UserProfileExpertiseNew } from '@asap-hub/react-components';

import { text } from './knobs';

export default {
  title: 'Organisms / User Profile / Expertise New',
};

const description =
  'Tess’s lab specialises in live-cell and high-content imaging of protein aggregation in neurons, with a focus on how alpha-synuclein spreads between cells. The team has experience with confocal, light-sheet and super-resolution microscopy, and with building automated image analysis pipelines in Python and Fiji.';

const longDescription = `${description} The lab can offer several resources to other CRN teams. These include iPSC-derived dopaminergic neuron lines carrying SNCA and LRRK2 variants, a validated protocol for tracking fluorescently tagged alpha-synuclein in co-culture, and an open-source tool for quantifying aggregate size and distribution across large image sets. Imaging datasets from published studies are available on request, along with the analysis code used to process them.`;

const tags = [
  { id: '1', name: 'Alpha-synuclein' },
  { id: '2', name: 'Microscopy' },
  { id: '3', name: 'iPSC' },
  { id: '4', name: 'Image analysis' },
  { id: '5', name: 'LRRK2' },
  { id: '6', name: 'Python' },
];

export const Normal = () => (
  <UserProfileExpertiseNew
    expertiseAndResourceDescription={text('Description', longDescription)}
    tags={tags}
  />
);

export const OwnProfile = () => (
  <UserProfileExpertiseNew
    expertiseAndResourceDescription={text('Description', longDescription)}
    tags={tags}
    editHref="#edit"
  />
);

export const ShortDescription = () => (
  <UserProfileExpertiseNew
    expertiseAndResourceDescription={text('Description', description)}
    tags={tags}
  />
);

export const NoTags = () => (
  <UserProfileExpertiseNew
    expertiseAndResourceDescription={text('Description', description)}
    tags={[]}
  />
);

export const Empty = () => <UserProfileExpertiseNew tags={[]} />;
