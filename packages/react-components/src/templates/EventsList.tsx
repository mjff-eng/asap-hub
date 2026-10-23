import { FC, ComponentProps } from 'react';
import { css } from '@emotion/react';

import { rem } from '../pixels';
import { ResultList, EventCard } from '../organisms';
import AlgoliaHit from '../atoms/AlgoliaHit';
import { CircleInfoIcon, EventIcon } from '../icons';
import { colour } from '../colors';

const containerStyles = css({
  display: 'grid',
  gridRowGap: rem(36),
});

const noticeStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  margin: 0,
  color: colour.neutral[900],
  svg: {
    flexShrink: 0,
    marginTop: rem(2),
  },
});

type EventsListProps = Omit<ComponentProps<typeof ResultList>, 'children'> & {
  events: ComponentProps<typeof EventCard>[];
  showOnlineEventsNotice?: boolean;
} & Pick<ComponentProps<typeof AlgoliaHit>, 'algoliaQueryId'>;

const EventsListPage: FC<EventsListProps> = ({
  events,
  algoliaQueryId,
  showOnlineEventsNotice = false,
  ...props
}) => (
  <div css={containerStyles}>
    <ResultList icon={<EventIcon color={colour.neutral[900]} />} {...props}>
      {showOnlineEventsNotice && (
        <p css={noticeStyles}>
          <CircleInfoIcon />
          Events are online by default and information appears shortly before it
          starts. In-person events are marked on the card.
        </p>
      )}
      {events.map(({ ...event }, index) => (
        <AlgoliaHit
          key={event.id}
          algoliaQueryId={algoliaQueryId}
          objectId={event.id}
          index={index}
        >
          <EventCard {...event} />
        </AlgoliaHit>
      ))}
    </ResultList>
  </div>
);
export default EventsListPage;
