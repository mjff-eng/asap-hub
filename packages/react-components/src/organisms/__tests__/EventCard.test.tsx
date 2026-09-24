import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createEventResponse } from '@asap-hub/fixtures';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import { addMinutes, subDays, subMinutes, addDays } from 'date-fns';

import EventCard from '../EventCard';
import { colour } from '../../colors';

const mockIsEnabled = jest.fn();
jest.mock('@asap-hub/react-context', () => ({
  ...jest.requireActual('@asap-hub/react-context'),
  useFlags: () => ({ isEnabled: mockIsEnabled }),
}));

beforeEach(() => {
  mockIsEnabled.mockReturnValue(false);
});

const props: ComponentProps<typeof EventCard> = {
  ...createEventResponse(),
  hasSpeakersToBeAnnounced: false,
  eventOwner: <div>ASAP Team</div>,
  tags: [],
};
it('shows that an event has been cancelled', () => {
  const { getByTitle, getByText, queryByTitle, queryByText, rerender } = render(
    <EventCard {...props} status="Confirmed" />,
  );
  expect(queryByTitle('Warning')).not.toBeInTheDocument();
  expect(queryByText(/cancelled/i)).not.toBeInTheDocument();

  rerender(<EventCard {...props} status="Cancelled" />);
  expect(getByTitle('Warning')).toBeInTheDocument();
  expect(getByText('The event has been cancelled.')).toBeVisible();
});

it('renders the event tags', () => {
  render(<EventCard {...props} tags={['MyTag']} />);
  expect(screen.getByText('MyTag')).toBeVisible();
});

it('shows the recurring badge for recurring events only', () => {
  const { rerender } = render(<EventCard {...props} recurring />);
  expect(screen.getByText('Recurring')).toBeVisible();

  rerender(<EventCard {...props} recurring={false} />);
  expect(screen.queryByText('Recurring')).not.toBeInTheDocument();
});

