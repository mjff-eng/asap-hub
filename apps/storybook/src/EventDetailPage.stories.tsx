import { ComponentProps } from 'react';
import { EventResponse } from '@asap-hub/model';
import {
  EventDetailPage,
  eventMapper,
  getIconForDocumentType,
} from '@asap-hub/react-components';
import { createEventResponse } from '@asap-hub/fixtures';
import { addHours, subDays, subHours } from 'date-fns';

import { boolean, number } from './knobs';
import { LayoutDecorator } from './layout';

export default {
  title: 'Templates / Events / Detail Page Redesign',
  component: EventDetailPage,
  decorators: [LayoutDecorator],
};

const pageProps = (
  overrides: Partial<EventResponse> = {},
  fixtureOptions: Parameters<typeof createEventResponse>[0] = {},
): ComponentProps<typeof EventDetailPage> => ({
  ...eventMapper({
    ...createEventResponse(fixtureOptions),
    tags: [
      { id: 't1', name: 'Neurological Diseases' },
      { id: 't2', name: 'Clinical Neurology' },
      { id: 't3', name: 'Adult Neurology' },
      { id: 't4', name: 'Neuroimaging' },
    ],
    ...overrides,
  }),
  hasFinished: false,
  backHref: '#',
  displayCalendar: true,
  getIconForDocumentType: () => getIconForDocumentType('Article'),
  aboutHref: '/events/1/about',
  meetingMaterialsHref: '/events/1/meeting-materials',
  selectedTab: 'about',
});

export const Normal = () => {
  const isEventInThePast = boolean('Has the event passed', false);
  return (
    <EventDetailPage
      {...pageProps(
        {},
        {
          numberOfSpeakers: number('Number of speakers', 4),
          numberOfUnknownSpeakers: number('Number of unknown speakers', 2),
          numberOfExternalSpeakers: number('Number of external speakers', 0),
          isEventInThePast,
        },
      )}
      hasFinished={isEventInThePast}
      hideMeetingLink={boolean('Hide Meeting Link', false)}
      displayCalendar={boolean('display calendar', true)}
    />
  );
};

export const Live = () => (
  <EventDetailPage
    {...pageProps({
      meetingLink: 'https://example.com',
      startDate: subHours(new Date(), 1).toISOString(),
      endDate: addHours(new Date(), 1).toISOString(),
    })}
  />
);

export const Cancelled = () => (
  <EventDetailPage {...pageProps({ status: 'Cancelled' })} />
);

export const PastWithMaterials = () => (
  <EventDetailPage
    {...pageProps(
      {
        startDate: subDays(new Date(), 2).toISOString(),
        endDate: subDays(new Date(), 1).toISOString(),
        notes: '<p>Meeting notes</p>',
        videoRecording: '<p>Video recording</p>',
        presentation: '<p>Presentation</p>',
        meetingMaterials: [
          { title: 'Agenda', url: 'https://example.com' },
          { title: 'Slides', url: 'https://example.com' },
        ],
      },
      { isEventInThePast: true },
    )}
    hasFinished
    selectedTab="meeting-materials"
  />
);
