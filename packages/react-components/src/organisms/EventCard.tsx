import { ComponentProps } from 'react';
import { css } from '@emotion/react';

import { BasicEvent, eventMaterialTypes } from '@asap-hub/model';

import { colour } from '../colors';
import { MapPinIcon } from '../icons';
import { pillStyles } from '../pill';
import { rem } from '../pixels';

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
    joinMeetingTooltipPosition?: ComponentProps<
      typeof JoinMeetingButton
    >['tooltipPosition'];
  };

const inPersonPillStyles = css([
  pillStyles,
  {
    padding: `${rem(4)} ${rem(8)}`,
    borderRadius: rem(12),
    backgroundColor: colour.background.info,
    color: colour.foreground.info,
    fontWeight: 500,
  },
]);

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
  joinMeetingTooltipPosition,
  ...props
}) => {
  const { hasStarted, hasFinished, isStartingSoon } = useEventLiveStatus(
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
          toastContent: <span>This in-person event is happening now.</span>,
        };
      }
      return {
        type: 'live',
        toastContent: <span>This event is happening now.</span>,
        toastAction: (
          <JoinMeetingButton
            meetingLink={props.meetingLink}
            tooltipPosition={joinMeetingTooltipPosition}
          />
        ),
      };
    }
    if (isStartingSoon) {
      return {
        type: 'upcoming',
        toastContent: <span>This event starts in less than 24 hours.</span>,
        ...(props.hideMeetingLink
          ? {}
          : {
              toastAction: (
                <JoinMeetingButton
                  meetingLink={props.meetingLink}
                  tooltipPosition={joinMeetingTooltipPosition}
                />
              ),
            }),
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
      <EventInfo
        {...props}
        status={status}
        titleSuffix={
          props.hideMeetingLink ? (
            <span css={inPersonPillStyles}>
              <MapPinIcon color={colour.foreground.info} size={16} />
              In person
            </span>
          ) : undefined
        }
      />
    </ToastCard>
  );
};

export default EventCard;
