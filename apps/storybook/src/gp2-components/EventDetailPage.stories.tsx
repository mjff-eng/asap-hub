import {
  EventOwner,
  EventRelatedOutputsCard,
  EventSpeakersCard,
  getCalendarOwner,
  ImageBanner,
  isCalendarOwnerActive,
  Layout,
  eventDetailBannerImage,
} from '@asap-hub/gp2-components';
import { gp2 as gp2Fixtures } from '@asap-hub/fixtures';
import { gp2 as gp2Model } from '@asap-hub/model';
import { EventDetailPage } from '@asap-hub/react-components';
import { addHours, subDays, subHours } from 'date-fns';
import { ComponentProps } from 'react';
import { StaticRouter } from 'react-router';

import { NoPaddingDecorator } from '../layout';

export default {
  title: 'GP2 / Templates / Events / Detail Page',
  component: EventDetailPage,
  decorators: [NoPaddingDecorator],
};

const layoutProps: Omit<ComponentProps<typeof Layout>, 'children'> = {
  projects: [],
  userId: '1',
  workingGroups: [],
};

const filledRelatedOutputs: gp2Model.RelatedOutputs[] = [
  {
    id: 'output-1',
    title: 'LRRK2 kinase activity in patient-derived cells',
    documentType: 'Article',
    type: 'Research',
    entity: { id: 'wg-1', title: 'Steering Committee', type: 'WorkingGroups' },
  },
  {
    id: 'output-2',
    title: 'Low-abundance sample protocol',
    documentType: 'Procedural Form',
    entity: { id: 'project-1', title: 'LRRK2 Project', type: 'Projects' },
  },
  {
    id: 'output-3',
    title: 'Kinase assay dataset',
    documentType: 'Dataset',
  },
];

const filledDescription =
  '<p>This session brings together members of the working group to share recent progress on LRRK2 biology and its role in Parkinson’s disease. Two speakers from GP2 projects will present unpublished work, followed by an open discussion where attendees can raise questions, compare approaches and identify opportunities to collaborate.</p>';

const filledTags: gp2Model.EventResponse['tags'] = [
  { id: 't1', name: 'Neurological Diseases' },
  { id: 't2', name: 'Clinical Neurology' },
  { id: 't3', name: 'Neuroimaging' },
];

type StoryOptions = {
  readonly event?: Partial<gp2Model.EventResponse>;
  readonly fixture?: Parameters<typeof gp2Fixtures.createEventResponse>[0];
  readonly selectedTab?: ComponentProps<typeof EventDetailPage>['selectedTab'];
};

const aboutHref = '/events/event-0/about';
const meetingMaterialsHref = '/events/event-0/meeting-materials';

// Mirrors the props built in apps/gp2-frontend/src/events/Event.tsx
const renderPage = ({
  event: overrides = {},
  fixture = {},
  selectedTab = 'about',
}: StoryOptions = {}) => {
  const event: gp2Model.EventResponse = {
    ...gp2Fixtures.createEventResponse(fixture),
    workingGroup: { id: 'wg-1', title: 'Steering Committee' },
    ...overrides,
  };
  const {
    speakers,
    project,
    workingGroup,
    tags,
    relatedOutputs,
    ...eventProps
  } = event;
  const hasFinished = new Date(event.endDate) < new Date();

  return (
    <StaticRouter
      location={selectedTab === 'about' ? aboutHref : meetingMaterialsHref}
    >
      <Layout {...layoutProps}>
        <EventDetailPage
          {...eventProps}
          tags={tags.map(({ name }) => name)}
          hasSpeakersToBeAnnounced={
            speakers.length === 0 || speakers.some(({ speaker }) => !speaker)
          }
          eventOwner={
            <EventOwner project={project} workingGroup={workingGroup} />
          }
          alwaysShowDateBlock
          hasFinished={hasFinished}
          displayCalendar={isCalendarOwnerActive({ project, workingGroup })}
          calendarOwner={getCalendarOwner({
            project,
            workingGroup,
            calendar: event.calendar,
          })}
          hideBreadcrumbs
          plainHero
          hideMaterialsToast
          toastAboveBanner
          heroBanner={<ImageBanner image={eventDetailBannerImage} />}
          eventSpeakers={<EventSpeakersCard speakers={speakers} />}
          relatedResearchCard={
            <EventRelatedOutputsCard relatedOutputs={relatedOutputs ?? []} />
          }
          aboutHref={aboutHref}
          meetingMaterialsHref={meetingMaterialsHref}
          selectedTab={selectedTab}
        />
      </Layout>
    </StaticRouter>
  );
};

const emptyEvent: Partial<gp2Model.EventResponse> = {
  description: '',
  tags: [],
  relatedOutputs: [],
};
const emptySpeakers = {
  numberOfInternalSpeakers: 0,
  numberOfExternalSpeakers: 0,
  numberOfSpeakersToBeAnnounced: 0,
};

export const AllFilled = () =>
  renderPage({
    event: {
      description: filledDescription,
      tags: filledTags,
      relatedOutputs: filledRelatedOutputs,
    },
    fixture: {
      numberOfInternalSpeakers: 2,
      numberOfExternalSpeakers: 1,
      numberOfSpeakersToBeAnnounced: 1,
    },
  });

export const AllEmpty = () =>
  renderPage({ event: emptyEvent, fixture: emptySpeakers });

export const DescriptionOnly = () =>
  renderPage({
    event: { ...emptyEvent, description: filledDescription },
    fixture: emptySpeakers,
  });

export const TagsWithoutDescription = () =>
  renderPage({
    event: { ...emptyEvent, tags: filledTags },
    fixture: emptySpeakers,
  });

export const SpeakersToBeAnnounced = () =>
  renderPage({
    event: { description: filledDescription, tags: filledTags },
    fixture: {
      numberOfInternalSpeakers: 0,
      numberOfExternalSpeakers: 0,
      numberOfSpeakersToBeAnnounced: 2,
    },
  });

export const Live = () =>
  renderPage({
    event: {
      description: filledDescription,
      tags: filledTags,
      relatedOutputs: filledRelatedOutputs,
      startDate: subHours(new Date(), 1).toISOString(),
      endDate: addHours(new Date(), 1).toISOString(),
    },
  });

export const Cancelled = () =>
  renderPage({
    event: {
      description: filledDescription,
      tags: filledTags,
      status: 'Cancelled',
    },
  });

const pastDates: Partial<gp2Model.EventResponse> = {
  startDate: subDays(new Date(), 2).toISOString(),
  endDate: subDays(new Date(), 1).toISOString(),
};

export const PastAllFilled = () =>
  renderPage({
    event: {
      ...pastDates,
      description: filledDescription,
      tags: filledTags,
      relatedOutputs: filledRelatedOutputs,
    },
    fixture: { isEventInThePast: true },
  });

export const PastAllEmpty = () =>
  renderPage({
    event: { ...pastDates, ...emptyEvent },
    fixture: { ...emptySpeakers, isEventInThePast: true },
  });

export const PastMeetingMaterialsFilled = () =>
  renderPage({
    event: pastDates,
    fixture: { isEventInThePast: true, meetingMaterials: 2 },
    selectedTab: 'meeting-materials',
  });

export const PastMeetingMaterialsEmpty = () =>
  renderPage({
    event: {
      ...pastDates,
      notes: undefined,
      videoRecording: undefined,
      presentation: undefined,
      meetingMaterials: [],
    },
    fixture: { isEventInThePast: true, meetingMaterials: 0 },
    selectedTab: 'meeting-materials',
  });
