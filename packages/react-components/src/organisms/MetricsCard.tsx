import { css } from '@emotion/react';
import { ReactNode, useState } from 'react';

import { Button, Card, Paragraph, Subtitle } from '../atoms';
import { charcoal, lead, steel } from '../colors';
import { minusRectIcon, plusRectIcon } from '../icons';
import { ExpandableText, Info } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { getPerformanceMoodIcon, getPerformanceMoodLabel } from '../utils';

const gridTemplateColumns = `${rem(24)} minmax(0, 1fr) ${rem(64)}`;

const CARD_INLINE_PADDING = 24;

const cardStyles = css({
  padding: `${rem(32)} ${rem(CARD_INLINE_PADDING)}`,
});

const headerStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'grid',
    gridTemplateColumns,
    columnGap: rem(16),
    paddingBottom: rem(16),
  },
});

const headerMetricStyles = css({
  gridColumn: 2,
});

const rowStyles = css({
  paddingBlock: rem(32),
  marginInline: rem(-CARD_INLINE_PADDING),
  paddingInline: rem(CARD_INLINE_PADDING),
  '&:first-of-type': {
    paddingTop: 0,
  },
  '&:last-of-type': {
    paddingBottom: 0,
  },
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${steel.rgb}`,
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'grid',
    gridTemplateColumns,
    columnGap: rem(16),
    alignItems: 'center',
    paddingTop: rem(20),
    marginInline: 0,
    paddingInline: 0,
  },
});

const rowHeaderStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: rem(16),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'contents',
  },
});

const iconButtonStyles = css({
  display: 'none',
  lineHeight: 0,
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inline-flex',
  },
});

const fieldStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
  color: lead.rgb,
  fontSize: rem(17),
  lineHeight: rem(24),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'block',
  },
});

const fieldLabelStyles = css({
  color: charcoal.rgb,
  fontWeight: 'bold',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'none',
  },
});

const detailsContentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const detailsBlockStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(4),
});

const desktopDetailsStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'block',
    gridColumn: 2,
    minWidth: 0,
    marginTop: rem(24),
  },
});

const mobileDetailsStyles = css({
  marginTop: rem(32),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'none',
  },
});

export type Metric = {
  id: string;
  name: string;
  status: ReactNode;
  philosophy: string;
  definition: string;
};

export const BooleanStatus: React.FC<{ value: boolean }> = ({ value }) => (
  <>{value ? 'Y' : 'N'}</>
);

const moodLabelStyles = css({
  display: 'flex',
  maxWidth: 'unset',
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    maxWidth: rem(90),
  },
});

export const MoodStatus: React.FC<{
  percentage: number | null;
  limitedData?: boolean;
}> = ({ percentage, limitedData = false }) => {
  const label = getPerformanceMoodLabel(percentage, limitedData);
  return (
    <Info
      label={label}
      width={180}
      icon={getPerformanceMoodIcon(percentage, limitedData)}
    >
      <span css={moodLabelStyles}>{label}</span>
    </Info>
  );
};

const MetricDetails: React.FC<Pick<Metric, 'philosophy' | 'definition'>> = ({
  philosophy,
  definition,
}) => (
  <div css={detailsContentStyles}>
    <div css={detailsBlockStyles}>
      <Subtitle accent="lead" noMargin>
        ASAP Philosophy
      </Subtitle>
      <Paragraph noMargin accent="lead">
        {philosophy}
      </Paragraph>
    </div>
    <div css={detailsBlockStyles}>
      <Subtitle accent="lead" noMargin>
        Metric Definition
      </Subtitle>
      <Paragraph noMargin accent="lead">
        {definition}
      </Paragraph>
    </div>
  </div>
);

const MetricRow: React.FC<Metric> = ({
  name,
  status,
  philosophy,
  definition,
}) => {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => setExpanded((current) => !current);

  return (
    <article css={rowStyles} data-testid="metrics-card-row">
      <div css={rowHeaderStyles}>
        <Button
          aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
          aria-expanded={expanded}
          linkStyle
          onClick={toggleExpanded}
          overrideStyles={iconButtonStyles}
        >
          {expanded ? minusRectIcon : plusRectIcon}
        </Button>
        <div css={fieldStyles}>
          <span css={fieldLabelStyles}>Metric</span>
          <span>{name}</span>
        </div>
        <div css={fieldStyles}>
          <span css={fieldLabelStyles}>Status</span>
          <span>{status}</span>
        </div>
      </div>
      {expanded && (
        <div
          css={desktopDetailsStyles}
          data-testid="metrics-card-details-desktop"
        >
          <MetricDetails philosophy={philosophy} definition={definition} />
        </div>
      )}

      <div css={mobileDetailsStyles} data-testid="metrics-card-details-mobile">
        <ExpandableText variant="arrow" expandOnce>
          <MetricDetails philosophy={philosophy} definition={definition} />
        </ExpandableText>
      </div>
    </article>
  );
};

export type MetricsCardProps = {
  metrics: Metric[];
};

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => (
  <Card overrideStyles={cardStyles}>
    <div css={headerStyles}>
      <div css={headerMetricStyles}>
        <Subtitle noMargin>Metric</Subtitle>
      </div>
      <Subtitle noMargin>Status</Subtitle>
    </div>
    {metrics.map((metric) => (
      <MetricRow key={metric.id} {...metric} />
    ))}
  </Card>
);

export default MetricsCard;
