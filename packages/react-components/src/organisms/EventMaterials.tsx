import { isEnabled } from '@asap-hub/flags';
import { css } from '@emotion/react';
import {
  eventMaterialTypes,
  EventResponse,
  EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
} from '@asap-hub/model';
import { addHours, parseISO } from 'date-fns';

import { RichTextCard, AdditionalMaterials } from '.';
import { rem } from '../pixels';
import {
  EventMaterialComingSoon,
  EventMaterialUnavailable,
  EventMaterialsUnavailable,
  EventMaterialsEmptyView,
} from '../molecules';
import { useDateHasPassed } from '../date';

const cardsStyles = css({
  display: 'grid',
  rowGap: rem(33),
});

export const eventMaterialSectionIds: Record<
  (typeof eventMaterialTypes)[number],
  string
> = {
  notes: 'event-notes',
  videoRecording: 'event-video-recording',
  presentation: 'event-presentation',
  meetingMaterials: 'event-additional-materials',
};

type EventMaterial = EventResponse[(typeof eventMaterialTypes)[number]];

const isMaterialMissing = (material: EventMaterial): boolean =>
  material === undefined || (Array.isArray(material) && material.length === 0);

type EventMaterialsProps = Pick<
  EventResponse,
  'endDate' | 'notes' | 'videoRecording' | 'presentation' | 'meetingMaterials'
>;
const EventMaterials: React.FC<EventMaterialsProps> = ({
  endDate,
  ...materials
}) => {
  const hasEnded = useDateHasPassed(
    addHours(parseISO(endDate), EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT),
  );
  if (!hasEnded) {
    return null;
  }

  if (
    isEnabled('NEW_EVENT_PAGE') &&
    eventMaterialTypes.every((material) =>
      isMaterialMissing(materials[material]),
    )
  ) {
    return <EventMaterialsEmptyView variant="coming-soon" />;
  }

  if (eventMaterialTypes.every((material) => materials[material] === null)) {
    return isEnabled('NEW_EVENT_PAGE') ? (
      <EventMaterialsEmptyView variant="stale" />
    ) : (
      <EventMaterialsUnavailable />
    );
  }

  const { notes, videoRecording, presentation, meetingMaterials } = materials;

  return (
    <div css={cardsStyles}>
      <div id={eventMaterialSectionIds.notes}>
        {notes === null ? (
          <EventMaterialUnavailable materialType="Notes" />
        ) : !notes ? (
          <EventMaterialComingSoon materialType="Notes" />
        ) : (
          <RichTextCard collapsible text={notes} title="Notes" />
        )}
      </div>
      <div id={eventMaterialSectionIds.videoRecording}>
        {videoRecording === null ? (
          <EventMaterialUnavailable materialType="Video recording" />
        ) : !videoRecording ? (
          <EventMaterialComingSoon materialType="Video recording" />
        ) : (
          <RichTextCard text={videoRecording} title="Video recording" />
        )}
      </div>
      <div id={eventMaterialSectionIds.presentation}>
        {presentation === null ? (
          <EventMaterialUnavailable materialType="Presentation" />
        ) : !presentation ? (
          <EventMaterialComingSoon materialType="Presentation" />
        ) : (
          <RichTextCard text={presentation} title="Presentation" />
        )}
      </div>
      <div id={eventMaterialSectionIds.meetingMaterials}>
        {meetingMaterials === null ? (
          <EventMaterialUnavailable materialType="Additional meeting materials" />
        ) : meetingMaterials?.length === 0 ? (
          <EventMaterialComingSoon materialType="Additional meeting materials" />
        ) : (
          <AdditionalMaterials meetingMaterials={meetingMaterials} />
        )}
      </div>
    </div>
  );
};

export default EventMaterials;
