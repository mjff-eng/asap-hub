import { Subtitle, pixels } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import SocialLink, { SocialLinkProps } from '../molecules/SocialLink';

const { rem } = pixels;

const buttonsContainerStyles = css({
  marginTop: rem(16),
  display: 'inline-flex',
  flexDirection: 'row',
  gap: rem(16),
  flexWrap: 'wrap',
});

interface SocialSubGroupProps {
  readonly list: SocialLinkProps[];
  readonly title: string;
}

const SocialSubGroup = ({ list, title }: SocialSubGroupProps) => (
  <div>
    <Subtitle styleAsHeading={4} bold noMargin accent="tertiary">
      {title}
    </Subtitle>
    <div css={buttonsContainerStyles}>
      {list.map(({ key, ...linkProps }) => (
        <SocialLink key={key} {...linkProps} />
      ))}
    </div>
  </div>
);

export default SocialSubGroup;
