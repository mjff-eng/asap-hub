import { UserResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { cloneElement } from 'react';

import { Link } from '../atoms';
import { colour } from '../colors';
import {
  BlueSkyIcon,
  LinkedInIcon,
  GithubIcon,
  TwitterIcon,
  ResearchGateIcon,
  ResearcherIdIcon,
  OrcidSocialIcon,
  GoogleScholarIcon,
  GlobeIcon,
} from '../icons';
import { rem } from '../pixels';

const SOCIAL_ICON_COLOR = colour.neutral[600];
const ROW_GAP = 12;
const socialContainerStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  paddingRight: `-${rem(ROW_GAP)}`,
  paddingTop: rem(15),
  paddingBottom: rem(17),
});

const iconStyles = css({
  paddingRight: rem(ROW_GAP),
  svg: {
    width: '28px',
    height: '28px',
  },
});

export type SocialLink = {
  readonly link: string;
  readonly icon: React.ReactElement<{ color?: string }>;
};

type SocialIconsProps = NonNullable<UserResponse['social']>;

export const getSocialLinks = ({
  blueSky,
  github,
  linkedIn,
  orcid,
  researcherId,
  twitter,
  googleScholar,
  researchGate,
  website1,
  website2,
}: SocialIconsProps): SocialLink[] =>
  (
    [
      {
        link: orcid ? new URL(`https://orcid.org/${orcid}`).toString() : null,
        icon: <OrcidSocialIcon />,
      },
      {
        link: researcherId
          ? new URL(`https://publons.com/researcher/${researcherId}`).toString()
          : null,
        icon: <ResearcherIdIcon />,
      },
      {
        link: blueSky
          ? new URL(`https://bsky.app/profile/${blueSky}`).toString()
          : null,
        icon: <BlueSkyIcon />,
      },
      {
        link: twitter
          ? new URL(`https://twitter.com/${twitter}`).toString()
          : null,
        icon: <TwitterIcon />,
      },
      {
        link: github
          ? new URL(`https://github.com/${github}`).toString()
          : null,
        icon: <GithubIcon />,
      },
      {
        link: googleScholar
          ? `https://scholar.google.co.uk/citations?${new URLSearchParams({
              user: googleScholar,
            }).toString()}`
          : null,
        icon: <GoogleScholarIcon />,
      },
      {
        link: researchGate
          ? new URL(
              `https://www.researchgate.net/profile/${researchGate}`,
            ).toString()
          : null,
        icon: <ResearchGateIcon />,
      },
      {
        link: linkedIn
          ? new URL(`https://www.linkedin.com/in/${linkedIn}`).toString()
          : null,
        icon: <LinkedInIcon />,
      },
      { link: website1 ?? null, icon: <GlobeIcon /> },
      { link: website2 ?? null, icon: <GlobeIcon /> },
    ] as const
  ).filter((item): item is SocialLink => !!item.link);

const SocialIcons: React.FC<SocialIconsProps> = (social) => (
  <div css={socialContainerStyles}>
    {getSocialLinks(social).map(({ link, icon }) => (
      <Link key={link} href={link}>
        <div css={iconStyles}>
          {cloneElement(icon, { color: SOCIAL_ICON_COLOR })}
        </div>
      </Link>
    ))}
  </div>
);

export default SocialIcons;
