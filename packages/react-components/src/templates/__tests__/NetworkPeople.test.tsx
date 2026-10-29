import { ComponentProps } from 'react';
import { render } from '@testing-library/react';

import NetworkPeople from '../NetworkPeople';

const person: ComponentProps<typeof NetworkPeople>['people'][0] = {
  id: '55724942-3408-4ad6-9a73-14b92226ffb6',
  createdDate: '2020-09-07T17:36:54Z',
  dismissedGettingStarted: true,
  displayName: 'Person A',
  fullDisplayName: 'Person A',
  firstName: 'Agnete',
  lastName: 'Kirkeby',
  jobTitle: 'Assistant Professor',
  email: 'agnete.kirkeby@sund.ku.dk',
  institution: 'University of Copenhagen',
  teams: [
    {
      id: 'e12729e0-a244-471f-a554-7b58eae83a8d',
      displayName: 'Jakobsson, J',
      role: 'Lead PI (Core Leadership)',
    },
  ],
  individualProjects: [],
  labs: [
    { id: 'cd7be4902', name: 'Barcelona' },
    { id: 'cd7be4905', name: 'Glasgow' },
  ],
  onboarded: true,
  role: 'Grantee',
  openScienceTeamMember: false,
  techSupport: false,
  _tags: [],
};
const people = [
  person,
  { ...person, id: '43', fullDisplayName: 'Person B', labs: [] },
];
const props: ComponentProps<typeof NetworkPeople> = {
  people,
  numberOfItems: people.length,
  numberOfPages: 1,
  currentPageIndex: 0,
  renderPageHref: (index) => `#${index}`,
};

it('renders multiple people cards', () => {
  const { queryAllByRole } = render(<NetworkPeople {...props} />);
  expect(
    queryAllByRole('heading').map(({ textContent }) => textContent),
  ).toEqual(['Person A', 'Person B']);
});
