import { EventResponse } from '@asap-hub/model';
import { EventNumberOfSpeakers, EventOwner, EventTeams } from './molecules';

// Prefer the associated Interest Group's thumbnail, fall back to the event's
// own thumbnail. Shared by the list/detail mapper and the legacy event page.
export const resolveEventThumbnail = ({
  interestGroup,
  thumbnail,
}: Pick<EventResponse, 'interestGroup' | 'thumbnail'>): string | undefined =>
  interestGroup?.thumbnail ?? thumbnail;

export const eventMapper = ({
  speakers,
  interestGroup,
  workingGroup,
  ...event
}: EventResponse) => ({
  ...event,
  thumbnail: resolveEventThumbnail({
    interestGroup,
    thumbnail: event.thumbnail,
  }),
  tags: event.tags.map(({ name }) => name),
  eventTeams: <EventTeams speakers={speakers} />,
  eventSpeakers: <EventNumberOfSpeakers speakers={speakers} />,
  eventOwner: (
    <EventOwner interestGroup={interestGroup} workingGroup={workingGroup} />
  ),
});
