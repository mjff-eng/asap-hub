import { ComponentProps } from 'react';
import { DiscoverPageBody } from '@asap-hub/react-components';

import { text } from './knobs';

export default {
  title: 'Templates / Discover / Page Body',
};

const baseMemberProps = {
  onboarded: true,
  lastModifiedDate: '',
  createdDate: '',
  teams: [],
  _tags: [],
  email: '',
  labs: [],
  questions: [],
  workingGroups: [],
  interestGroups: [],
  projects: [],
};
const members = [
  {
    ...baseMemberProps,
    id: '1',
    displayName: 'Daniel Ramirez',
    fullDisplayName: 'Daniel Ramirez',
    firstName: 'Daniel',
    lastName: 'Ramirez',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
  {
    ...baseMemberProps,
    id: '2',
    displayName: 'Peter Venkman',
    fullDisplayName: 'Peter Venkman',
    firstName: 'Peter',
    lastName: 'Venkman',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
  {
    ...baseMemberProps,
    id: '3',
    displayName: 'Tess Goetz',
    fullDisplayName: 'Tess W. B. Goetz',
    firstName: 'Tess',
    lastName: 'Goetz',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
  {
    ...baseMemberProps,
    id: '4',
    displayName: 'Robin Peploe',
    fullDisplayName: 'Robin Peploe',
    firstName: 'Robin',
    lastName: 'Peploe',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
  {
    ...baseMemberProps,
    id: '5',
    displayName: 'Alice Lane',
    fullDisplayName: 'Alice Lane',
    firstName: 'Alice',
    lastName: 'Lane',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
  {
    ...baseMemberProps,
    id: '6',
    displayName: 'Philip Mars',
    fullDisplayName: 'Philip Mars',
    firstName: 'Philip',
    lastName: 'Mars',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
  {
    ...baseMemberProps,
    id: '7',
    displayName: 'Emmanuel Depay',
    fullDisplayName: 'Emmanuel Depay',
    firstName: 'Emanuel',
    lastName: 'Depay',
    role: 'Staff' as const,
    openScienceTeamMember: false,
    techSupport: false,
  },
];
const props = (): ComponentProps<typeof DiscoverPageBody> => ({
  members,
  scientificAdvisoryBoard: members,
  aboutUs: text('About Us', ''),
  cnsQuestMembers: [],
  asapAreas: [],
});

export const Normal = () => <DiscoverPageBody {...props()} />;
