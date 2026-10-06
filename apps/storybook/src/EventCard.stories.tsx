import { ComponentProps } from 'react';
import { EventResponse, EventStatus } from '@asap-hub/model';
import { EventCard, eventMapper } from '@asap-hub/react-components';
import { createEventResponse } from '@asap-hub/fixtures';
import { addDays, addHours, subDays, subHours } from 'date-fns';

import { array, boolean, date, select, text } from './knobs';
import { CenterDecorator } from './layout';

export default {
  title: 'Organisms / Events / Card',
  component: EventCard,
  decorators: [CenterDecorator],
};

const teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
const namedTeam = <T extends { id: string; displayName: string }>(
  team: T,
): T => ({
  ...team,
  displayName:
    teamNames[Number(team.id.split('-').pop()) % teamNames.length] ??
    team.displayName,
});

const cardProps = (
  overrides: Partial<EventResponse> = {},
  fixtureOptions: Parameters<typeof createEventResponse>[0] = {},
): ComponentProps<typeof EventCard> => {
  const event = createEventResponse(fixtureOptions);
  return eventMapper({
    ...event,
    speakers: event.speakers.map((speaker) =>
      'team' in speaker && speaker.team
        ? { ...speaker, team: namedTeam(speaker.team) }
        : speaker,
    ),
    tags: [
      { id: 't1', name: 'Neurological Diseases' },
      { id: 't2', name: 'Clinical Neurology' },
      { id: 't3', name: 'Adult Neurology' },
      { id: 't4', name: 'Neuroimaging' },
      { id: 't5', name: 'Neuroprotection' },
      { id: 't6', name: 'Movement Disorders' },
    ],
    ...overrides,
  });
};

const meetingMaterialOptions = ['Yes', 'No', 'Coming Soon'];
const meetingMaterialValue = (option: string) =>
  option === 'Yes' ? 'example' : option === 'No' ? null : undefined;
const props = (): ComponentProps<typeof EventCard> => {
  const meetingMaterials = select(
    'Meeting Materials',
    ['Yes', 'No', 'Coming Soon'],
    'Coming Soon',
    'Meeting Material',
  );

  return {
    ...cardProps(),
    title: text('Event Name', 'Example Event'),
    status: select<EventStatus>(
      'Status',
      ['Cancelled', 'Confirmed', 'Tentative'],
      'Confirmed',
    ),
    tags: array('Expertise and Resources', [
      'Neurological Diseases',
      'Clinical Neurology',
      'Adult Neurology',
      'Neuroimaging',
      'Neurologic Examination',
      'Neuroprotection',
      'Movement Disorders',
      'Neurodegenerative Diseases',
      'Neurological Diseases',
    ]),
    presentation: meetingMaterialValue(
      select(
        'Presentation',
        meetingMaterialOptions,
        'Coming Soon',
        'Meeting Material',
      ),
    ),
    notes: meetingMaterialValue(
      select(
        'Notes',
        meetingMaterialOptions,
        'Coming Soon',
        'Meeting Material',
      ),
    ),
    videoRecording: meetingMaterialValue(
      select(
        'Video Recording',
        meetingMaterialOptions,
        'Coming Soon',
        'Meeting Material',
      ),
    ),
    meetingLink: boolean('has meeting link', true)
      ? 'http://example.com'
      : undefined,
    hideMeetingLink: boolean('hide meeting Link', false),
    recurring: boolean('recurring', false),
    meetingMaterials:
      meetingMaterials === 'Yes'
        ? [{ title: 'example', url: 'http://example.com' }]
        : meetingMaterials === 'Coming Soon'
          ? []
          : null,

    startDate: new Date(
      date('Start Date', addHours(new Date(), 23)),
    ).toISOString(),
    endDate: new Date(date('End Date', addHours(new Date(), 24))).toISOString(),
    hasSpeakersToBeAnnounced: boolean('has speakers to be announced', false),
  };
};

const upcoming = {
  startDate: addDays(new Date(), 7).toISOString(),
  endDate: addHours(addDays(new Date(), 7), 1).toISOString(),
};
const happeningNow = {
  startDate: subHours(new Date(), 1).toISOString(),
  endDate: addHours(new Date(), 1).toISOString(),
};
const past = {
  startDate: subDays(new Date(), 7).toISOString(),
  endDate: addHours(subDays(new Date(), 7), 1).toISOString(),
};

export const Normal = () => <EventCard {...props()} />;
export const LiveWithMeetingLink = () => (
  <EventCard
    {...cardProps({ ...happeningNow, meetingLink: 'http://example.com' })}
  />
);
export const LiveInPerson = () => (
  <EventCard {...cardProps({ ...happeningNow, meetingLink: undefined })} />
);
export const Cancelled = () => (
  <EventCard {...cardProps({ ...upcoming, status: 'Cancelled' })} />
);
export const SpeakersToBeAnnounced = () => (
  <EventCard
    {...cardProps(upcoming, {
      numberOfSpeakers: 2,
      numberOfUnknownSpeakers: 3,
    })}
  />
);
export const Recurring = () => (
  <EventCard {...cardProps({ ...upcoming, recurring: true })} />
);
export const WithInactiveTeams = () => (
  <EventCard
    {...cardProps({
      ...upcoming,
      speakers: [
        {
          team: {
            id: 'team-1',
            displayName: 'Alessi',
            inactiveSince: subDays(new Date(), 30).toISOString(),
          },
          user: {
            id: 'user-1',
            displayName: 'John Doe',
          },
          role: 'Genetics',
        },
        {
          team: { id: 'team-2', displayName: 'Barres' },
          user: {
            id: 'user-2',
            displayName: 'Jane Doe',
          },
          role: 'Genetics',
        },
      ],
    })}
  />
);
export const PastWithMaterials = () => (
  <EventCard {...cardProps(past, { meetingMaterials: 3 })} />
);
export const PastWithSomeMaterials = () => (
  <EventCard
    {...cardProps({
      ...past,
      notes: undefined,
      videoRecording: 'recording',
      presentation: 'presentation',
      meetingMaterials: [],
    })}
  />
);
export const PastWithoutMaterials = () => (
  <EventCard
    {...cardProps({
      ...past,
      notes: null,
      videoRecording: null,
      presentation: null,
      meetingMaterials: null,
    })}
  />
);
