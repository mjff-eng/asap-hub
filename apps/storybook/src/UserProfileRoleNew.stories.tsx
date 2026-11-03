import { UserProfileRoleNew } from '@asap-hub/react-components';

import { text } from './knobs';

export default {
  title: 'Organisms / User Profile / Role New',
};

const props = {
  firstName: 'Tess',
  responsibilities:
    'Tess is a Co-PI on her CRN team and leads its imaging work across three sites. She also co-chairs the Imaging working group.',
  researchInterests:
    'Tess studies how alpha-synuclein spreads between neurons and whether slowing that spread can protect dopaminergic cells. She is particularly interested in early aggregation events that standard imaging methods tend to miss.',
  reachOut:
    'Imaging experiment design, image analysis, and access to the lab’s cell lines and datasets.',
};

export const Grantee = () => (
  <UserProfileRoleNew
    {...props}
    role="Grantee"
    responsibilities={text('Responsibilities', props.responsibilities)}
    researchInterests={text('Research Interests', props.researchInterests)}
  />
);

export const Staff = () => (
  <UserProfileRoleNew
    {...props}
    role="Staff"
    responsibilities={text('Responsibilities', props.responsibilities)}
    reachOut={text('Reach Out', props.reachOut)}
  />
);

export const OwnProfile = () => (
  <UserProfileRoleNew {...props} role="Grantee" editHref="#edit" />
);

export const Alumni = () => (
  <UserProfileRoleNew
    {...props}
    role="Grantee"
    alumniSinceDate="2024-01-01T00:00:00Z"
  />
);

export const Empty = () => (
  <UserProfileRoleNew firstName="Tess" role="Grantee" />
);
