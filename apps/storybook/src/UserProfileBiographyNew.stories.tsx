import { UserProfileBiographyNew } from '@asap-hub/react-components';

import { array, text } from './knobs';

export default {
  title: 'Organisms / User Profile / Biography New',
};

const biography =
  'Tess W. B. Goetz, PhD is an Assistant Professor at Yale University. Based in the department of Biology, Tess investigates how image sampling can advance sectors and industries through multi-levelled and networked innovation. Her work increasingly explores the intersection between biology systems and transitions theory to consider new methodological opportunities.';

const longBiography = `${biography} Before joining Yale in 2021, Tess was a postdoctoral fellow at the University of Edinburgh, where she developed high-throughput imaging methods for tracking protein aggregation in cultured neurons. Her doctoral research at King’s College London looked at how sampling density affects the reproducibility of microscopy data across laboratories, and that question still shapes much of her current work.`;

const questions = [
  'Are alpha-synuclein deposits the cause or consequence of something deeper wrong with neurons?',
  'How much do we have to knock down extracellular alpha-synuclein to measurably slow cell to cell transmission (if this approach even works)?',
];

export const Normal = () => (
  <UserProfileBiographyNew
    biography={text('Biography', longBiography)}
    questions={array('Questions', questions)}
  />
);

export const OwnProfile = () => (
  <UserProfileBiographyNew
    biography={text('Biography', longBiography)}
    questions={array('Questions', questions)}
    editHref="#edit"
  />
);

export const ShortBiography = () => (
  <UserProfileBiographyNew
    biography={text('Biography', biography)}
    questions={array('Questions', questions)}
  />
);

export const NoOpenQuestions = () => (
  <UserProfileBiographyNew
    biography={text('Biography', biography)}
    questions={[]}
  />
);

export const Empty = () => <UserProfileBiographyNew questions={[]} />;
