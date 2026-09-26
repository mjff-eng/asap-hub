import { css } from '@emotion/react';
import { EventSpeaker } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { useState } from 'react';
import { Headline3, Headline4, Avatar, Link, Button } from '../atoms';
import { tabletScreen, rem } from '../pixels';
import {
  userPlaceholderIcon,
  chevronCircleDownIcon,
  chevronCircleUpIcon,
  alumniBadgeIcon,
  InactiveBadgeIcon,
} from '../icons';
import { useDateHasPassed } from '../date';
import { considerEndedAfter } from '../utils';
import { colourWithAlpha, colour } from '../colors';

const gridStyles = css({
  display: 'grid',
  flexFlow: 'column',
  gap: rem(15),
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    gap: 0,
  },
});

const userStyles = css({
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: 'min-content 1fr',
  gridColumnGap: rem(15),
  alignItems: 'center',
});

const gridMixin = {
  display: 'grid',
  [`@media (min-width: ${tabletScreen.width - 1}px)`]: {
    gridTemplateColumns: '1fr 1fr 1fr',
    gridAutoFlow: 'column',
    alignItems: 'start',
  },
};

const headerStyle = css({
  ...gridMixin,
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    display: 'none',
  },
});

const placeholderStyle = css({
  display: 'flex',
});

const labelStyle = css({
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    gridTemplateColumns: '1fr 1fr 1fr',
    gridAutoFlow: 'column',
    alignItems: 'start',
    display: 'inline-block',
    fontWeight: 'bold',
  },
  display: 'none',
});

const groupStyle = css({
  display: 'flex',
  flexFlow: 'column',
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    paddingBottom: rem(12),
    paddingTop: rem(12),
  },
});

const toBeAnnouncedStyle = css({
  fontStyle: 'italic',
  color: colour.foreground.tertiary,
});

const previewStyle = {
  maxHeight: rem(69),
  overflow: 'hidden',
  background: `linear-gradient(180deg, ${
    colour.neutral[600]
  } 26.56%, ${colourWithAlpha(colour.neutral[600], 0)} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  textFillColor: 'transparent',
};

const speakerListMobileMixin = {
  gridAutoFlow: 'row',
  alignItems: 'start',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  paddingBottom: rem(12),
  paddingTop: rem(12),
};

const iconStyles = css({
  display: 'inline-flex',
});

const internalSpeakerStyle = css({
  display: 'inline-flex',
  gap: rem(8),
});

const speakerListStyles = {
  ...gridMixin,
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    ...speakerListMobileMixin,
    [`:nth-last-of-type(2)`]: { borderBottom: 'transparent' },
  },
};

const inactiveBadgeStyles = {
  lineHeight: rem(18),
  verticalAlign: 'middle',
  marginLeft: rem(8),
};

const hideStyles = css({
  ...gridMixin,
  [`:nth-of-type(4)`]: { ...previewStyle, borderBottom: 'transparent' },
  [`:nth-of-type(n+5)`]: { display: 'none' },
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    ...speakerListMobileMixin,
  },
});

const buttonWrapperStyles = css({
  paddingBottom: rem(21),
  marginBottom: rem(21),
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  [`@media (min-width: ${tabletScreen.width - 1}px)`]: {
    borderBottom: `transparent`,
  },
});

interface SpeakerListProps {
  speakers: EventSpeaker[];
  readonly endDate: string;
}

const SpeakerList: React.FC<SpeakerListProps> = ({ speakers, endDate }) => {
  const [expanded, setExpanded] = useState(false);
  const hasEnded = useDateHasPassed(considerEndedAfter(endDate));

  const userToBeAnnounced = hasEnded
    ? 'Speaker was not announced'
    : 'Speaker to be announced';

  const getSpeakerListStyles = () => {
    if (speakers.length < 6) {
      return {
        ...speakerListStyles,
        [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
          borderBottom: `1px solid ${colour.border.tertiary}`,
        },
      };
    }
    if (expanded) return speakerListStyles;

    return { ...speakerListStyles, ...hideStyles };
  };

  return (
    <div
      css={{
        display: 'flex',
        flexFlow: 'column',
      }}
    >
      <Headline3 styleAsHeading={3}>Speakers</Headline3>
      <div css={headerStyle}>
        <Headline4 styleAsHeading={4}>Team</Headline4>
        <Headline4 styleAsHeading={4}>Speaker</Headline4>
        <Headline4 styleAsHeading={4}>Role</Headline4>
      </div>
      <div css={gridStyles}>
        {speakers.map((speaker, index) => (
          <div key={`speaker-id-${index}`} css={getSpeakerListStyles()}>
            <div css={groupStyle}>
              <div css={labelStyle}>
                <span>Team</span>
              </div>
              {'externalUser' in speaker ? (
                <span>External Speaker</span>
              ) : 'team' in speaker ? (
                <Link
                  href={
                    network({}).teams({}).team({ teamId: speaker.team.id }).$
                  }
                >
                  <>
                    {speaker.team.displayName}
                    {speaker.team.inactiveSince && (
                      <span css={inactiveBadgeStyles}>
                        <InactiveBadgeIcon />
                      </span>
                    )}
                  </>
                </Link>
              ) : (
                <span>—</span>
              )}
            </div>
            <div css={groupStyle}>
              <div css={labelStyle}>
                <span>Speaker</span>
              </div>
              <div css={userStyles}>
                {'user' in speaker ? (
                  <Avatar {...speaker.user} imageUrl={speaker.user.avatarUrl} />
                ) : (
                  <div css={placeholderStyle}>{userPlaceholderIcon}</div>
                )}
                {('user' in speaker && (
                  <Link
                    href={
                      network({}).users({}).user({ userId: speaker.user.id }).$
                    }
                  >
                    <span css={internalSpeakerStyle}>
                      <span>{speaker.user.displayName}</span>
                      {speaker.user.alumniSinceDate && (
                        <span css={iconStyles}>{alumniBadgeIcon}</span>
                      )}
                    </span>
                  </Link>
                )) ||
                  ('externalUser' in speaker && (
                    <span>{speaker.externalUser.name}</span>
                  )) || (
                    <span css={toBeAnnouncedStyle}>{userToBeAnnounced}</span>
                  )}
              </div>
            </div>
            <div css={groupStyle}>
              <div css={labelStyle}>
                <span>Role</span>
              </div>
              <span>
                {('role' in speaker && speaker.role) ||
                  ('externalUser' in speaker && 'Guest') ||
                  `—`}
              </span>
            </div>
          </div>
        ))}
        {speakers.length > 5 && (
          <div css={buttonWrapperStyles}>
            <Button linkStyle onClick={() => setExpanded(!expanded)}>
              <span
                css={{
                  display: 'inline-grid',
                  verticalAlign: 'middle',
                  paddingRight: rem(12),
                }}
              >
                {expanded ? chevronCircleUpIcon : chevronCircleDownIcon}
              </span>
              Show {expanded ? 'less' : 'more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerList;
