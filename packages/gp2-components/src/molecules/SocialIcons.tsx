import { gp2 as gp2Model } from '@asap-hub/model';
import { css } from '@emotion/react';
import { Link, pixels, colors, colour } from '@asap-hub/react-components';
import { socialIconsMap } from '../utils';

const { rem } = pixels;
const { neutral900 } = colors;

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
    width: '24px',
    height: '24px',
  },
});

const inactiveStyles = css({
  svg: { fill: colour.neutral[200], stroke: colour.neutral[200] },
});

type SocialIconsProps = gp2Model.UserSocial;

const SocialIcons: React.FC<SocialIconsProps> = ({
  github,
  linkedIn,
  orcid,
  researcherId,
  blueSky,
  threads,
  twitter,
  googleScholar,
  researchGate,
  blog,
}) => {
  const iconProps = { color: neutral900.hex };

  const socialLinks = [
    { key: 'orcid', link: orcid, Icon: socialIconsMap.orcid },
    { key: 'blueSky', link: blueSky, Icon: socialIconsMap.blueSky },
    { key: 'threads', link: threads, Icon: socialIconsMap.threads },
    { key: 'twitter', link: twitter, Icon: socialIconsMap.twitter },
    { key: 'linkedIn', link: linkedIn, Icon: socialIconsMap.linkedIn },
    { key: 'github', link: github, Icon: socialIconsMap.github },
    {
      key: 'researcherId',
      link: researcherId,
      Icon: socialIconsMap.researcherId,
    },
    {
      key: 'googleScholar',
      link: googleScholar,
      Icon: socialIconsMap.googleScholar,
    },
    {
      key: 'researchGate',
      link: researchGate,
      Icon: socialIconsMap.researchGate,
    },
    { key: 'blog', link: blog, Icon: socialIconsMap.blog },
  ];

  return (
    <div css={socialContainerStyles}>
      {socialLinks.map(({ key, link, Icon }) =>
        link ? (
          <Link href={link} key={key}>
            <div css={[iconStyles, !link && inactiveStyles]}>
              <Icon key={key} {...iconProps} />
            </div>
          </Link>
        ) : null,
      )}
    </div>
  );
};

export default SocialIcons;
