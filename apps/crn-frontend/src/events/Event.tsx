import {
  EditEventAttendanceModal,
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
  noop,
  resolveEventThumbnail,
  SpeakerList,
  useDateHasPassed,
  considerEndedAfter,
  PageConstraints,
} from '@asap-hub/react-components';
import { useCurrentUserCRN, useFlags } from '@asap-hub/react-context';
import { events, useRouteParams } from '@asap-hub/routing';
import { Frame, useBackHref } from '@asap-hub/frontend-utils';
import { useState } from 'react';

import { composeAttendanceRows } from './attendance-rows';
import { downloadEventSpeakers } from './export';
import { matchTeamNames } from './match-team-names';
import { parseTeamRows } from './parse-team-list';
import {
  useEventById,
  useEventSpeakerGroups,
  useInterestGroupTeams,
  usePatchEvent,
  useQuietRefreshEventById,
  useTeamsForMatching,
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
  const patchEvent = usePatchEvent(eventId);
  const fetchTeamsForMatching = useTeamsForMatching();
  const { teams: interestGroupTeams, resolved: interestGroupResolved } =
    useInterestGroupTeams(event?.interestGroup?.id);

  const hasFinished = useDateHasPassed(
    considerEndedAfter(event?.endDate || ''),
  );

  if (event) {
    const displayCalendar =
      event.interestGroup === undefined || event.interestGroup.active;

    const teams = composeAttendanceRows(event.attendance, interestGroupTeams);
    const isEventProjectManager = !!user?.interestGroups.some(
      (ig) =>
        ig.id === event.interestGroup?.id &&
        ig.role === 'Project Manager' &&
        ig.active,
    );
    const isTechSupport = !!user?.techSupport;
    const canEditAttendance = isTechSupport && interestGroupResolved;
    const openAttendanceEditor = () => setIsEditingAttendance(true);
    const attendance = hasFinished ? (
      <>
        <EventAttendance
          teams={teams}
          interestGroupName={event.interestGroup?.name}
          onEdit={canEditAttendance ? openAttendanceEditor : undefined}
        />
        {isEditingAttendance && (
          <EditEventAttendanceModal
            teams={teams}
            interestGroupName={event.interestGroup?.name}
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
            eventSpeakers={
              <EventSpeakers
                groups={speakerGroups}
                hasFinished={hasFinished}
                onExport={
                  isTechSupport
                    ? () => downloadEventSpeakers(event, speakerGroups)
                    : undefined
                }
                onAddSpeaker={isEventProjectManager ? noop : undefined}
              />
            }
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
