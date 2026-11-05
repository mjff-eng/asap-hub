import { UploadListModal, UploadListResult } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaticRouter } from 'react-router';

const meta: Meta<typeof UploadListModal> = {
  title: 'Organisms / Events / Upload List Modal',
  component: UploadListModal,
  argTypes: {
    onUploadList: { control: false },
    onAddAttendees: { control: false },
    onBack: { control: false },
  },
  decorators: [
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
};

type Story = StoryObj<typeof UploadListModal>;

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const fullResult: UploadListResult = {
  matched: [
    {
      teamId: 'm1',
      teamName: 'Aguzzi',
      attended: true,
      teamType: 'Discovery Team',
    },
    {
      teamId: 'm2',
      teamName: 'Alessi',
      attended: true,
      teamType: 'Resource Team',
    },
    {
      teamId: 'm3',
      teamName: 'Chen',
      attended: true,
      teamType: 'Discovery Team',
    },
  ],
  unmatched: [
    {
      name: 'Imagimg',
      suggestion: {
        teamId: 's1',
        teamName: 'Imaging',
        teamType: 'Discovery Team',
        attended: true,
      },
    },
    { name: 'Data Scince' },
  ],
};

const commonArgs = {
  onUploadList: async () => fullResult,
  onAddAttendees: () => undefined,
  onBack: () => undefined,
};

const seedFile = new File([], 'attendees.csv');

// Starts on the empty step; the parse mock delays ~1s so the Add spinner shows.
export const Default: Story = {
  args: {
    ...commonArgs,
    onUploadList: async () => {
      await delay(1000);
      return fullResult;
    },
  },
};

// Seeds the review step directly, expanded, with no upload needed.
export const AllMatched: Story = {
  args: {
    ...commonArgs,
    initialFile: seedFile,
    initialResult: { ...fullResult, unmatched: [] },
    initialSectionsOpen: true,
  },
};

export const NoMatches: Story = {
  args: {
    ...commonArgs,
    initialFile: seedFile,
    initialResult: {
      matched: [],
      unmatched: fullResult.unmatched,
    },
    initialSectionsOpen: true,
  },
};

export const AttendanceWillChange: Story = {
  args: {
    ...commonArgs,
    currentTeams: [
      { teamId: 'm1', teamName: 'Aguzzi', attended: false },
      { teamId: 'm2', teamName: 'Alessi', attended: false },
    ],
    initialFile: seedFile,
    initialResult: fullResult,
    initialSectionsOpen: true,
  },
};

export const NothingToChange: Story = {
  args: {
    ...commonArgs,
    currentTeams: fullResult.matched,
    initialFile: seedFile,
    initialResult: { ...fullResult, unmatched: [] },
  },
};

export default meta;
