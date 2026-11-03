import { createUserResponse } from '@asap-hub/fixtures';
import { UserProfileOverview } from '@asap-hub/react-components';

export default {
  title: 'Templates / User Profile / Overview',
};

const userFixture = createUserResponse();

const props = {
  ...userFixture,
  biography:
    'Tess W. B. Goetz, PhD is an Assistant Professor at Yale University. Based in the department of Biology, Tess investigates how image sampling can advance sectors and industries through multi-levelled and networked innovation. Her work increasingly explores the intersection between biology systems and transitions theory to consider new methodological opportunities.',
  questions: [
    'Are alpha-synuclein deposits the cause or consequence of something deeper wrong with neurons?',
    'How much do we have to knock down extracellular alpha-synuclein to measurably slow cell to cell transmission (if this approach even works)?',
  ],
};

export const Normal = () => <UserProfileOverview {...props} />;

export const OwnProfile = () => (
  <UserProfileOverview {...props} editHrefs={{ biography: '#edit' }} />
);

export const Empty = () => (
  <UserProfileOverview {...props} biography={undefined} questions={[]} />
);
