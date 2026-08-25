import { css } from '@emotion/react';
import { sharedResearch } from '@asap-hub/routing';
import { ReactNode } from 'react';

import { Display, Paragraph, Link } from '../atoms';
import { mobileScreen } from '../pixels';
import { contentSidePaddingWithNavigation } from '../layout';
import { LibraryIcon } from '../icons';
import { charcoal } from '../colors';

const styles = css({
  padding: `0 ${contentSidePaddingWithNavigation()}`,

  display: 'grid',
  textAlign: 'center',

  [`@media (min-width: ${mobileScreen.width + 1}px)`]: {
    justifyItems: 'center',
  },
});
const iconStyles = css({
  svg: { width: 48, height: 48 },
});

type NoOutputsPageProps = {
  title: string;
  description: ReactNode;
  hideExploreButton?: boolean;
};

const NoOutputsPage: React.FC<NoOutputsPageProps> = ({
  title,
  description,
  hideExploreButton = false,
}) => (
  <div css={styles}>
    <span css={iconStyles}>
      <LibraryIcon color={charcoal.rgb} />
    </span>
    <div>
      <Display styleAsHeading={3}>{title}</Display>
      <Paragraph accent="neutral900">{description}</Paragraph>
    </div>
    {!hideExploreButton && (
      <Link buttonStyle primary href={sharedResearch({}).$}>
        Explore Shared Research
      </Link>
    )}
  </div>
);

export default NoOutputsPage;
