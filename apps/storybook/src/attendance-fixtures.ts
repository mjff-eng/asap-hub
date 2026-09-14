import type {
  AttendanceSearchOption,
  EventAttendanceTeam,
} from '@asap-hub/react-components';

export type AttendanceCounts = {
  interestGroupTeams: number;
  interestGroupAttended: number;
  additionalTeams: number;
  additionalTeamsAttended: number;
  hasInactiveTeam: boolean;
};

const teamTypes = ['Discovery Team', 'Resource Team'] as const;

export const buildAttendanceTeams = ({
  interestGroupTeams,
  interestGroupAttended,
  additionalTeams,
  additionalTeamsAttended,
  hasInactiveTeam,
}: AttendanceCounts): EventAttendanceTeam[] => {
  // The badge follows the rows that exist, so the control still does something
  // when the hosting group contributes nothing.
  const inactiveSection =
    interestGroupTeams > 2 ? 'interestGroup' : 'additional';

  return [
    ...Array.from({ length: interestGroupTeams }, (_, index) => ({
      teamId: `ig-team-${index}`,
      teamName: `Group Team ${index + 1}`,
      teamType: teamTypes[index % 2],
      attended: index < interestGroupAttended,
      isTeamInactive:
        hasInactiveTeam && inactiveSection === 'interestGroup' && index === 2,
      isFromInterestGroup: true,
    })),
    ...Array.from({ length: additionalTeams }, (_, index) => ({
      teamId: `additional-team-${index}`,
      teamName: `Additional Team ${index + 1}`,
      teamType: teamTypes[(index + 1) % 2],
      attended: index < additionalTeamsAttended,
      isTeamInactive:
        hasInactiveTeam && inactiveSection === 'additional' && index === 2,
    })),
  ];
};

export const countArgTypes = {
  control: { type: 'range', min: 0, max: 20, step: 1 },
} as const;

// Storybook shows the panel on the story that is meant to be driven from it;
// the rest are fixed states.
export const fixedState = {
  parameters: { controls: { disable: true } },
} as const;

const searchResults: AttendanceSearchOption[] = [
  // Never the hosting group: only the hosting group's teams are locked, so a
  // searched group adds ordinary, removable rows.
  {
    value: 'ig-search-a',
    label: 'Lysosomal Biology',
    optionType: 'interestGroup',
    teams: [
      { teamId: 'sga-1', teamName: 'Aguzzi', attended: true },
      { teamId: 'sga-2', teamName: 'Alessi', attended: true },
      { teamId: 'sga-3', teamName: 'Chen', attended: true },
    ],
  },
  {
    value: 'ig-search-b',
    label: 'Mitochondria',
    optionType: 'interestGroup',
    teams: [
      { teamId: 'sgb-1', teamName: 'Dawson', attended: true },
      { teamId: 'sgb-2', teamName: 'Edwards', attended: true },
    ],
  },
  {
    value: 's1',
    label: 'Ferguson',
    optionType: 'team',
    teamType: 'Discovery Team',
  },
  {
    value: 's2',
    label: 'Herzog',
    optionType: 'team',
    teamType: 'Resource Team',
  },
  {
    value: 's3',
    label: 'Lippincott-Schwartz',
    optionType: 'team',
    teamType: 'Discovery Team',
  },
];

export const loadAttendanceSearchOptions = async (inputValue: string) =>
  searchResults.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );
