import {
  EditEventSpeakersModal,
  EventSpeakers,
} from '@asap-hub/react-components';
import type {
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerSearchOption,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';
import { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StaticRouter } from 'react-router';

import { CenterDecorator } from './layout';

const noop = () => undefined;

const roles = ['Data Manager', 'Multiple roles', 'Lead PI', 'Project Manager'];

const buildUsers = (
  prefix: string,
  numberOfUsers: number,
  sharingFindings: number,
): SpeakerGroupUser[] =>
  Array.from({ length: numberOfUsers }, (_, index) => ({
    id: `${prefix}-user-${index}`,
    displayName: `John Doe ${index + 1}`,
    roles: [roles[index % roles.length] ?? 'Lead PI'],
    isAlumni: index === 1,
    preliminaryFindingsShared: index < sharingFindings,
  }));

const buildTeams = (
  numberOfTeams: number,
  speakersPerGroup: number,
  sharedSpeakersPerGroup: number,
  hasInactiveTeam: boolean,
): SpeakerTeamGroup[] =>
  Array.from({ length: numberOfTeams }, (_, teamIndex) => ({
    id: `team-${teamIndex}`,
    variant: 'team',
    teamName: `Team ${teamIndex + 1}`,
    teamType:
      teamIndex % 2 === 0
        ? ('Discovery Team' as const)
        : ('Resource Team' as const),
    isTeamInactive: hasInactiveTeam && teamIndex === 2,
    users: buildUsers(
      `team-${teamIndex}`,
      speakersPerGroup,
      sharedSpeakersPerGroup,
    ),
  }));

const buildProjects = (
  numberOfProjects: number,
  speakersPerGroup: number,
  sharedSpeakersPerGroup: number,
): SpeakerProjectGroup[] =>
  Array.from({ length: numberOfProjects }, (_, projectIndex) => ({
    id: `project-${projectIndex}`,
    variant: 'project',
    projectName: `Project ${projectIndex + 1}`,
    projectType:
      projectIndex % 2 === 0
        ? ('Discovery Project' as const)
        : ('Trainee Project' as const),
    users: buildUsers(
      `project-${projectIndex}`,
      speakersPerGroup,
      sharedSpeakersPerGroup,
    ),
  }));

const buildExternalGroup = (
  numberOfExternalUsers: number,
  sharedExternalUsers: number,
): SpeakerGroup[] => {
  if (numberOfExternalUsers === 0) {
    return [];
  }
  const users: SpeakerGroupExternalUser[] = Array.from(
    { length: numberOfExternalUsers },
    (_, index) => ({
      id: `ext-${index}`,
      displayName: `External user ${index + 1}`,
      preliminaryFindingsShared: index < sharedExternalUsers,
    }),
  );
  return [{ id: 'external', variant: 'external', users }];
};

type ControlArgs = {
  numberOfTeams: number;
  numberOfProjects: number;
  speakersPerGroup: number;
  sharedSpeakersPerGroup: number;
  numberOfExternalUsers: number;
  sharedExternalUsers: number;
  isEditor: boolean;
  hasFinished: boolean;
  longTeamNameExample: boolean;
  hasInactiveTeam: boolean;
};

const buildGroups = ({
  numberOfTeams,
  numberOfProjects,
  speakersPerGroup,
  sharedSpeakersPerGroup,
  numberOfExternalUsers,
  sharedExternalUsers,
  longTeamNameExample,
  hasInactiveTeam,
}: ControlArgs): SpeakerGroup[] => {
  const teams = buildTeams(
    numberOfTeams,
    speakersPerGroup,
    sharedSpeakersPerGroup,
    hasInactiveTeam,
  );
  const [firstTeam] = teams;
  if (longTeamNameExample && firstTeam) {
    teams[0] = { ...firstTeam, teamName: 'Sundaravadivelu' };
  }
  return [
    ...teams,
    ...buildProjects(
      numberOfProjects,
      speakersPerGroup,
      sharedSpeakersPerGroup,
    ),
    ...buildExternalGroup(numberOfExternalUsers, sharedExternalUsers),
  ];
};

const meta: Meta<ControlArgs> = {
  title: 'Organisms / Events / Speakers',
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
    CenterDecorator,
  ],
  argTypes: {
    numberOfTeams: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Rows in the "From Team Projects" section (0 hides it)',
    },
    numberOfProjects: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description:
        'Rows in the "From Individual Projects" section (0 hides it)',
    },
    speakersPerGroup: {
      control: { type: 'range', min: 0, max: 12, step: 1 },
      description:
        'Speakers inside each team/project group — above five, an expanded group shows "Show N more speakers in <label>"',
    },
    sharedSpeakersPerGroup: {
      control: { type: 'range', min: 0, max: 12, step: 1 },
      description:
        'How many speakers per group shared preliminary findings — drives the group pill and the circle %. Equal to "speakers per group" for 100%, 0 for 0%.',
    },
    numberOfExternalUsers: {
      control: { type: 'range', min: 0, max: 12, step: 1 },
      description: 'Rows in the "External" section (0 hides it)',
    },
    sharedExternalUsers: {
      control: { type: 'range', min: 0, max: 12, step: 1 },
      description: 'How many external speakers shared preliminary findings',
    },
    isEditor: {
      control: 'boolean',
      description: 'PM/editor — shows Download & Edit actions',
    },
    hasFinished: {
      control: 'boolean',
      description:
        'Whether the event has already taken place — past events add the percentage tile and the Preliminary Findings column',
    },
    longTeamNameExample: {
      control: 'boolean',
      description:
        'Rename the first team to a long single word to demo the horizontal-scroll + "Preliminary Findings" header behaviour',
    },
    hasInactiveTeam: {
      control: 'boolean',
      description: 'Mark the third team as inactive (shows the inactive badge)',
    },
  },
  render: (args) => (
    <EventSpeakers
      groups={buildGroups(args)}
      hasFinished={args.hasFinished}
      onEdit={args.isEditor ? noop : undefined}
      onExport={args.isEditor ? noop : undefined}
      onAddSpeaker={args.isEditor ? noop : undefined}
    />
  ),
};

export default meta;

type Story = StoryObj<ControlArgs>;

export const Playground: Story = {
  args: {
    numberOfTeams: 3,
    numberOfProjects: 2,
    speakersPerGroup: 3,
    sharedSpeakersPerGroup: 2,
    numberOfExternalUsers: 2,
    sharedExternalUsers: 1,
    isEditor: true,
    hasFinished: true,
    longTeamNameExample: false,
    hasInactiveTeam: false,
  },
};

export const NonAdmin: Story = {
  args: { ...Playground.args, isEditor: false },
};

export const Upcoming: Story = {
  args: { ...Playground.args, hasFinished: false },
};

export const TeamProjectsOnly: Story = {
  args: {
    ...Playground.args,
    numberOfProjects: 0,
    numberOfExternalUsers: 0,
    hasInactiveTeam: true,
  },
};

export const IndividualProjectsOnly: Story = {
  args: { ...Playground.args, numberOfTeams: 0, numberOfExternalUsers: 0 },
};

export const ExternalOnly: Story = {
  args: { ...Playground.args, numberOfTeams: 0, numberOfProjects: 0 },
};

// Every section over its five-row cap: each gets its own
// "Show N more teams|projects|speakers".
export const SectionOverflow: Story = {
  args: {
    ...Playground.args,
    numberOfTeams: 14,
    numberOfProjects: 8,
    numberOfExternalUsers: 9,
    sharedExternalUsers: 4,
    longTeamNameExample: true,
  },
};

// Expand any group to reach the five-speaker cap and its
// "Show N more speakers in <label>".
export const GroupOverflow: Story = {
  args: {
    ...Playground.args,
    numberOfTeams: 2,
    numberOfProjects: 1,
    speakersPerGroup: 9,
    sharedSpeakersPerGroup: 4,
  },
};

