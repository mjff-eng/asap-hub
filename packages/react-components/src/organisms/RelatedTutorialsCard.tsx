import { TutorialsResponse } from '@asap-hub/model';
import { discover } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { useState } from 'react';

import { Button, Card, Headline3, Link, Paragraph } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { charcoal, lead, steel } from '../colors';
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
      borderBottom: `1px solid ${steel.rgb}`,
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
  color: lead.rgb,
});

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  marginTop: rem(32),
  paddingTop: rem(16),
  paddingBottom: rem(16),
  borderTop: `1px solid ${steel.rgb}`,
});

const titleStyles = css({ fontWeight: 'bold', color: charcoal.rgb });

type RelatedTutorialsCardProps = Pick<TutorialsResponse, 'relatedTutorials'> & {
  description?: string;
  truncateFrom?: number;
};

const RelatedTutorialsCard: React.FC<RelatedTutorialsCardProps> = ({
  description = ' Find all related tutorials.',
  relatedTutorials,
  truncateFrom = Number.POSITIVE_INFINITY,
}) => {
  const [showMore, setShowMore] = useState(false);
  const displayShowMoreButton = relatedTutorials.length > truncateFrom;
  return (
    <Card padding={false}>
      <div
        css={[
          container,
          ...(displayShowMoreButton ? [{ paddingBottom: 0 }] : []),
        ]}
      >
        <Headline3 noMargin>Related Tutorials</Headline3>
        <div css={descriptionStyles}>
          <Paragraph noMargin accent="lead">
            {description}
          </Paragraph>
        </div>
        {relatedTutorials.length === 0 ? (
          <Paragraph noMargin accent="lead">
            <b>No related tutorials available.</b>
          </Paragraph>
        ) : (
          <div css={gridStyles}>
            <span css={[titleStyles, gridTitleStyles]}>Tutorial Name</span>
            <span css={[titleStyles, gridTitleStyles]}>Date</span>
            {relatedTutorials
              .slice(0, showMore ? undefined : truncateFrom)
              .map(({ id, created, title }, index) => (
                <React.Fragment key={`${index}-${id}`}>
                  <span css={[titleStyles, rowTitleStyles]}>Tutorial Name</span>
                  <p css={paragraphStyle}>
                    <Link
                      ellipsed
                      href={
                        discover({}).tutorials({}).tutorial({ tutorialId: id })
                          .$
                      }
                    >
                      {title}
                    </Link>
                  </p>
                  <span css={[titleStyles, rowTitleStyles]}>Date</span>
                  <p css={[paragraphStyle, underlineStyles]}>
                    {formatDateToTimezone(
                      created,
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
            View {showMore ? 'Less' : 'More'} Tutorials
          </Button>
        </div>
      )}
    </Card>
  );
};

export default RelatedTutorialsCard;
