import {
  EditEventAttendanceModal,
  EditEventSpeakersModal,
  EventAttendance,
  EventAttendanceTeam,
  EventConversation,
  EventDetailPage,
  eventMapper,
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
import { EventResponse } from '@asap-hub/model';
import { events, useRouteParams } from '@asap-hub/routing';
import { Frame, useBackHref } from '@asap-hub/frontend-utils';
import { useState } from 'react';

import { downloadEventSpeakers } from './export';
import { mapGroupsToSpeakersUpdate } from './map-groups-to-speakers-update';
import { matchTeamNames } from './match-team-names';
import { parseTeamRows } from './parse-team-list';
import {
  useEventById,
  useEventSpeakerGroups,
  usePatchEvent,
  useQuietRefreshEventById,
  useTeamsForMatching,
} from './state';

const mapAttendanceTeams = (attendance: EventResponse['attendance'] = []) =>
  attendance.map(({ id, team, attended }) => ({
    attendanceId: id,
    teamId: team.id,
    teamName: team.displayName,
    attended,
    teamType: team.teamType,
    isTeamInactive: !!team.inactiveSince,
  }));

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

  const hasFinished = useDateHasPassed(
    considerEndedAfter(event?.endDate || ''),
  );

  if (event) {
    const displayCalendar =
      event.interestGroup === undefined || event.interestGroup.active;

    const teams = mapAttendanceTeams(event.attendance);
    const teamsTotal = teams.length;
    const teamsAttended = teams.filter(({ attended }) => attended).length;
    const isTechSupport = !!user?.techSupport;
    const openAttendanceEditor = () => setIsEditingAttendance(true);
    const openSpeakersEditor = () => setIsEditingSpeakers(true);
    const attendance = hasFinished ? (
      <>
        <EventAttendance
          teamsAttended={teamsAttended}
          teamsTotal={teamsTotal}
          teams={teams}
          sinceLastEvent={
            event.previousEventAttendance && {
              count:
                teamsAttended - event.previousEventAttendance.teamsAttended,
              teamsAttended: event.previousEventAttendance.teamsAttended,
              teamsTotal: event.previousEventAttendance.teamsTotal,
            }
          }
          onAddAttendance={isTechSupport ? openAttendanceEditor : undefined}
          onEdit={isTechSupport ? openAttendanceEditor : undefined}
        />
        {isEditingAttendance && (
          <EditEventAttendanceModal
            teams={teams}
            loadSearchOptions={async () => []}
            onUploadList={async (files: File[]) => {
              const [rows, corpus] = await Promise.all([
                parseTeamRows(files),
                fetchTeamsForMatching(),
              ]);
              return matchTeamNames(rows, corpus);
            }}
            onSave={async (updatedTeams: EventAttendanceTeam[]) => {
              await patchEvent({
                attendance: updatedTeams.map((team) => ({
                  id: team.attendanceId,
                  teamId: team.teamId,
                  attended: team.attended,
                })),
              });
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
              ? () => downloadEventSpeakers(event, speakerGroups)
              : undefined
          }
          onAddSpeaker={isTechSupport ? openSpeakersEditor : undefined}
          onEdit={isTechSupport ? openSpeakersEditor : undefined}
        />
        {isEditingSpeakers && (
          <EditEventSpeakersModal
            groups={speakerGroups}
            isPastEvent={hasFinished}
            loadSearchOptions={async () => []}
            onSave={async (savedGroups) => {
              await patchEvent(
                mapGroupsToSpeakersUpdate(speakerGroups, savedGroups),
              );
              setIsEditingSpeakers(false);
            }}
            onDismiss={() => setIsEditingSpeakers(false)}
          />
        )}
      </>
    );

    if (isEnabled('NEW_EVENT_PAGE')) {
      return (
        <Frame title={event.title}>
          <EventDetailPage
            {...eventMapper(event)}
            hasFinished={hasFinished}
            backHref={backHref}
            onRefresh={refreshEvent}
            getIconForDocumentType={getIconForDocumentType}
            displayCalendar={displayCalendar}
            eventConversation={<EventConversation {...event} />}
            eventAttendance={attendance}
            eventSpeakers={speakers}
          />
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
