import { GrantType, ResearchOutputGrant } from '@asap-hub/model';
import { sharedResearch } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Card, Headline2, Link, Paragraph, Subtitle } from '../atoms';
import { steel } from '../colors';
import { formatProjectDate } from '../date';
import { mobileScreen, rem } from '../pixels';

type GrantDocumentGrantsCardProps = {
  grantType: GrantType;
  original: ResearchOutputGrant;
  supplement: ResearchOutputGrant;
};

const subtitleStyles = css({
  marginTop: rem(16),
});

const grantsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  marginTop: rem(24),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    gap: rem(36),
    paddingBottom: rem(24),
    '& > * + *': {
      borderTop: `1px solid ${steel.rgb}`,
      paddingTop: rem(36),
    },
  },
});

const grantRowStyles = css({
  display: 'grid',
  gridTemplateColumns: `1fr ${rem(168)}`,
  columnGap: rem(48),
  rowGap: rem(24),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    gridTemplateColumns: '1fr',
  },
});

const grantFieldStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
});

const GrantRow: React.FC<{
  label: string;
  grant: ResearchOutputGrant;
  linked: boolean;
}> = ({
  label,
  grant: { researchOutputId, title, startDate, endDate },
  linked,
}) => (
  <div css={grantRowStyles}>
    <div css={grantFieldStyles}>
      <Subtitle noMargin>{label}</Subtitle>
      <Paragraph noMargin accent="lead">
        {linked && researchOutputId ? (
          <Link
            href={sharedResearch({}).researchOutput({ researchOutputId }).$}
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </Paragraph>
    </div>
    {startDate && (
      <div css={grantFieldStyles}>
        <Subtitle noMargin>Grant Period</Subtitle>
        <Paragraph noMargin accent="lead">
          {`${formatProjectDate(startDate)} - ${
            endDate ? formatProjectDate(endDate) : 'Present'
          }`}
        </Paragraph>
      </div>
    )}
  </div>
);

const GrantDocumentGrantsCard: React.FC<GrantDocumentGrantsCardProps> = ({
  grantType,
  original,
  supplement,
}) => (
  <Card>
    <Headline2 styleAsHeading={3} noMargin>
      Grants
    </Headline2>
    <div css={subtitleStyles}>
      <Paragraph noMargin accent="lead">
        Explore all the details about grants.
      </Paragraph>
    </div>
    <div css={grantsStyles}>
      <GrantRow
        label="Supplement Grant Name"
        grant={supplement}
        linked={grantType === 'original'}
      />
      <GrantRow
        label="Original Grant Name"
        grant={original}
        linked={grantType === 'supplement'}
      />
    </div>
  </Card>
);

export default GrantDocumentGrantsCard;
