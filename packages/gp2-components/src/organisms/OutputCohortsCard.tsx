import { gp2 } from '@asap-hub/model';
import { css } from '@emotion/react';
import React from 'react';

import {
  ExternalLink,
  Card,
  Headline2,
  Paragraph,
  pixels,
  colour,
} from '@asap-hub/react-components';

const { rem, tabletScreen } = pixels;

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

const paragraphStyle = css({
  marginTop: 0,
  marginBottom: 0,
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  gap: rem(6),
  color: colour.foreground.tertiary,
});

const titleStyles = css({
  fontWeight: 'bold',
  color: colour.foreground.primary,
});

type OutputCohortsCardProps = Pick<
  gp2.OutputBaseResponse,
  'contributingCohorts'
>;

const OutputCohortsCard: React.FC<OutputCohortsCardProps> = ({
  contributingCohorts,
}) => (
  <Card padding={false}>
    <div css={[container]}>
      <Headline2 noMargin>Contributing Cohort Studies</Headline2>
      <div css={descriptionStyles}>
        <Paragraph noMargin accent="tertiary">
          Find out all cohort studies that contributed to this output.
        </Paragraph>
      </div>
      {contributingCohorts.length === 0 ? (
        <Paragraph noMargin accent="tertiary">
          <b>No contributing cohorts available.</b>
        </Paragraph>
      ) : (
        <div css={gridStyles}>
          <span css={[titleStyles, gridTitleStyles]}>Name</span>
          <span css={[titleStyles, gridTitleStyles]}>Link</span>
          {contributingCohorts
            .slice(0, 3)
            .map(({ id, name, studyLink }, index) => (
              <React.Fragment key={`${index}-${id}`}>
                <span css={[titleStyles, rowTitleStyles]}>Name</span>
                <p css={paragraphStyle}>
                  <span>{name}</span>
                </p>
                <span css={[titleStyles, rowTitleStyles]}>Link</span>
                <span css={[paragraphStyle]}>
                  {studyLink ? (
                    <ExternalLink href={studyLink} label="Visit Study" />
                  ) : (
                    'No Link available'
                  )}
                </span>
              </React.Fragment>
            ))}
        </div>
      )}
    </div>
  </Card>
);

export default OutputCohortsCard;
