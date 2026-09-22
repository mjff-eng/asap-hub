import { SpeakerToast } from '@asap-hub/react-components';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof SpeakerToast> = {
  title: 'Molecules / Events / Speaker Toast',
  component: SpeakerToast,
  // The toast stretches to its container, so the frame stands in for the
  // modal's 712px content column.
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 712 }}>
        <Story />
      </div>
    ),
  ],
};

type Story = StoryObj<typeof SpeakerToast>;

export const Added: Story = {
  args: {
    message: 'Added Jordan Lee to Aguzzi',
    onUndo: () => {},
    onDismiss: () => {},
  },
};

// Narrow the viewport: the message wraps, and the icon has to stay on its
// first line while Undo and the close button drop to a row of their own.
export const AddedWithAWrappingMessage: Story = {
  args: {
    message: 'Added Natália Rodrigues to Alpha-synuclein imaging',
    onUndo: () => {},
    onDismiss: () => {},
  },
};

// The error accent has no Undo, so it keeps one row at every width.
export const BlockedSpeaker: Story = {
  args: {
    accent: 'error',
    message:
      'This speaker is not a member on any CRN team or individual project. They cannot be added as a speaker until they belong to one.',
    onDismiss: () => {},
  },
};

// Both actions are disabled while the modal confirms a cancel.
export const Disabled: Story = {
  args: {
    message: 'Added Jordan Lee to Aguzzi',
    onUndo: () => {},
    onDismiss: () => {},
    enabled: false,
  },
};

export default meta;
