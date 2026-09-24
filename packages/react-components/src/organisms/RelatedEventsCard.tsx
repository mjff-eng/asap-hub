import { ResearchOutputResponse, gp2 } from '@asap-hub/model';
import { events } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { useState } from 'react';

import { Button, Card, Headline3, Link, Paragraph } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { neutral900, colour } from '../colors';
import { formatDateToTimezone } from '../date';

const container = css({
  display: 'grid',
  padding: `${rem(32)} ${rem(24)}`,
});

const descriptionStyles = css({
  marginTop: rem(24),
  marginBottom: rem(12),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    marginBottom: rem(32),
  },
});

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    paddingBottom: rem(16),
  },
});

const rowTitleStyles = css({
  paddingTop: rem(16),
  paddingBottom: rem(16),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const gridStyles = css({
  display: 'grid',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: 'auto max-content',
    columnGap: rem(15),
    rowGap: rem(16),
  },
});

const underlineStyles = css({
  [`@media (max-width: ${tabletScreen.min}px)`]: {
    paddingBottom: rem(16),
    '&:not(:last-child)': {
      borderBottom: `1px solid ${colour.border.tertiary}`,
    },
  },
});

const paragraphStyle = css({
  marginTop: 0,
  marginBottom: 0,
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  gap: rem(6),
  color: neutral900.rgb,
});

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  marginTop: rem(32),
  paddingTop: rem(16),
  paddingBottom: rem(16),
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const titleStyles = css({
  fontWeight: 'bold',
  color: colour.foreground.primary,
});

type RelatedEventsCardProps = (
  | Pick<ResearchOutputResponse, 'relatedEvents'>
  | Pick<gp2.OutputBaseResponse, 'relatedEvents'>
) & {
  description?: string;
  truncateFrom?: number;
  hub?: 'GP2' | 'CRN';
};

const RelatedEventsCard: React.FC<RelatedEventsCardProps> = ({
  relatedEvents,
  description = 'Find all related Events.',
  truncateFrom = Number.POSITIVE_INFINITY,
  hub = 'CRN',
}) => {
  const [showMore, setShowMore] = useState(false);
  const displayShowMoreButton = relatedEvents.length > truncateFrom;
  return (
    <Card padding={false}>
      <div
        css={[
          container,
          ...(displayShowMoreButton ? [{ paddingBottom: 0 }] : []),
        ]}
      >
        <Headline3 noMargin>Related {hub} Hub Events</Headline3>
        <div css={descriptionStyles}>
          <Paragraph noMargin accent="neutral900">
            {description}
          </Paragraph>
        </div>
        {relatedEvents.length === 0 ? (
          <Paragraph noMargin accent="neutral900">
            <b>No related {hub} Hub events available.</b>
          </Paragraph>
        ) : (
          <div css={gridStyles}>
            <span css={[titleStyles, gridTitleStyles]}>Event Name</span>
            <span css={[titleStyles, gridTitleStyles]}>Date</span>
            {relatedEvents
              .slice(0, showMore ? undefined : truncateFrom)
              .map(({ id, endDate, title }, index) => (
                <React.Fragment key={`${index}-${id}`}>
                  <span css={[titleStyles, rowTitleStyles]}>Event Name</span>
                  <p css={paragraphStyle}>
                    <Link ellipsed href={events({}).event({ eventId: id }).$}>
                      {title}
                    </Link>
                  </p>
                  <span css={[titleStyles, rowTitleStyles]}>Date</span>
                  <p css={[paragraphStyle, underlineStyles]}>
                    {formatDateToTimezone(
                      endDate,
                      'EEE, dd MMM yyyy',
                    ).toUpperCase()}
                  </p>
                </React.Fragment>
              ))}
          </div>
        )}
      </div>
      {displayShowMoreButton && (
        <div css={showMoreStyles}>
          <Button linkStyle onClick={() => setShowMore(!showMore)}>
            View {showMore ? 'Less' : 'More'} Events
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RelatedEventsCard;