export const FindingsAllShared: Story = {
  args: {
    ...Playground.args,
    sharedSpeakersPerGroup: 3,
    sharedExternalUsers: 2,
  },
};

export const FindingsNoneShared: Story = {
  args: {
    ...Playground.args,
    sharedSpeakersPerGroup: 0,
    sharedExternalUsers: 0,
  },
};

export const EmptyEditorUpcoming: Story = {
  args: {
    ...Playground.args,
    numberOfTeams: 0,
    numberOfProjects: 0,
    numberOfExternalUsers: 0,
    hasFinished: false,
  },
};

export const EmptyEditorPast: Story = {
  args: { ...EmptyEditorUpcoming.args, hasFinished: true },
};

export const EmptyReadOnly: Story = {
  args: { ...EmptyEditorUpcoming.args, isEditor: false },
};

// End-to-end wiring: the card and the edit modal share one SpeakerGroup[] —
// open the pencil, add/remove speakers or toggle findings, and Save to see the
// card refresh. onSave writes the modal's result straight back, no adapter.
const editAndSaveInitial: SpeakerGroup[] = [
  {
    id: 'team-1',
    variant: 'team',
    teamName: 'Aguzzi',
    teamType: 'Discovery Team',
    users: [
      {
        id: 'user-1',
        displayName: 'Jane Doe',
        roles: ['Lead PI'],
        preliminaryFindingsShared: true,
      },
      {
        id: 'user-2',
        displayName: 'John Smith',
        roles: ['Data Manager'],
        preliminaryFindingsShared: false,
      },
    ],
  },
  {
    id: 'project-1',
    variant: 'project',
    projectName: 'Alpha-synuclein imaging',
    projectType: 'Trainee Project',
    users: [
      {
        id: 'user-3',
        displayName: 'Priya Patel',
        roles: ['Project Manager', 'Data Manager'],
        preliminaryFindingsShared: false,
      },
    ],
  },
  {
    id: 'external',
    variant: 'external',
    users: [
      {
        id: 'ext-1',
        displayName: 'Sam Rivera',
        preliminaryFindingsShared: false,
      },
    ],
  },
];

const editAndSaveSearchResults: SpeakerSearchOption[] = [
  {
    value: 'user-jordan',
    label: 'Jordan Lee',
    user: {
      userId: 'user-jordan',
      displayName: 'Jordan Lee',
      affiliationOptions: [
        { variant: 'team', id: 'team-3', name: 'Chen', role: 'Data Manager' },
      ],
    },
  },
  {
    value: 'user-alex',
    label: 'Alex Kim',
    user: {
      userId: 'user-alex',
      displayName: 'Alex Kim',
      affiliationOptions: [
        {
          variant: 'team',
          id: 'team-1',
          name: 'Aguzzi',
          role: 'Project Manager',
        },
        { variant: 'team', id: 'team-3', name: 'Chen', role: 'Trainee' },
      ],
    },
  },
];

const loadEditAndSaveSearchOptions = async (inputValue: string) =>
  editAndSaveSearchResults.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

export const EditAndSave: Story = {
  render: () => {
    const [groups, setGroups] = useState<SpeakerGroup[]>(editAndSaveInitial);
    const [isEditing, setIsEditing] = useState(false);

    return (
      <>
        <EventSpeakers
          groups={groups}
          hasFinished
          onExport={noop}
          onEdit={() => setIsEditing(true)}
        />
        {isEditing && (
          <EditEventSpeakersModal
            groups={groups}
            isPastEvent
            loadSearchOptions={loadEditAndSaveSearchOptions}
            onSave={(updated) => {
              setGroups(updated);
              setIsEditing(false);
            }}
            onDismiss={() => setIsEditing(false)}
          />
        )}
      </>
    );
  },
};
