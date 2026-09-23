import { render, screen } from '@testing-library/react';

import EventMaterialsList from '../EventMaterialsList';

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

it('renders unavailable materials as plain, greyed-out text', () => {
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

it('renders materials in Recording, Presentation, Notes order', () => {
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