describe('current events', () => {
  it('does not show attachments while event is occurring', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingLink={undefined}
        presentation="123"
        startDate={subMinutes(new Date(), 1).toISOString()}
        endDate={addMinutes(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByText(/currently happening/i)).toBeVisible();
    expect(screen.queryByTitle(/paper/i)).not.toBeInTheDocument();
  });

  it('shows cancelled while event is occurring', () => {
    render(
      <EventCard
        {...props}
        status="Cancelled"
        startDate={subMinutes(new Date(), 1).toISOString()}
        endDate={addMinutes(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByTitle('Warning')).toBeInTheDocument();
    expect(screen.getByText(/cancelled/i)).toBeVisible();
  });
  it('toasts for meetings without meeting link', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingLink={undefined}
        startDate={subMinutes(new Date(), 1).toISOString()}
        endDate={addMinutes(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByText(/currently happening/i)).toBeVisible();
    expect(screen.queryByText('Join Meeting Now')).not.toBeInTheDocument();
  });
  it('toasts for meetings with meeting link', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingLink="http://example.com"
        startDate={subMinutes(new Date(), 1).toISOString()}
        endDate={addMinutes(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByText('This event is happening now.')).toBeVisible();
    expect(screen.getByText('Join Meeting Now').closest('a')).toHaveAttribute(
      'href',
      'http://example.com',
    );
  });

  it('hides the meeting link when hideMeetingLink is set to true', () => {
    render(
      <EventCard
        {...props}
        meetingLink="http://example.com"
        hideMeetingLink={true}
      />,
    );

    expect(screen.queryByText(/join/i)).toBeNull();
  });
  it('toasts for meetings with speakers to be announced', () => {
    render(
      <EventCard
        {...props}
        hasSpeakersToBeAnnounced
        startDate={addMinutes(new Date(), 30).toISOString()}
      />,
    );

    expect(
      screen.queryByText(/more speakers to be announced/i),
    ).toBeInTheDocument();
  });
});

describe('past events', () => {
  it('shows cancelled over materials', () => {
    render(
      <EventCard
        {...props}
        status="Cancelled"
        presentation="132"
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByTitle(/warning/i)).toBeInTheDocument();
    expect(screen.getByText(/cancelled/i)).toBeVisible();
  });

  it('greys out the card of a past cancelled event', () => {
    const { unmount } = render(
      <EventCard
        {...props}
        status="Cancelled"
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(
      findParentWithStyle(screen.getByRole('heading'), 'borderStyle')?.element,
    ).toHaveStyleRule('background-color', colour.background.secondary);
    unmount();

    render(
      <EventCard
        {...props}
        status="Cancelled"
        startDate={addDays(new Date(), 1).toISOString()}
        endDate={addDays(new Date(), 2).toISOString()}
      />,
    );
    expect(
      findParentWithStyle(screen.getByRole('heading'), 'borderStyle')?.element,
    ).not.toHaveStyleRule('background-color', colour.background.secondary);
  });
  it('lists every material greyed out and non-clickable while they are still pending', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingLink="http://example.com"
        meetingMaterials={[]}
        presentation={undefined}
        notes={undefined}
        videoRecording={undefined}
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByTitle(/paper/i)).toBeInTheDocument();
    ['Notes', 'Recording', 'Presentation'].forEach((label) => {
      expect(screen.getByText(label)).toBeVisible();
      expect(screen.getByText(label).closest('a')).toBeNull();
    });
  });
  it('toasts the names of the available materials', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingLink="http://example.com"
        meetingMaterials={[
          { title: '123', url: 'http://example.com' },
          { title: '345', url: 'http://example.com' },
        ]}
        presentation={'presentation'}
        notes={undefined}
        videoRecording={undefined}
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByText('Presentation').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0#event-presentation',
    );
    expect(screen.queryByText('Meeting Materials')).not.toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeVisible();
    expect(screen.getByText('Notes').closest('a')).toBeNull();
    expect(screen.getByText('Recording').closest('a')).toBeNull();
    expect(screen.getByTitle(/paper/i)).toBeInTheDocument();
  });

  it('links every material name when every material is available', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingMaterials={[{ title: '123', url: 'http://example.com' }]}
        presentation="presentation"
        notes="notes"
        videoRecording="recording"
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByText('Notes').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0#event-notes',
    );
    expect(screen.getByText('Recording').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0#event-video-recording',
    );
    expect(screen.getByText('Presentation').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0#event-presentation',
    );
    expect(screen.queryByText('Meeting Materials')).not.toBeInTheDocument();
  });

  it('links materials to the meeting materials tab when NEW_EVENT_PAGE is enabled', () => {
    mockIsEnabled.mockReturnValue(true);
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingMaterials={[{ title: '123', url: 'http://example.com' }]}
        presentation="presentation"
        notes="notes"
        videoRecording="recording"
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByText('Notes').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0/meeting-materials#event-notes',
    );
    expect(screen.getByText('Recording').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0/meeting-materials#event-video-recording',
    );
    expect(screen.getByText('Presentation').closest('a')).toHaveAttribute(
      'href',
      '/events/event-0/meeting-materials#event-presentation',
    );
  });

  it('lists every material greyed out and non-clickable when none are available', () => {
    render(
      <EventCard
        {...props}
        status="Confirmed"
        meetingLink="http://example.com"
        meetingMaterials={null}
        presentation={null}
        notes={null}
        videoRecording={null}
        startDate={subDays(new Date(), 2).toISOString()}
        endDate={subDays(new Date(), 1).toISOString()}
      />,
    );
    expect(screen.getByTitle(/paper/i)).toBeInTheDocument();
    ['Notes', 'Recording', 'Presentation'].forEach((label) => {
      expect(screen.getByText(label)).toBeVisible();
      expect(screen.getByText(label).closest('a')).toBeNull();
    });
  });

  it("doesn't display toast if none of the conditions are match", () => {
    render(
      <EventCard
        {...props}
        endDate={addDays(new Date(), 1).toISOString()}
        startDate={addDays(new Date(), 2).toISOString()}
      />,
    );

    expect(screen.queryByText(/to be announced/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cancelled/)).not.toBeInTheDocument();
    expect(screen.queryByText(/happening now/)).not.toBeInTheDocument();
    expect(screen.queryByText(/currently happening/)).not.toBeInTheDocument();
  });
});
