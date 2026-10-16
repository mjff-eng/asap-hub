import { ComponentProps } from 'react';

import { BasicEvent, eventMaterialTypes } from '@asap-hub/model';

import {
  ToastCard,
  EventInfo,
  EventMaterialsList,
  JoinMeetingButton,
} from '../molecules';
import type { MaterialType } from '../molecules';
import { useEventLiveStatus } from '../utils';

type EventCardProps = ComponentProps<typeof EventInfo> &
  Pick<
    BasicEvent,
    | 'status'
    | 'meetingLink'
    | 'hideMeetingLink'
    | 'notes'
    | 'videoRecording'
    | 'presentation'
    | 'meetingMaterials'
  > & {
    displayToast?: boolean;
    hasSpeakersToBeAnnounced: boolean;
  };

const displayedMaterialTypes = [
  'notes',
  'videoRecording',
  'presentation',
] as const;

const materialOrder: MaterialType[] = [
  'notes',
  'videoRecording',
  'presentation',
];

const EventCard: React.FC<EventCardProps> = ({
  status,
  displayToast = true,
  hasSpeakersToBeAnnounced,
  ...props
}) => {
  const { hasStarted, hasFinished } = useEventLiveStatus(
    props.startDate,
    props.endDate,
  );
  const toastCardProps = (
    shouldDisplayToast: boolean,
  ): Omit<ComponentProps<typeof ToastCard>, 'children'> => {
    if (shouldDisplayToast === false) {
      return {};
    }
    if (status === 'Cancelled') {
      return {
        toastContent: 'The event has been cancelled.',
        type: 'alert',
        ...(hasFinished ? { accent: 'inactive' } : {}),
      };
    }
    if (hasStarted && !hasFinished) {
      if (props.hideMeetingLink) {
        return {
          type: 'live',
          toastContent: (
            <span>This in-person event is currently happening.</span>
          ),
        };
      }
      return {
        type: 'live',
        toastContent: <span>This event is happening now.</span>,
        toastAction: <JoinMeetingButton meetingLink={props.meetingLink} />,
      };
    }
    if (!hasStarted && hasSpeakersToBeAnnounced) {
      return {
        type: 'info',
        toastContent: 'More speakers to be announced.',
      };
    }

    if (hasFinished) {
      const isMaterialAvailable = (
        key: (typeof eventMaterialTypes)[number],
      ): boolean => {
        const value = props[key];
        return Array.isArray(value) ? value.length > 0 : Boolean(value);
      };
      return {
        type: 'attachment',
        accent: 'neutral200',
        mutedIcon: !displayedMaterialTypes.some(isMaterialAvailable),
        toastContent: (
          <EventMaterialsList
            id={props.id}
            notes={props.notes}
            videoRecording={props.videoRecording}
            presentation={props.presentation}
            order={materialOrder}
            showIcon={false}
          />
        ),
      };
    }
    return {};
  };

  return (
    <ToastCard {...toastCardProps(displayToast)}>
      <EventInfo {...props} status={status} />
    </ToastCard>
  );
};

export default EventCard;
