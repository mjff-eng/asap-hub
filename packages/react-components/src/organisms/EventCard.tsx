import { ComponentProps } from 'react';
import { css } from '@emotion/react';

import {
  BasicEvent,
  eventMaterialTypes,
  EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
} from '@asap-hub/model';

import { subMinutes, parseISO } from 'date-fns';

import { ToastCard, EventInfo, EventMaterialsList } from '../molecules';
import type { MaterialType } from '../molecules';
import { rem, mobileScreen } from '../pixels';
import { Link } from '../atoms';
import { useDateHasPassed } from '../date';
import { considerEndedAfter } from '../utils';

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

const buttonStyle = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: rem(15),
    width: '100%',
  },
});

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
  const considerStartedAfter = subMinutes(
    parseISO(props.startDate),
    EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
  );

  const hasStarted = useDateHasPassed(considerStartedAfter);
  const hasFinished = useDateHasPassed(considerEndedAfter(props.endDate));
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
        ...(hasFinished ? { accent: 'neutral200' } : {}),
      };
    }
    if (hasStarted && !hasFinished) {
      return {
        type: 'live',
        toastContent: (
          <>
            {props.hideMeetingLink || !props.meetingLink ? (
              <span>This in-person event is currently happening.</span>
            ) : (
              <span>This event is happening now.</span>
            )}
          </>
        ),
        toastAction: (
          <>
            {props.meetingLink && !props.hideMeetingLink && (
              <div css={buttonStyle}>
                <Link
                  href={props.meetingLink}
                  noMargin
                  primary
                  buttonStyle
                  small
                >
                  Join Meeting Now
                </Link>
              </div>
            )}
          </>
        ),
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
