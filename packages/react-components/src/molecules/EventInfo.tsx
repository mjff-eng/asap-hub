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
      <div css={dateBlockContainerStyle}>
        {thumbnail ? (
          <img
            alt={`Thumbnail for "${title}"`}
            src={thumbnail}
            css={thumbnailStyles}
          />
        ) : (
          <EventDateBlock startDate={props.startDate} />
        )}
      </div>
      <div css={contentStyles}>
        {link ? (
          <LinkHeadline level={3} styleAsHeading={4} href={link} noMargin>
            {displayTitle}
          </LinkHeadline>
        ) : (
          <Headline3 styleAsHeading={4} noMargin>
            {displayTitle}
          </Headline3>
        )}
        <EventTime {...props} />
        {eventOwner}
        {eventTeams}
        {eventSpeakers}
        {tags.length > 0 && (
          <div css={tagContainerStyles}>
            <TagList tags={tags} min={TAG_LIMIT} max={TAG_LIMIT} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EventInfo;
