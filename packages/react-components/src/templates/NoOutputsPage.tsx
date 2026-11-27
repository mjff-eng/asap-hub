import { css } from '@emotion/react';
import { sharedResearch } from '@asap-hub/routing';
import { ReactNode } from 'react';

import { Display, Paragraph, Link } from '../atoms';
import { remUnit } from '../pixels';
import { mediaFrom, pageMarginStyles } from '../layout';
import { LibraryIcon } from '../icons';
import { colour } from '../colors';

const styles = css(pageMarginStyles.crn, {
  display: 'grid',
  textAlign: 'center',

  [mediaFrom.tablet]: {
    justifyItems: 'center',
  },
});
const iconStyles = css({
  svg: { width: remUnit(48), height: remUnit(48) },
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
      <LibraryIcon color={colour.neutral[900]} />
    </span>
    <div>
      <Display styleAsHeading={4}>{title}</Display>
      <Paragraph accent="tertiary">{description}</Paragraph>
    </div>
    {!hideExploreButton && (
      <Link buttonStyle primary href={sharedResearch({}).$}>
        Explore Shared Research
      </Link>
    )}
  </div>
);

export default NoOutputsPage;
