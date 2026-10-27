import {
  MEETING_LINK_AVAILABLE_HOURS_BEFORE_EVENT,
  EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
} from '@asap-hub/model';
import { parseISO, addSeconds, subMinutes } from 'date-fns';

import {
  noop,
  considerEndedAfter,
  getMeetingLinkAvailableFrom,
  useMeetingLinkRefresh,
  MEETING_LINK_REFRESH_INTERVAL_SECONDS,
} from '../utils';
import { Headline2, Paragraph, Anchor, Link } from '../atoms';
import { WarningIcon } from '../icons';
import { colour } from '../colors';
import { layoutStyles } from '../text';
import { rem, mobileScreen } from '../pixels';
import { mailToSupport } from '../mail';
import { useDateHasPassed } from '../date';

interface JoinEventProps {
  readonly meetingLink?: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly onRefresh?: () => void;
}
const JoinEvent: React.FC<JoinEventProps> = ({
  meetingLink,
  startDate,
  endDate,
  onRefresh = noop,
}) => {
  const startRefreshingAfter = getMeetingLinkAvailableFrom(startDate);
  const considerStartedAfter = subMinutes(
    parseISO(startDate),
    EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
  );

  const startRefreshing = useDateHasPassed(startRefreshingAfter);
  const linkMissing =
    useDateHasPassed(
      addSeconds(
        startRefreshingAfter,
        2 * MEETING_LINK_REFRESH_INTERVAL_SECONDS,
      ),
    ) && !meetingLink;
  const hasStarted = useDateHasPassed(considerStartedAfter);
  const hasEnded = useDateHasPassed(considerEndedAfter(endDate));

  useMeetingLinkRefresh({ meetingLink, startDate, endDate, onRefresh });

  if (hasEnded) {
    return null;
  }

  return (
    <section>
      <Headline2 styleAsHeading={4}>Join this event</Headline2>
      <Paragraph>
        {hasStarted ? (
          'This event is currently happening.'
        ) : (
          <>
            The link will be available{' '}
            <strong>
              {MEETING_LINK_AVAILABLE_HOURS_BEFORE_EVENT} hour
              {MEETING_LINK_AVAILABLE_HOURS_BEFORE_EVENT === 1 ? '' : 's'}
            </strong>{' '}
            before the event begins.
          </>
        )}
        <br />
        <Link
          buttonStyle
          primary
          enabled={!!meetingLink && !!startRefreshing}
          href={meetingLink}
        >
          Join the meeting now
        </Link>
      </Paragraph>
      {linkMissing && (
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'max-content auto',
            columnGap: rem(12),
          }}
        >
          <div css={layoutStyles}>
            <WarningIcon color={colour.foreground.warning} />
          </div>
          <Paragraph accent="error">
            We’re sorry but we couldn’t find the link to this event.{' '}
            <br
              css={{
                [`@media (max-width: ${mobileScreen.max}px)`]: {
                  display: 'none',
                },
              }}
            />
            Please{' '}
            <Anchor href={mailToSupport()}>
              <span css={{ textDecoration: 'underline' }}>contact ASAP</span>
            </Anchor>{' '}
            for more information.
          </Paragraph>
        </div>
      )}
    </section>
  );
};

export default JoinEvent;
