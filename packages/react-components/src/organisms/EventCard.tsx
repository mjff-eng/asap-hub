import { ComponentProps } from 'react';

import { BasicEvent, eventMaterialTypes } from '@asap-hub/model';

import { InPersonPill } from '../atoms';
import {
  ToastCard,
  ToastBar,
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
    | 'inPerson'
    | 'notes'
    | 'videoRecording'
    | 'presentation'
    | 'meetingMaterials'
  > & {
    displayToast?: boolean;
    plain?: boolean;
    displayMaterialsToast?: boolean;
    joinMeetingTooltipPosition?: ComponentProps<
      typeof JoinMeetingButton
    >['tooltipPosition'];
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

type EventToastProps = Omit<
  EventCardProps,
  'displayToast' | 'plain' | 'titleLimit' | 'titleAsLink'
>;

const useEventCardToast = ({
  status,
  displayMaterialsToast = true,
  joinMeetingTooltipPosition,
  ...props
}: EventToastProps) => {
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
      if (props.inPerson) {
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
        ...(props.inPerson
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

    if (hasFinished && displayMaterialsToast) {
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

  return { toastCardProps, hasFinished };
};

const EventCard: React.FC<EventCardProps> = ({
  displayToast = true,
  plain = false,
  ...props
}) => {
  const { toastCardProps, hasFinished } = useEventCardToast(props);
  const { displayMaterialsToast, joinMeetingTooltipPosition, ...infoProps } =
    props;

  return (
    <ToastCard {...toastCardProps(displayToast)} plain={plain}>
      <EventInfo
        {...infoProps}
        dateBlockMuted={hasFinished}
        titleSuffix={props.inPerson ? <InPersonPill /> : undefined}
      />
    </ToastCard>
  );
};

export const EventToast: React.FC<
  EventToastProps & Pick<ComponentProps<typeof ToastBar>, 'variant'>
> = ({ variant = 'fullWidth', ...props }) => {
  const { toastCardProps } = useEventCardToast(props);
  const { toastContent, accent, ...toastProps } = toastCardProps(true);
  if (!toastContent) {
    return null;
  }
  return (
    <ToastBar {...toastProps} toastContent={toastContent} variant={variant} />
  );
};

export default EventCard;
