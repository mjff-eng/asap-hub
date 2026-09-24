import { render, screen } from '@testing-library/react';

import EventMaterialsList from '../EventMaterialsList';

const mockIsEnabled = jest.fn();
jest.mock('@asap-hub/react-context', () => ({
  ...jest.requireActual('@asap-hub/react-context'),
  useFlags: () => ({ isEnabled: mockIsEnabled }),
}));

beforeEach(() => {
  mockIsEnabled.mockReturnValue(false);
});

afterEach(() => {
  jest.clearAllMocks();
});

it('links available materials to their section on the event page', () => {
  render(
    <EventMaterialsList
      id="event-1"
      notes="Notes content"
      videoRecording="Recording url"
      presentation={null}
    />,
  );

  expect(screen.getByText('Recording').closest('a')).toHaveAttribute(
    'href',
    '/events/event-1#event-video-recording',
  );
  expect(screen.getByText('Notes').closest('a')).toHaveAttribute(
    'href',
    '/events/event-1#event-notes',
  );
});

it('links to the meeting materials tab when NEW_EVENT_PAGE is enabled', () => {
  mockIsEnabled.mockReturnValue(true);
  render(
    <EventMaterialsList
      id="event-1"
      notes="Notes content"
      videoRecording="Recording url"
      presentation={null}
    />,
  );

  expect(screen.getByText('Recording').closest('a')).toHaveAttribute(
    'href',
    '/events/event-1/meeting-materials#event-video-recording',
  );
  expect(screen.getByText('Notes').closest('a')).toHaveAttribute(
    'href',
    '/events/event-1/meeting-materials#event-notes',
  );
});

it('renders unavailable materials as plain text without a link', () => {
  render(
    <EventMaterialsList
      id="event-1"
      notes={null}
      videoRecording="Recording url"
      presentation={null}
    />,
  );

  expect(screen.getByText('Notes').closest('a')).not.toBeInTheDocument();
  expect(screen.getByText('Presentation').closest('a')).not.toBeInTheDocument();
});

it('renders materials in Recording, Presentation, Notes order by default', () => {
  render(
    <EventMaterialsList
      id="event-1"
      notes="Notes content"
      videoRecording="Recording url"
      presentation="Presentation url"
    />,
  );

  expect(screen.getByText('Recording').parentElement?.textContent).toBe(
    'Recording•Presentation•Notes',
  );
});

it('renders materials in the order passed via the order prop', () => {
  render(
    <EventMaterialsList
      id="event-1"
      notes="Notes content"
      videoRecording="Recording url"
      presentation="Presentation url"
      order={['notes', 'presentation', 'videoRecording']}
    />,
  );

  expect(screen.getByText('Notes').parentElement?.textContent).toBe(
    'Notes•Presentation•Recording',
  );
});

it('shows the paperclip icon by default', () => {
  render(<EventMaterialsList id="event-1" notes="Notes content" />);
  expect(screen.getByTitle('Paper Clip')).toBeInTheDocument();
});

it('hides the paperclip icon when showIcon is false', () => {
  render(
    <EventMaterialsList id="event-1" notes="Notes content" showIcon={false} />,
  );
  expect(screen.queryByTitle('Paper Clip')).not.toBeInTheDocument();
});

it('still renders all three labels when no materials are available', () => {
  render(<EventMaterialsList id="event-1" />);
  expect(screen.getByText('Recording')).toBeVisible();
  expect(screen.getByText('Presentation')).toBeVisible();
  expect(screen.getByText('Notes')).toBeVisible();
});
