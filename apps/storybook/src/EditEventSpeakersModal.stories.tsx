import { EditEventSpeakersModal } from '@asap-hub/react-components';
import type {
  SpeakerGroup,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerSearchOption,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof EditEventSpeakersModal> = {
  title: 'Organisms / Events / Edit Speakers Modal',
  component: EditEventSpeakersModal,
};

type Story = StoryObj<typeof EditEventSpeakersModal>;

const singleAffiliationUser: SpeakerSearchOption = {
  value: 'user-jordan',
  label: 'Jordan Lee',
  user: {
    userId: 'user-jordan',
    displayName: 'Jordan Lee',
    affiliationOptions: [
      { variant: 'team', id: 'team-3', name: 'Chen', role: 'Data Manager' },
    ],
  },
};

const multipleAffiliationsUser: SpeakerSearchOption = {
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
        teamType: 'Discovery Team',
        role: 'Project Manager',
      },
      {
        variant: 'project',
        id: 'project-1',
        name: 'Alpha-synuclein imaging',
        projectType: 'Trainee Project',
        role: 'Trainee',
      },
    ],
  },
};

// A CRN user who belongs to no team or project: cannot present at all.
const noAffiliationUser: SpeakerSearchOption = {
  value: 'user-robin',
  label: 'Robin Shah',
  user: {
    userId: 'user-robin',
    displayName: 'Robin Shah',
    affiliationOptions: [],
  },
};

// No `user`, so the search matched nobody in CRN: the external-guest card.
const nonCrnGuest: SpeakerSearchOption = {
  value: 'guest-sam',
  label: 'Sam Rivera',
};

// Search returns a user with a single affiliation (added straight in, with the
// success toast), a user with two (the "pick an affiliation" pending card), a
// CRN user with none (blocked), and a name that is not in CRN at all (the
// external-guest card). Type any letter to see them.
const loadSearchOptions = async (inputValue: string) =>
  [
    singleAffiliationUser,
    multipleAffiliationsUser,
    noAffiliationUser,
    nonCrnGuest,
  ].filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

// The banner stories drive the real modal: the search ignores what is typed and
// always returns the one user that routes to the banner under test, so any
// keystroke plus a click on the single result opens it.
const loadOnly = (option: SpeakerSearchOption) => async () => [option];

const buildUsers = (
  prefix: string,
  numberOfUsers: number,
  sharingFindings: number,
): SpeakerGroupUser[] =>
  Array.from({ length: numberOfUsers }, (_, index) => ({
    id: `${prefix}-user-${index}`,
    displayName: `John Doe ${index + 1}`,
    roles: ['Lead PI'],
    preliminaryFindingsShared: index < sharingFindings,
  }));

const buildTeams = (numberOfTeams: number, speakersPerGroup: number) =>
  Array.from(
    { length: numberOfTeams },
    (_, index): SpeakerTeamGroup => ({
      id: `team-${index}`,
      variant: 'team',
      teamName: `Team ${index + 1}`,
      teamType: 'Discovery Team',
      users: buildUsers(`team-${index}`, speakersPerGroup, 1),
    }),
  );

const buildProjects = (numberOfProjects: number, speakersPerGroup: number) =>
  Array.from(
    { length: numberOfProjects },
    (_, index): SpeakerProjectGroup => ({
      id: `project-${index}`,
      variant: 'project',
      projectName: `Project ${index + 1}`,
      projectType: 'Trainee Project',
      users: buildUsers(`project-${index}`, speakersPerGroup, 0),
    }),
  );

const teamGroup: SpeakerTeamGroup = {
  id: 'team-1',
  variant: 'team',
  teamName: 'Aguzzi',
  teamType: 'Discovery Team',
  isTeamInactive: true,
  users: [
    {
      id: 'user-1',
      displayName: 'Jane Doe',
      roles: ['Lead PI'],
      isAlumni: true,
      preliminaryFindingsShared: true,
    },
    {
      id: 'user-2',
      displayName: 'John Smith',
      roles: ['Data Manager'],
      preliminaryFindingsShared: false,
    },
  ],
};

const projectGroup: SpeakerProjectGroup = {
  id: 'project-1',
  variant: 'project',
  projectName: 'Alpha-synuclein imaging',
  projectType: 'Trainee Project',
  users: [
    {
      id: 'user-3',
      displayName: 'Priya Patel',
      roles: ['Project Manager', 'Data Manager'],
      preliminaryFindingsShared: true,
    },
  ],
};

const externalGroup: SpeakerGroup = {
  id: 'external',
  variant: 'external',
  users: [
    {
      id: 'ext-1',
      displayName: 'Sam Rivera',
      preliminaryFindingsShared: false,
    },
  ],
};

const populatedGroups: SpeakerGroup[] = [
  teamGroup,
  projectGroup,
  externalGroup,
];

const baseArgs = {
  groups: populatedGroups,
  isPastEvent: true,
  loadSearchOptions,
  onSave: () => undefined,
  onDismiss: () => undefined,
};

export const AddSpeakers: Story = {
  args: { ...baseArgs, groups: [] },
};

export const EditSpeakers: Story = {
  args: baseArgs,
};

// Upcoming event: no findings toggles, no Preliminary Findings column.
export const UpcomingEvent: Story = {
  args: { ...baseArgs, isPastEvent: false },
};

export const TeamProjectsOnly: Story = {
  args: { ...baseArgs, groups: [teamGroup] },
};

export const IndividualProjectsOnly: Story = {
  args: { ...baseArgs, groups: [projectGroup] },
};

export const ExternalOnly: Story = {
  args: { ...baseArgs, groups: [externalGroup] },
};

// Every section over its five-row cap.
export const SectionOverflow: Story = {
  args: {
    ...baseArgs,
    groups: [
      ...buildTeams(9, 2),
      ...buildProjects(7, 2),
      {
        id: 'external',
        variant: 'external',
        users: Array.from({ length: 8 }, (_, index) => ({
          id: `ext-${index}`,
          displayName: `External user ${index + 1}`,
          preliminaryFindingsShared: index % 3 === 0,
        })),
      },
    ],
  },
};

// Expand a group to reach the five-speaker cap.
export const GroupOverflow: Story = {
  args: { ...baseArgs, groups: [...buildTeams(2, 9), ...buildProjects(1, 7)] },
};

// Pick the single search result to see the "pick an affiliation" pending card.
export const MultipleAffiliationsBanner: Story = {
  args: { ...baseArgs, loadSearchOptions: loadOnly(multipleAffiliationsUser) },
};

// Pick the single search result to see the blocked message: a CRN user who
// belongs to no team or individual project cannot be added as a speaker.
export const BlockedSpeakerMessage: Story = {
  args: { ...baseArgs, loadSearchOptions: loadOnly(noAffiliationUser) },
};

// Pick the single search result to see the external-guest card. Its affiliation
// options are the teams and projects already on the event.
export const ExternalAffiliationBanner: Story = {
  args: { ...baseArgs, loadSearchOptions: loadOnly(nonCrnGuest) },
};

// The single-affiliation user is added straight in, showing the success toast
// with Undo.
export const AddedSpeakerToast: Story = {
  args: { ...baseArgs, loadSearchOptions: loadOnly(singleAffiliationUser) },
};

export default meta;
