import { css } from '@emotion/react';
import { Paragraph, Subtitle } from '../atoms';
import { colour } from '../colors';
import {
  happyFaceIcon,
  informationInverseIcon,
  neutralFaceIcon,
  PercentageIcon,
  sadFaceIcon,
} from '../icons';
import { contentSidePaddingWithNavigation } from '../layout';
import { rem, smallDesktopScreen } from '../pixels';
import CaptionCard from './CaptionCard';

const containerStyles = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, auto)',
  gap: rem(12),
  gridColumn: '1 / span 2',
  [`@media (max-width: calc(${
    smallDesktopScreen.width
  }px + ${contentSidePaddingWithNavigation(2)}))`]: {
    gridTemplateColumns: 'repeat(2, auto)',
    gap: rem(12),
  },
});

const dataContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: rem(4),
  textWrap: 'nowrap',
});

const dataTextStyles = css({
  fontWeight: 400,
  fontSize: rem(17),
  textWrap: 'nowrap',
  color: colour.foreground.tertiary,
});

const captionLegendStyles = css({
  gridColumn: '1 / span 2',
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(4),
});

const iconContainerStyles = css({
  flexShrink: 0,
});

const paragraphContainerStyles = css({
  flex: 1,
  minWidth: 0,
});

const StaticPerformanceCard = ({
  outstanding = 90,
  adequate = 80,
  needsImprovement = 80,
  limitedData = 0,
  legend,
}: {
  outstanding?: number;
  adequate?: number;
  needsImprovement?: number;
  limitedData?: number;
  legend?: string;
}) => (
  <CaptionCard>
    <div css={containerStyles}>
      <div css={dataContainerStyles}>
        {happyFaceIcon}
        <Subtitle noMargin>Outstanding:</Subtitle>
        <span css={dataTextStyles}>&ge; {outstanding}%</span>
      </div>
      <div css={dataContainerStyles}>
        {neutralFaceIcon}
        <Subtitle noMargin>Adequate:</Subtitle>
        <span css={dataTextStyles}>
          {adequate}% - {outstanding - 1}%
        </span>
      </div>
      <div css={dataContainerStyles}>
        {sadFaceIcon}
        <Subtitle noMargin>Needs Improvement:</Subtitle>
        <span css={dataTextStyles}>&lt; {needsImprovement}%</span>
      </div>
      <div css={dataContainerStyles}>
        {informationInverseIcon}
        <Subtitle noMargin>Limited data</Subtitle>
      </div>
    </div>
    {legend && (
      <div css={captionLegendStyles}>
        <div css={iconContainerStyles}>
          {PercentageIcon({
            title: 'percentage',
            color: colour.neutral[700],
          })}
        </div>
        <Paragraph
          accent="tertiary"
          noMargin
          styles={css(paragraphContainerStyles)}
        >
          {legend}
        </Paragraph>
      </div>
    )}
  </CaptionCard>
);

export default StaticPerformanceCard;
