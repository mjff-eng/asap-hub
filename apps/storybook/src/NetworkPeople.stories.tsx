import { ComponentProps } from 'react';
import { NetworkPeople } from '@asap-hub/react-components';
import { TeamRole } from '@asap-hub/model';

import { number } from './knobs';

export default {
  title: 'Templates / Network / People',
  component: NetworkPeople,
};

const peopleProps = (): ComponentProps<typeof NetworkPeople> => {
  const numberOfItems = number('Number of Teams', 2, { min: 0 });
  const currentPageIndex = number('Current Page', 1, { min: 1 }) - 1;
  return {
    people: Array.from({ length: numberOfItems }, (_, i) => ({
      id: `p${i}`,
      createdDate: '2020-09-07T17:36:54Z',
      dismissedGettingStarted: true,
      displayName: `Agnete Kirkeby ${i + 1}`,
      fullDisplayName: `Agnete Kirkeby ${i + 1}`,
      firstName: 'Agnete',
      lastName: 'Kirkeby',
      email: 'agnete.kirkeby@sund.ku.dk',
      jobTitle: 'Assistant Professor',
      institution: 'University of Copenhagen',
      teams: [
        {
          id: 't1',
          displayName: 'Jakobsson, J',
          role: 'Co-Investigator' as TeamRole,
        },
      ],
      labs: [
        { id: 'cd7be4904', name: 'Manchester' },
        { id: 'cd7be4905', name: 'Glasgow' },
      ],
      onboarded: true,
      role: 'Grantee' as const,
      openScienceTeamMember: false,
      techSupport: false,
      _tags: [],
      tags: [],
      individualProjects: [],
    })).slice(currentPageIndex * 10, currentPageIndex * 10 + 10),
    numberOfItems,
    numberOfPages: Math.max(1, Math.ceil(numberOfItems / 10)),
    currentPageIndex,
    renderPageHref: (index) => `#${index}`,
  };
};

export const Normal = () => <NetworkPeople {...peopleProps()} />;
