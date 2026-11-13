import { EventPage, mail, NotFoundPage } from '@asap-hub/react-components';
import { gp2, useRouteParams } from '@asap-hub/routing';

import {
  EventSpeakers,
  EventOwner,
  getIconForDocumentType,
  getSourceIcon,
} from '@asap-hub/gp2-components';
import { useEventById } from './state';
import Frame from '../Frame';

const Event: React.FC = () => {
  const { eventId } = useRouteParams(gp2.events({}).event);
  const event = useEventById(eventId);

  if (event) {
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
          supportEmail={mail.INVITE_SUPPORT_EMAIL}
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
