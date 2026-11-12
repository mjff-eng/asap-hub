import {
  considerEndedAfter,
  EventDetailPage,
  EventPage,
  NotFoundPage,
  useDateHasPassed,
} from '@asap-hub/react-components';
import { useFlags } from '@asap-hub/react-context';
import { gp2, useRouteParams } from '@asap-hub/routing';
import { Navigate, Route, Routes } from 'react-router';

import {
  EventOwner,
  EventRelatedOutputsCard,
  EventSpeakers,
  EventSpeakersCard,
  getCalendarOwner,
  getIconForDocumentType,
  getSourceIcon,
  ImageBanner,
  isCalendarOwnerActive,
  workingGroupsImage,
} from '@asap-hub/gp2-components';
import { useEventById } from './state';
import Frame from '../Frame';

const Event: React.FC = () => {
  const { eventId } = useRouteParams(gp2.events({}).event);
  const event = useEventById(eventId);
  const { isEnabled } = useFlags();
  const hasFinished = useDateHasPassed(
    considerEndedAfter(event?.endDate || ''),
  );

  if (event) {
    if (isEnabled('NEW_EVENT_PAGE')) {
      const {
        speakers,
        project,
        workingGroup,
        tags,
        relatedOutputs,
        ...eventProps
      } = event;
      const eventRoute = gp2.events({}).event({ eventId });
      const pageProps = {
        ...eventProps,
        tags: tags.map(({ name }) => name),
        hasSpeakersToBeAnnounced:
          speakers.length === 0 || speakers.some(({ speaker }) => !speaker),
        eventOwner: (
          <EventOwner project={project} workingGroup={workingGroup} />
        ),
        alwaysShowDateBlock: true,
        hasFinished,
        displayCalendar: isCalendarOwnerActive({ project, workingGroup }),
        calendarOwner: getCalendarOwner({
          project,
          workingGroup,
          calendar: event.calendar,
        }),
        hideCalendarInstructions: true,
        hideBreadcrumbs: true,
        plainHero: true,
        hideMaterialsToast: true,
        toastAboveBanner: true,
        heroBanner: <ImageBanner image={workingGroupsImage} />,
        eventSpeakers: speakers.length ? (
          <EventSpeakersCard speakers={speakers} />
        ) : undefined,
        relatedResearchCard: (
          <EventRelatedOutputsCard relatedOutputs={relatedOutputs ?? []} />
        ),
        aboutHref: eventRoute.about({}).$,
        meetingMaterialsHref: eventRoute.meetingMaterials({}).$,
      };

      return (
        <Frame title={event.title}>
          <Routes>
            <Route
              index
              element={<Navigate to={eventRoute.about({}).$} replace />}
            />
            <Route
              path={eventRoute.about.template.replace(/^\//, '')}
              element={<EventDetailPage {...pageProps} selectedTab="about" />}
            />
            <Route
              path={eventRoute.meetingMaterials.template.replace(/^\//, '')}
              element={
                <EventDetailPage
                  {...pageProps}
                  selectedTab="meeting-materials"
                />
              }
            />
          </Routes>
        </Frame>
      );
    }

    return (
      <Frame title={event.title}>
        <EventPage
          {...event}
          titleOutputs="Related Outputs"
          descriptionOutput="Find all outputs that contributed to this event."
          tags={event.tags.map((t) => t.name)}
          relatedResearch={event.relatedOutputs}
          relatedTutorials={[]}
          getIconForDocumentType={getIconForDocumentType}
          tableTitles={['Type of Output', 'Output Name', 'Source Type']}
          getSourceIcon={getSourceIcon}
          displayCalendar={true}
          eventOwner={
            <EventOwner
              project={event.project}
              workingGroup={event.workingGroup}
            />
          }
        >
          {event.speakers.length ? (
            <EventSpeakers speakers={event.speakers} />
          ) : undefined}
        </EventPage>
      </Frame>
    );
  }

  return <NotFoundPage />;
};

export default Event;
