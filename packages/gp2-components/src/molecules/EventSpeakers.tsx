import { gp2 as gp2Model } from '@asap-hub/model';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';
import {
  alumniBadgeIcon,
  Avatar,
  Collapsible,
  Divider,
  Link,
  pixels,
  Subtitle,
  userPlaceholderIcon,
  colour,
} from '@asap-hub/react-components';
import { mobileQuery, nonMobileQuery } from '../layout';

const { rem } = pixels;

const rowStyles = css({
  display: 'grid',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  padding: `${rem(16)} 0 ${rem(12)}`,
  rowGap: rem(24),
  gridTemplateColumns: '1fr',
  [nonMobileQuery]: {
    gridTemplateColumns: '256px 1fr',
    padding: `${rem(16)} 0 0`,
    borderBottom: 'none',
    columnGap: `${rem(16)}`,
    rowGap: 0,
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
});

const gridTitleStyles = css({
  marginBottom: 0,
  paddingBottom: 0,
  [mobileQuery]: {
    display: 'none',
  },
});

const headingListStyles = css({
  [nonMobileQuery]: {
    display: 'none',
  },
});

const secondaryTextStyles = css({
  color: colour.foreground.tertiary,
});

const textWrap = css({
  overflowWrap: 'anywhere',
});

const topicStyles = css({
  overflowWrap: 'break-word',
});

interface EventSpeakersProps {
  speakers: gp2Model.EventSpeaker[];
}

type UserSpeakerProps = {
  speaker: gp2Model.EventSpeakerUser;
};

const UserSpeaker = ({ speaker }: UserSpeakerProps) => (
  <Link href={gp2Routing.users({}).user({ userId: speaker.id }).$}>
    <div css={[{ gap: 9, display: 'flex', alignItems: 'center' }, textWrap]}>
      <div>
        <Avatar {...speaker} imageUrl={speaker.avatarUrl} />
      </div>
      {speaker.displayName}
      {speaker.alumniSinceDate && <span>{alumniBadgeIcon}</span>}
    </div>
  </Link>
);

type ExternalOrToBeAnnouncedProps = {
  speaker: gp2Model.EventSpeakerExternalUser | undefined;
};

const ExternalOrToBeAnnounced = ({ speaker }: ExternalOrToBeAnnouncedProps) => (
  <div css={[{ display: 'flex' }, secondaryTextStyles, textWrap]}>
    <span css={{ marginRight: 9, height: 24 }}>{userPlaceholderIcon}</span>
    {speaker?.name || <i>To be announced</i>}
  </div>
);

const renderSpeaker = (eventSpeaker: gp2Model.EventSpeaker) =>
  eventSpeaker.speaker && 'displayName' in eventSpeaker.speaker ? (
    <UserSpeaker speaker={eventSpeaker.speaker} />
  ) : (
    <ExternalOrToBeAnnounced speaker={eventSpeaker.speaker} />
  );

const getTextStyles = (idx: number) =>
  idx === 0 ? [] : [secondaryTextStyles, topicStyles];

const headings = ['Speaker', 'Topic'];

const EventSpeakers: React.FC<EventSpeakersProps> = ({ speakers }) => {
  const rows = speakers.map((eventSpeaker, index) => ({
    id: index,
    values: [renderSpeaker(eventSpeaker), eventSpeaker.topic || '—'],
  }));

  return (
    <div css={{ marginTop: 32 }}>
      <Collapsible containerMaxHeight={184}>
        <div css={{ flexDirection: 'column' }}>
          <div css={[rowStyles, gridTitleStyles]}>
            {headings.map((heading, idx) => (
              <Subtitle key={`heading-${idx}`} noMargin>
                {heading}
              </Subtitle>
            ))}
          </div>
          {rows.map(({ id, values }, index) => (
            <div key={`display-row-${id}-${index}`} css={rowStyles}>
              {values.map((value, idx) => (
                <div
                  key={`display-row-value-${idx}`}
                  css={css({
                    display: 'flex',
                    gap: rem(16),
                    flexDirection: 'column',
                  })}
                >
                  {value && (
                    <>
                      <div css={headingListStyles}>
                        <Subtitle noMargin styleAsHeading={5}>
                          {headings[idx]}:
                        </Subtitle>
                      </div>
                      <div css={getTextStyles(idx)}>{value}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Collapsible>
      <Divider />
    </div>
  );
};

export default EventSpeakers;
