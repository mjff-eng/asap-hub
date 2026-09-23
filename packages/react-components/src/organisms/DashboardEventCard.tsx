import { ReactNode } from 'react';
import { css } from '@emotion/react';

import {
  BasicEvent,
  EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
} from '@asap-hub/model';
import { subMinutes, parseISO } from 'date-fns';

import { EventInfo, EventMaterialsList } from '../molecules';
import { Link } from '../atoms';
import { ember, silver, lead } from '../colors';
import { EventsUpcomingIcon, LiveIcon, MapPinIcon } from '../icons';
import { rem, mobileScreen, largeDesktopScreen } from '../pixels';
import { useDateHasPassed } from '../date';
import { considerEndedAfter } from '../utils';

const positionedWrapperStyles = css({
  position: 'relative',
});

const buttonWrapperStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: rem(15),
    width: '100%',
  },

  [`@media (min-width: ${largeDesktopScreen.min}px)`]: {
    position: 'absolute',
    top: 0,
    right: 0,
  },

  svg: {
    width: rem(16),
    height: rem(16),
  },
});

const buttonContentStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const inPersonPillStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: rem(8),
  padding: `${rem(4)} ${rem(8)}`,
  borderRadius: rem(12),
  backgroundColor: silver.rgb,
  color: lead.rgb,
  fontSize: rem(14),
  fontWeight: 'bold',
});

type DashboardEventCardProps = Pick<
  BasicEvent,
  | 'id'
  | 'title'
  | 'status'
  | 'thumbnail'
  | 'startDate'
  | 'startDateTimeZone'
  | 'endDate'
  | 'endDateTimeZone'
  | 'recurring'
  | 'meetingLink'
  | 'hideMeetingLink'
  | 'notes'
  | 'videoRecording'
  | 'presentation'
> & {
  eventOwner: ReactNode;
  variant: 'upcoming' | 'past';
};

const DashboardEventCard: React.FC<DashboardEventCardProps> = ({
  status,
  meetingLink,
  hideMeetingLink,
  notes,
  videoRecording,
  presentation,
  variant,
  ...props
}) => {
  const considerStartedAfter = subMinutes(
    parseISO(props.startDate),
    EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
  );

  const hasStarted = useDateHasPassed(considerStartedAfter);
  const hasFinished = useDateHasPassed(considerEndedAfter(props.endDate));

  const live =
    variant === 'upcoming' &&
    status !== 'Cancelled' &&
    hasStarted &&
    !hasFinished;
  const inPerson = !meetingLink || hideMeetingLink;

  return (
    <div css={positionedWrapperStyles}>
      <EventInfo
        {...props}
        status={status}
        tags={[]}
        alwaysShowDateBlock
        dateBlockMuted={variant === 'past'}
        titlePrefix={
          live ? <LiveIcon color={ember.hex} size={16} /> : undefined
        }
        titleSuffix={
          inPerson ? (
            <span css={inPersonPillStyles}>
              <MapPinIcon size={16} />
              In person
            </span>
          ) : undefined
        }
        titleAction={
          live && meetingLink && !hideMeetingLink ? (
            <div css={buttonWrapperStyles}>
              <Link href={meetingLink} noMargin primary buttonStyle small>
                <span css={buttonContentStyles}>
                  <EventsUpcomingIcon color="currentColor" size={20} />
                  Join event now
                </span>
              </Link>
            </div>
          ) : undefined
        }
        footer={
          variant === 'past' ? (
            <EventMaterialsList
              id={props.id}
              notes={notes}
              videoRecording={videoRecording}
              presentation={presentation}
            />
          ) : undefined
        }
      />
    </div>
  );
};

export default DashboardEventCard;
