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

const SOCIAL_ICON_COLOR = colour.neutral[700];
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

const SocialIconLink: React.FC<{
  link?: string;
  icon: React.ReactElement<{ color?: string }>;
}> = ({ link, icon }) =>
  link ? (
    <Link href={link}>
      <div css={iconStyles}>
        {cloneElement(icon, { color: SOCIAL_ICON_COLOR })}
      </div>
    </Link>
  ) : null;

type SocialIconsProps = NonNullable<UserResponse['social']>;

const SocialIcons: React.FC<SocialIconsProps> = ({
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
}) => (
  <div css={socialContainerStyles}>
    <SocialIconLink
      link={
        orcid ? new URL(`https://orcid.org/${orcid}`).toString() : undefined
      }
      icon={<OrcidSocialIcon />}
    />
    <SocialIconLink
      link={
        researcherId
          ? new URL(`https://publons.com/researcher/${researcherId}`).toString()
          : undefined
      }
      icon={<ResearcherIdIcon />}
    />
    <SocialIconLink
      link={
        blueSky
          ? new URL(`https://bsky.app/profile/${blueSky}`).toString()
          : undefined
      }
      icon={<BlueSkyIcon />}
    />
    <SocialIconLink
      link={
        twitter
          ? new URL(`https://twitter.com/${twitter}`).toString()
          : undefined
      }
      icon={<TwitterIcon />}
    />
    <SocialIconLink
      link={
        github ? new URL(`https://github.com/${github}`).toString() : undefined
      }
      icon={<GithubIcon />}
    />
    <SocialIconLink
      link={
        googleScholar
          ? `https://scholar.google.co.uk/citations?${new URLSearchParams({
              user: googleScholar,
            }).toString()}`
          : undefined
      }
      icon={<GoogleScholarIcon />}
    />
    <SocialIconLink
      link={
        researchGate
          ? new URL(
              `https://www.researchgate.net/profile/${researchGate}`,
            ).toString()
          : undefined
      }
      icon={<ResearchGateIcon />}
    />
    <SocialIconLink
      link={
        linkedIn
          ? new URL(`https://www.linkedin.com/in/${linkedIn}`).toString()
          : undefined
      }
      icon={<LinkedInIcon />}
    />
    <SocialIconLink link={website1} icon={<GlobeIcon />} />
    <SocialIconLink link={website2} icon={<GlobeIcon />} />
  </div>
);

export default SocialIcons;
