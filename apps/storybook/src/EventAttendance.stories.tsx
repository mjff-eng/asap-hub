import {
  EditEventAttendanceModal,
  EventAttendance,
} from '@asap-hub/react-components';
import type { EventAttendanceTeam } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StaticRouter } from 'react-router';

import {
  AttendanceCounts,
  buildAttendanceTeams,
  countArgTypes,
  fixedState,
  loadAttendanceSearchOptions,
} from './attendance-fixtures';
import { CenterDecorator } from './layout';

const noop = () => undefined;

type ControlArgs = AttendanceCounts & {
  interestGroupName: string;
  isEditor: boolean;
};

const meta: Meta<ControlArgs> = {
  title: 'Organisms / Events / Attendance',
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
    CenterDecorator,
  ],
  argTypes: {
    interestGroupName: {
      control: 'text',
      description:
        'Names the locked section ("From <name>"). Cleared, it falls back to "From interest group".',
    },
    interestGroupTeams: {
      ...countArgTypes,
      description:
        'Teams the hosting interest group contributes. At 0 the metric tile and the whole section disappear.',
    },
    interestGroupAttended: {
      ...countArgTypes,
      description:
        'How many of those attended — this alone drives the progress bar.',
    },
    additionalTeams: {
      ...countArgTypes,
      description:
        'Teams added by hand or uploaded. They never move the metric tile.',
    },
    additionalTeamsAttended: {
      ...countArgTypes,
      description: 'Only changes the "Additional teams" section count.',
    },
    hasInactiveTeam: {
      control: 'boolean',
      description: 'Mark the third row inactive (shows the inactive badge)',
    },
    isEditor: {
      control: 'boolean',
      description: 'Tech Support — shows the Download & Edit actions',
    },
  },
  render: ({ interestGroupName, isEditor, ...counts }) => (
    <EventAttendance
      teams={buildAttendanceTeams(counts)}
      interestGroupName={interestGroupName || undefined}
      onExport={isEditor ? noop : undefined}
      onEdit={isEditor ? noop : undefined}
    />
  ),
};

export default meta;

type Story = StoryObj<ControlArgs>;

const baseArgs: ControlArgs = {
  interestGroupName: 'Alpha Synuclein',
  interestGroupTeams: 5,
  interestGroupAttended: 3,
  additionalTeams: 2,
  additionalTeamsAttended: 1,
  hasInactiveTeam: false,
  isEditor: true,
};

const Editable: React.FC<ControlArgs> = ({
  interestGroupName,
  isEditor,
  ...counts
}) => {
  const [teams, setTeams] = useState<EventAttendanceTeam[]>(() =>
    buildAttendanceTeams(counts),
  );
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <EventAttendance
        teams={teams}
        interestGroupName={interestGroupName || undefined}
        onExport={isEditor ? noop : undefined}
        onEdit={isEditor ? () => setIsEditing(true) : undefined}
      />
      {isEditing && (
        <EditEventAttendanceModal
          teams={teams}
          interestGroupName={interestGroupName || undefined}
          loadSearchOptions={loadAttendanceSearchOptions}
          onUploadList={async () => ({
            matched: [
              {
                teamId: 'uploaded-1',
                teamName: 'Aguzzi',
                attended: true,
                teamType: 'Discovery Team',
              },
            ],
            unmatched: [{ name: 'Data Scince' }],
          })}
          onSave={(updated) => {
            setTeams(updated);
            setIsEditing(false);
          }}
          onDismiss={() => setIsEditing(false)}
        />
      )}
    </>
  );
};

export const EditAndSave: Story = {
  args: baseArgs,
  // The rows are snapshotted on mount, so the story remounts when a control
  // moves; without the key the counts would only apply on first render.
  render: (args) => <Editable key={JSON.stringify(args)} {...args} />,
};

export const ReadOnly: Story = {
  args: { ...baseArgs, isEditor: false },
  ...fixedState,
};

export const FullAttendance: Story = {
  args: {
    ...baseArgs,
    interestGroupAttended: 5,
    additionalTeamsAttended: 2,
  },
  ...fixedState,
};

export const NoAttendance: Story = {
  args: { ...baseArgs, interestGroupAttended: 0, additionalTeamsAttended: 0 },
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
    additionalTeams: 6,
    additionalTeamsAttended: 4,
  },
  ...fixedState,
};

export const UnnamedInterestGroup: Story = {
  args: { ...baseArgs, interestGroupName: '' },
  ...fixedState,
};

export const WithInactiveTeam: Story = {
  args: { ...baseArgs, hasInactiveTeam: true },
  ...fixedState,
};

export const ManyTeams: Story = {
  args: {
    ...baseArgs,
    interestGroupTeams: 12,
    interestGroupAttended: 8,
    additionalTeams: 9,
    additionalTeamsAttended: 5,
  },
  ...fixedState,
};

export const Empty: Story = {
  args: {
    ...baseArgs,
    interestGroupTeams: 0,
    interestGroupAttended: 0,
    additionalTeams: 0,
    additionalTeamsAttended: 0,
  },
  ...fixedState,
};

export const EmptyReadOnly: Story = {
  args: { ...Empty.args, isEditor: false } as ControlArgs,
  ...fixedState,
};
