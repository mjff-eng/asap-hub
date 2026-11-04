import { UserResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { cloneElement } from 'react';

import { Link } from '../atoms';
import { colour } from '../colors';
import { GlobeIcon } from '../icons';
import { rem, tabletScreen } from '../pixels';
import { getSocialLinks } from './SocialIcons';

const ICON_COLOR = colour.neutral[600];
const ICON_SIZE = 20;
// 1.5px rendered stroke on the globe's 24-unit viewBox at ICON_SIZE.
// Shared by the label globe and the website globes so they match.
const GLOBE_STROKE_WIDTH = (1.5 * 24) / ICON_SIZE;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  color: colour.foreground.tertiary,

  [`@media (min-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

const labelStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  whiteSpace: 'nowrap',
});

const labelIconStyles = css({
  display: 'inline-flex',
  width: rem(ICON_SIZE),
  height: rem(ICON_SIZE),
  svg: { width: '100%', height: '100%' },
});

const listStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(16),
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

const iconStyles = css({
  display: 'inline-flex',
  svg: {
    display: 'block',
    width: rem(ICON_SIZE),
    height: rem(ICON_SIZE),
  },
});

type ExternalProfilesProps = NonNullable<UserResponse['social']>;

const ExternalProfiles: React.FC<ExternalProfilesProps> = (social) => {
  const links = getSocialLinks(social);
  if (links.length === 0) {
    return null;
  }
  return (
    <div css={containerStyles}>
      <span css={labelStyles}>
        <span css={labelIconStyles}>
          <GlobeIcon
            color={colour.foreground.tertiary}
            strokeWidth={GLOBE_STROKE_WIDTH}
          />
        </span>
        External profiles:
      </span>
      <ul css={listStyles} aria-label="External profiles">
        {links.map(({ link, icon }) => (
          <li key={link} css={iconStyles}>
            <Link href={link}>
              {cloneElement(icon, {
                color: ICON_COLOR,
                ...(icon.type === GlobeIcon && {
                  strokeWidth: GLOBE_STROKE_WIDTH,
                }),
              })}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExternalProfiles;
