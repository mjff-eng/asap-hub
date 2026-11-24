import { AsapAreaMember, AsapAreaResponse } from '@asap-hub/model';
import { MeetAsapTeam } from '@asap-hub/react-components';

export default {
  title: 'Organisms / About / Meet the ASAP Team',
  component: MeetAsapTeam,
};

const names: [string, string][] = [
  ['Sarah', 'Jones'],
  ['Tom', 'Sargent'],
  ['Alice', 'Smith'],
  ['Mark', 'Davies'],
  ['Rosa', 'Lopez'],
  ['Samir', 'Khan'],
  ['Emma', 'Brown'],
  ['Lucas', 'Martin'],
  ['Nina', 'Patel'],
  ['Oliver', 'Wright'],
  ['Grace', 'Kim'],
  ['Hugo', 'Sarr'],
  ['Ivy', 'Clarke'],
  ['Jack', 'Evans'],
  ['Kate', 'Murphy'],
  ['Leo', 'Rossi'],
];

const members: AsapAreaMember[] = names.map(([firstName, lastName], i) => ({
  id: `user-${i}`,
  firstName,
  lastName,
  displayName: `${firstName} ${lastName}`,
}));

const area = (
  id: string,
  name: string,
  memberIndexes: number[],
  overrides: Partial<AsapAreaResponse> = {},
): AsapAreaResponse => ({
  id,
  name,
  objective:
    'Develop cross-program strategy for implementation across ASAP programs.',
  primaryEmail: 'grants@parkinsonsroadmap.org',
  members: members.filter((_, index) => memberIndexes.includes(index)),
  ...overrides,
});

const areas: AsapAreaResponse[] = [
  area('executive-leadership', 'Executive Leadership', [0, 2, 3, 4, 6, 7]),
  area('programmatic-leads', 'Programmatic Leads', [1, 5, 8, 9]),
  area('scientific-facilitators', 'Scientific Facilitators', [10, 11, 12]),
  area('grantee-workforce', 'Grantee and Workforce Development', [13, 14]),
  area('research-operations', 'Research Operations', [15, 3]),
  area('events', 'Events', [0, 1, 4, 9], {
    objective:
      'Plan and execute scientific meetings, workshops, and convenings.',
    primaryEmail: 'meetings@parkinsonsroadmap.org',
    secondaryEmail: 'cosa@parkinsonsroadmap.org',
  }),
  area('tools-program', 'Tools Program', [6]),
  area('open-science', 'Open Science', [7, 8]),
  area('tech-support', 'Tech Support', [12]),
  area('communications', 'Communications', [0, 14]),
];

export const Normal = () => <MeetAsapTeam areas={areas} />;

export const TwoEmails = () => (
  <MeetAsapTeam
    areas={[
      ...areas.filter(({ id }) => id === 'events'),
      ...areas.filter(({ id }) => id !== 'events'),
    ]}
  />
);

export const MoreThanTenMembers = () => (
  <MeetAsapTeam
    areas={[
      area(
        'executive-leadership',
        'Executive Leadership',
        members.map((_, i) => i),
      ),
      ...areas.slice(1),
    ]}
  />
);
