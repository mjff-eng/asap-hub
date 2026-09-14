import { EditEventAttendanceModal } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

import {
  AttendanceCounts,
  buildAttendanceTeams,
  countArgTypes,
  fixedState,
  loadAttendanceSearchOptions,
} from './attendance-fixtures';

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const buildSourceLists = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `file-${index}`,
    filename: `attendees-day-${index + 1}.csv`,
    addedDate: `1${index}/03/2025`,
    // Round-trip so the Download spinner is visible.
    onDownload: () => delay(1000),
  }));

type ControlArgs = AttendanceCounts & {
  interestGroupName: string;
  canUpload: boolean;
  sourceLists: number;
};

const meta: Meta<ControlArgs> = {
  title: 'Organisms / Events / Edit Attendance Modal',
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
  argTypes: {
    interestGroupName: {
      control: 'text',
      description:
        'Names the locked section ("From <name> (#)"). Cleared, it falls back to "From interest group (#)".',
    },
    interestGroupTeams: {
      ...countArgTypes,
      description:
        'Teams from the hosting group — locked rows with a padlock instead of a bin. At 0 the whole section goes.',
    },
    interestGroupAttended: {
      ...countArgTypes,
      description: 'How many of the locked rows start with the toggle on.',
    },
    additionalTeams: {
      ...countArgTypes,
      description: 'Removable rows under "Additional teams".',
    },
    additionalTeamsAttended: {
      ...countArgTypes,
      description: 'How many of those start with the toggle on.',
    },
    hasInactiveTeam: {
      control: 'boolean',
      description: 'Mark the third row inactive (shows the inactive badge)',
    },
    canUpload: {
      control: 'boolean',
      description: 'Show the "Upload a List" section',
    },
    sourceLists: {
      control: { type: 'range', min: 0, max: 3, step: 1 },
      description: 'Files already recorded under "Source lists"',
    },
  },
  render: ({ interestGroupName, canUpload, sourceLists, ...counts }) => (
    <EditEventAttendanceModal
      // The modal snapshots its rows on mount, so it remounts when a count
      // control moves.
      key={`${JSON.stringify(counts)}-${interestGroupName}`}
      teams={buildAttendanceTeams(counts)}
      interestGroupName={interestGroupName || undefined}
      loadSearchOptions={loadAttendanceSearchOptions}
      sourceLists={buildSourceLists(sourceLists)}
      onUploadList={
        canUpload ? async () => ({ matched: [], unmatched: [] }) : undefined
      }
      onSave={() => undefined}
      onDismiss={() => undefined}
    />
  ),
};

export default meta;

type Story = StoryObj<ControlArgs>;

const baseArgs: ControlArgs = {
  interestGroupName: 'Alpha Synuclein',
  interestGroupTeams: 4,
  interestGroupAttended: 3,
  additionalTeams: 2,
  additionalTeamsAttended: 1,
  hasInactiveTeam: false,
  canUpload: true,
  sourceLists: 0,
};

export const EditAttendance: Story = {
  args: baseArgs,
};

export const AddAttendance: Story = {
  args: {
    ...baseArgs,
    interestGroupTeams: 0,
    interestGroupAttended: 0,
    additionalTeams: 0,
    additionalTeamsAttended: 0,
  },
  ...fixedState,
};

export const NoAdditionalTeams: Story = {
  args: { ...baseArgs, additionalTeams: 0, additionalTeamsAttended: 0 },
  ...fixedState,
};

export const AdditionalTeamsOnly: Story = {
  args: {
    ...baseArgs,
    interestGroupTeams: 0,
    interestGroupAttended: 0,
    additionalTeams: 5,
    additionalTeamsAttended: 2,
  },
  ...fixedState,
};

export const AllAttended: Story = {
  args: { ...baseArgs, interestGroupAttended: 4, additionalTeamsAttended: 2 },
  ...fixedState,
};

export const NoneAttended: Story = {
  args: { ...baseArgs, interestGroupAttended: 0, additionalTeamsAttended: 0 },
  ...fixedState,
};

export const ManyTeams: Story = {
  args: {
    ...baseArgs,
    interestGroupTeams: 12,
    interestGroupAttended: 7,
    additionalTeams: 8,
    additionalTeamsAttended: 3,
  },
  ...fixedState,
};

export const WithInactiveTeam: Story = {
  args: { ...baseArgs, hasInactiveTeam: true },
  ...fixedState,
};

export const PostUpload: Story = {
  args: { ...baseArgs, sourceLists: 2 },
  ...fixedState,
};

export const WithoutUpload: Story = {
  args: { ...baseArgs, canUpload: false },
  ...fixedState,
};
