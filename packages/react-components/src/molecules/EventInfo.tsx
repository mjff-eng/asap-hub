import { BasicEvent } from '@asap-hub/model';
import { events } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { EventDateBlock, EventTime, LinkHeadline, TagList } from '.';
import { Headline3 } from '..';
import { neutral900, steel } from '../colors';
import { largeDesktopScreen, rem } from '../pixels';

const TITLE_LIMIT = 55;
const TAG_LIMIT = 3;

const dateBlockContainerStyle = css({
  [`@media (max-width: ${largeDesktopScreen.min}px)`]: {
    display: 'none',
  },
});

const thumbnailStyles = css({
  display: 'block',
  boxSizing: 'border-box',
  width: rem(96),
  height: rem(96),
  objectFit: 'cover',

  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: steel.rgb,
  borderRadius: rem(8),
});

const contentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  minWidth: 0,
});

const tagContainerStyles = css({
  marginTop: rem(8),
  color: neutral900.rgb,
  fontSize: rem(17),
});

const cancelledTitleStyles = css({
  textDecoration: 'line-through',
});

const titleRowStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(8),
});

const titleTextGroupStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  minWidth: 0,
});

const cardStyles = css({
  display: 'flex',
  flexDirection: 'row',

  gap: rem(24),
});

type EventInfoProps = ComponentProps<typeof EventTime> &
  Pick<BasicEvent, 'id' | 'title' | 'status' | 'thumbnail'> & {
    eventOwner: React.ReactNode;
    tags: string[];
    titleLimit?: number | null;
    titleAsLink?: boolean;
    eventSpeakers?: React.ReactNode;
    eventTeams?: React.ReactNode;
    titlePrefix?: React.ReactNode;
    titleSuffix?: React.ReactNode;
    titleAction?: React.ReactNode;
    footer?: React.ReactNode;
    alwaysShowDateBlock?: boolean;
    dateBlockMuted?: boolean;
  };

const EventInfo: React.FC<EventInfoProps> = ({
  id,
  title,
  thumbnail,
  eventOwner,
  status,
  titleLimit = TITLE_LIMIT,
  titleAsLink = true,
  eventSpeakers,
  eventTeams,
  tags,
  titlePrefix,
  titleSuffix,
  titleAction,
  footer,
  alwaysShowDateBlock = false,
  dateBlockMuted = false,
  ...props
}) => {
  const cancelled = status === 'Cancelled';
  const link =
    cancelled || !titleAsLink ? undefined : events({}).event({ eventId: id }).$;

  const displayTitle = (
    <span css={cancelled && cancelledTitleStyles}>
      {title.substring(0, titleLimit ?? undefined)}
      {titleLimit && title.length > titleLimit ? '…' : undefined}
    </span>
  );

  return (
    <div css={cardStyles}>
      <div css={alwaysShowDateBlock ? undefined : dateBlockContainerStyle}>
        {thumbnail ? (
          <img
            alt={`Thumbnail for "${title}"`}
            src={thumbnail}
            css={thumbnailStyles}
          />
        ) : (
          <EventDateBlock startDate={props.startDate} muted={dateBlockMuted} />
        )}
      </div>
      <div css={contentStyles}>
        <div css={titleRowStyles}>
          <div css={titleTextGroupStyles}>
            {titlePrefix}
            {link ? (
              <LinkHeadline level={3} styleAsHeading={4} href={link} noMargin>
                {displayTitle}
              </LinkHeadline>
            ) : (
              <Headline3 styleAsHeading={4} noMargin>
                {displayTitle}
              </Headline3>
            )}
          </div>
          {titleSuffix}
        </div>
        {titleAction}
        <EventTime {...props} />
        {eventOwner}
        {eventTeams}
        {eventSpeakers}
        {tags.length > 0 && (
          <div css={tagContainerStyles}>
            <TagList tags={tags} min={TAG_LIMIT} max={TAG_LIMIT} />
          </div>
        )}
        {footer}
      </div>
    </div>
  );
};

export default EventInfo;
