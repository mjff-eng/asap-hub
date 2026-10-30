import { PeopleCard } from '@asap-hub/react-components';

import { text, boolean, date, number, select } from './knobs';

export default {
  title: 'Organisms / Network / People Card',
};

const degree = select(
  'Degree',
  ['Empty', 'BA', 'BSc', 'MSc', 'PhD', 'MD', 'MD, PhD', 'MPH', 'MA', 'MBA'],
  'PhD',
);

const props = {
  alumniSinceDate: undefined,
  id: 'u42',
  displayName: text('Display Name', 'Phillip Mars, PhD'),
  fullDisplayName: text('Display Name', 'Phillip Mars, PhD'),
  createdDate: new Date(
    date('Created Date', new Date(2020, 6, 12, 14, 32)),
  ).toISOString(),
  city: text('City', 'New Haven'),
  country: text('Country', 'United States'),
  degree: degree === 'Empty' ? undefined : degree,
  dismissedGettingStarted: true,
  email: 'agnete.kirkeby@sund.ku.dk',
  institution: text('Institution', 'Yale University'),
  firstName: text('First Name', 'Phillip'),
  lastName: text('Last Name', 'Mars'),
  teams: Array(number('Number of Teams', 1)).fill({
    id: 't42',
    role: text('Role', 'Researcher'),
    displayName: text('Team Name', 'A'),
  }),
  onboarded: true,
  jobTitle: text('Job Title', 'Assistant Professor'),
  avatarUrl: text(
    'Avatar URL',
    'https://www.hhmi.org/sites/default/files/styles/epsa_250_250/public/Programs/Investigator/Randy-Schekman-400x400.jpg',
  ),
  role: select('ASAP Hub Role', ['Staff', 'Grantee', 'Guest'], 'Grantee'),
  openScienceTeamMember: boolean('Open Science Team Member', false),
  techSupport: boolean('Tech Support', false),
  labs: Array.from({ length: number('Labs', 0, { min: 0 }) }).map((_, i) => ({
    id: `${i}`,
    name: `${i}`,
  })),
  _tags: [],
  tags: [],
  individualProjects: [],
};

export const Normal = () => <PeopleCard {...props} />;
export const Alumni = () => (
  <PeopleCard
    {...props}
    alumniSinceDate={new Date(
      date('Alumni Since Date', new Date(2021, 6, 12, 14, 32)),
    ).toISOString()}
  />
);

export const MultipleRolesSameTeam = () => (
  <PeopleCard
    {...props}
    teams={[
      {
        id: 't1',
        role: 'Lead PI (Core Leadership)',
        displayName: 'Team Alpha',
      },
      { id: 't1', role: 'Project Manager', displayName: 'Team Alpha' },
      { id: 't1', role: 'Collaborating PI', displayName: 'Team Alpha' },
    ]}
  />
);

export const MultipleRolesMultipleTeams = () => (
  <PeopleCard
    {...props}
    teams={[
      {
        id: 't1',
        role: 'Lead PI (Core Leadership)',
        displayName: 'Team Alpha',
      },
      { id: 't1', role: 'Project Manager', displayName: 'Team Alpha' },
      { id: 't2', role: 'Collaborating PI', displayName: 'Team Beta' },
      { id: 't3', role: 'Key Personnel', displayName: 'Team Gamma' },
    ]}
  />
);

export const MultipleLabs = () => (
  <PeopleCard
    {...props}
    labs={[
      { id: 'lab-1', name: 'Bhatt' },
      { id: 'lab-2', name: 'Anderson' },
      { id: 'lab-3', name: 'Smith' },
    ]}
  />
);
