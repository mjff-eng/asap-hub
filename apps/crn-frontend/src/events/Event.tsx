import {
  EditEventAttendanceModal,
  EditEventSpeakersModal,
  EventAttendance,
  EventAttendanceTeam,
  EventConversation,
  EventDetailPage,
  eventMapper,
  getCalendarOwner,
  EventOwner,
  EventPage,
  EventSpeakers,
  getIconForDocumentType,
  NotFoundPage,
  resolveEventThumbnail,
  SpeakerList,
  useDateHasPassed,
  considerEndedAfter,
  PageConstraints,
} from '@asap-hub/react-components';
import { useCurrentUserCRN, useFlags } from '@asap-hub/react-context';
import { events, useRouteParams } from '@asap-hub/routing';
import { Frame, useBackHref } from '@asap-hub/frontend-utils';
import { EventUpdateDetailsRequest } from '@asap-hub/model';
import { isEventProjectManager } from '@asap-hub/validation';
import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { toAttendanceRows } from './attendance-rows';
import {
  downloadAttendeesFile,
  downloadEventAttendance,
  downloadEventSpeakers,
} from './export';
import { mapGroupsToSpeakersUpdate } from './map-groups-to-speakers-update';
import { matchTeamNames } from './match-team-names';
import { parseTeamRows } from './parse-team-list';
import {
  useEventAttendanceSearch,
  useEventById,
  useEventSpeakerGroups,
  useEventSpeakerSearch,
  usePatchEvent,
  useQuietRefreshEventById,
  useTeamsForMatching,
  useUploadAttendeesFiles,
} from './state';

const Event: React.FC = () => {
  const { eventId } = useRouteParams(events({}).event);
  const event = useEventById(eventId);
  const speakerGroups = useEventSpeakerGroups(eventId);
  const refreshEvent = useQuietRefreshEventById(eventId);
  const backHref = useBackHref() ?? events({}).$;
  const { isEnabled } = useFlags();
  const user = useCurrentUserCRN();
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [isEditingSpeakers, setIsEditingSpeakers] = useState(false);
  const patchEvent = usePatchEvent(eventId);
  const fetchTeamsForMatching = useTeamsForMatching();
  const searchAttendance = useEventAttendanceSearch();
  const uploadAttendeesFiles = useUploadAttendeesFiles(eventId);
  const { loadSearchOptions, loadAffiliationOptions } = useEventSpeakerSearch();

  const hasFinished = useDateHasPassed(
    considerEndedAfter(event?.endDate || ''),
  );

  if (event) {
    const displayCalendar =
      event.interestGroup === undefined || event.interestGroup.active;

    const teams = toAttendanceRows(event.attendance);
    const isTechSupport = !!user?.techSupport;
    const isProjectManager = isEventProjectManager(user, event);
    const attendeesFiles = event.attendeesFiles ?? [];
    const openAttendanceEditor = () => setIsEditingAttendance(true);
    const openSpeakersEditor = () => setIsEditingSpeakers(true);
    const attendance = hasFinished ? (
      <>
        <EventAttendance
          teams={teams}
          interestGroupName={event.interestGroup?.name}
          onExport={
            isTechSupport
              ? () => downloadEventAttendance(event, teams)
              : undefined
          }
          onEdit={isTechSupport ? openAttendanceEditor : undefined}
        />
        {isEditingAttendance && (
          <EditEventAttendanceModal
            teams={teams}
            interestGroupName={event.interestGroup?.name}
            sourceLists={attendeesFiles}
            onDownloadSourceList={downloadAttendeesFile}
            loadSearchOptions={(search) =>
              searchAttendance(search, event.endDate, event.interestGroup?.id)
            }
            onUploadList={async (file: File) => {
              const [rows, corpus] = await Promise.all([
                parseTeamRows(file),
                fetchTeamsForMatching(),
              ]);
              return matchTeamNames(rows, corpus);
            }}
            onSave={async (
              updatedTeams: EventAttendanceTeam[],
              newFiles: File[],
            ) => {
              const updates: EventUpdateDetailsRequest = {
                attendance: updatedTeams.map((team) => ({
                  id: team.attendanceId,
                  teamId: team.teamId,
                  attended: team.attended,
                })),
              };

              const newFileIds = await uploadAttendeesFiles(newFiles);
              if (newFileIds.length) {
                updates.attendeesFileIds = [
                  ...attendeesFiles.map((file) => file.id),
                  ...newFileIds,
                ];
              }
              await patchEvent(updates);
              setIsEditingAttendance(false);
            }}
            onDismiss={() => setIsEditingAttendance(false)}
          />
        )}
      </>
    ) : undefined;

    const speakers = (
      <>
        <EventSpeakers
          groups={speakerGroups}
          hasFinished={hasFinished}
          onExport={
            isTechSupport
              ? () => downloadEventSpeakers(event, speakerGroups, hasFinished)
              : undefined
          }
          onAddSpeaker={isProjectManager ? openSpeakersEditor : undefined}
          onEdit={isProjectManager ? openSpeakersEditor : undefined}
        />
        {isEditingSpeakers && (
          <EditEventSpeakersModal
            groups={speakerGroups}
            isPastEvent={hasFinished}
            loadSearchOptions={loadSearchOptions}
            loadAffiliationOptions={loadAffiliationOptions}
            onSave={async (savedGroups) => {
              await patchEvent(
                mapGroupsToSpeakersUpdate(
                  speakerGroups,
                  savedGroups,
                  hasFinished,
                ),
              );
              setIsEditingSpeakers(false);
            }}
            onDismiss={() => setIsEditingSpeakers(false)}
          />
        )}
      </>
    );

    if (isEnabled('NEW_EVENT_PAGE')) {
      const eventRoute = events({}).event({ eventId });
      const pageProps = {
        ...eventMapper(event),
        hasFinished,
        onRefresh: refreshEvent,
        displayCalendar,
        calendarOwner: getCalendarOwner(event),
        eventConversation: <EventConversation {...event} />,
        eventAttendance: attendance,
        eventSpeakers: speakers,
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
        <PageConstraints>
          <EventPage
            {...event}
            thumbnail={resolveEventThumbnail(event)}
            hasFinished={hasFinished}
            tags={event.tags.map((tag) => tag.name)}
            backHref={backHref}
            onRefresh={refreshEvent}
            getIconForDocumentType={getIconForDocumentType}
            displayCalendar={displayCalendar}
            eventConversation={<EventConversation {...event} />}
            eventOwner={
              <EventOwner
                interestGroup={event.interestGroup}
                workingGroup={event.workingGroup}
              />
            }
          >
            {!!event.speakers.length && <SpeakerList {...event} />}
          </EventPage>
        </PageConstraints>
      </Frame>
    );
  }

  return <NotFoundPage />;
};

export default Event;
