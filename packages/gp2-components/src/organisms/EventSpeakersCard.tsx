import { gp2 as gp2Model } from '@asap-hub/model';
import {
  alumniBadgeIcon,
  Avatar,
  Card,
  colour,
  Headline3,
  Link,
  pixels,
  ResponsiveTable,
  ResponsiveTableColumn,
  userPlaceholderIcon,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';

const { rem } = pixels;

const tableStyles = css({
  marginTop: rem(24),
});

const speakerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  minWidth: 0,
  overflowWrap: 'anywhere',
});

const avatarStyles = css({
  flexShrink: 0,
  width: rem(24),
  height: rem(24),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& svg': {
    width: rem(24),
    height: rem(24),
  },
});

const externalSpeakerStyles = css({
  color: colour.foreground.tertiary,
});

const getSpeakerName = ({ speaker }: gp2Model.EventSpeaker) => {
  if (speaker && 'displayName' in speaker) {
    return speaker.displayName;
  }
  return speaker?.name || 'To be announced';
};

const renderSpeaker = ({ speaker }: gp2Model.EventSpeaker) => {
  if (speaker && 'displayName' in speaker) {
    return (
      <Link href={gp2Routing.users({}).user({ userId: speaker.id }).$}>
        <span css={speakerStyles}>
          <span css={avatarStyles}>
            <Avatar {...speaker} imageUrl={speaker.avatarUrl} />
          </span>
          {speaker.displayName}
          {speaker.alumniSinceDate && <span>{alumniBadgeIcon}</span>}
        </span>
      </Link>
    );
  }
  return (
    <span css={[speakerStyles, externalSpeakerStyles]}>
      <span css={avatarStyles}>{userPlaceholderIcon}</span>
      {speaker?.name || <i>To be announced</i>}
    </span>
  );
};

const columns: ReadonlyArray<ResponsiveTableColumn<gp2Model.EventSpeaker>> = [
  {
    key: 'speaker',
    title: 'Speaker',
    width: rem(248),
    render: renderSpeaker,
  },
  {
    key: 'topic',
    title: 'Topic',
    render: ({ topic }) => topic || '—',
  },
];

type EventSpeakersCardProps = {
  readonly speakers: gp2Model.EventSpeaker[];
};

const EventSpeakersCard: React.FC<EventSpeakersCardProps> = ({ speakers }) => (
  <Card>
    <Headline3 styleAsHeading={5} noMargin>
      Speakers
    </Headline3>
    <div css={tableStyles}>
      <ResponsiveTable
        columns={columns}
        rows={speakers}
        getRowKey={(eventSpeaker) =>
          `${speakers.indexOf(eventSpeaker)}-${getSpeakerName(eventSpeaker)}`
        }
        getToggleLabel={(eventSpeaker, expanded) =>
          `${expanded ? 'Hide' : 'Show'} details for ${getSpeakerName(
            eventSpeaker,
          )}`
        }
        dividers={false}
        testId="event-speakers"
      />
    </div>
  </Card>
);

export default EventSpeakersCard;
