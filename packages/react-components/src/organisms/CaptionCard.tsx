import { css } from '@emotion/react';

import { largeDesktopScreen, rem } from '../pixels';
import { Card, Paragraph } from '../atoms';
import { contentSidePaddingWithNavigation } from '../layout';
import { neutral900 } from '../colors';
import { PercentageIcon } from '../icons';

const cardStyles = css({ marginBottom: rem(32) });

const containerStyles = css({
  padding: rem(24),
  display: 'grid',
  [`@media (max-width: calc(${
    largeDesktopScreen.width
  }px + ${contentSidePaddingWithNavigation(4)}))`]: {
    gridTemplateColumns: '1fr',
  },
  gridTemplateColumns: '1fr 1fr',
  rowGap: rem(16),
  columnGap: rem(16),
});

const captionLegend = css({
  padding: `0 ${rem(24)} ${rem(24)}`,
  display: 'grid',
  gridColumn: '1 / span 2',
  gridTemplateColumns: `${rem(20)} auto`,
  gridTemplateRows: 'auto',
  gap: rem(14),
  alignItems: 'start',
  '& p': {
    color: neutral900.rgb,
    marginBlockStart: 0,
    marginBlockEnd: 0,
  },
});

interface CaptionCardProps {
  children: React.ReactNode;
  legend?: string;
}
const CaptionCard: React.FC<CaptionCardProps> = ({ children, legend }) => (
  <Card padding={false} overrideStyles={cardStyles}>
    <div css={containerStyles}>{children}</div>
    {legend && (
      <div css={captionLegend}>
        <PercentageIcon title="percentage" color={neutral900.rgb} />
        <Paragraph>{legend}</Paragraph>
      </div>
    )}
  </Card>
);
export default CaptionCard;
