import { css } from '@emotion/react';
import { ReactNode, useState } from 'react';

import { Button, Card, Headline3, Link, Paragraph, Pill } from '../atoms';
import { colour } from '../colors';
import { ResponsiveTable, ResponsiveTableColumn } from '../molecules';
import { rem } from '../pixels';

const TRUNCATE_FROM = 5;

const containerStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const descriptionStyles = css({
  marginTop: rem(16),
  marginBottom: rem(24),
});

const sourceStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  minWidth: 0,
});

const sourceIconStyles = css({
  display: 'inline-flex',
  flexShrink: 0,
  height: rem(24),
});

const typeStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: rem(8),
});

const showMoreStyles = css({
  display: 'flex',
  justifyContent: 'center',
  padding: `${rem(16)} 0`,
  borderTop: `1px solid ${colour.border.tertiary}`,
});

export type EventRelatedResearchItem = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly documentType: string;
  readonly type?: string;
  readonly source?: {
    readonly title: string;
    readonly href?: string;
    readonly icon?: ReactNode;
  };
};

const columns: ReadonlyArray<ResponsiveTableColumn<EventRelatedResearchItem>> =
  [
    {
      key: 'output',
      title: 'Output',
      width: '40%',
      render: ({ title, href }) => (
        <Link ellipsed href={href}>
          {title}
        </Link>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      width: '30%',
      render: ({ documentType, type }) => (
        <span css={typeStyles}>
          {documentType}
          {documentType === 'Article' && type && (
            <Pill accent="gray" noMargin>
              {type}
            </Pill>
          )}
        </span>
      ),
    },
    {
      key: 'from',
      title: 'From',
      width: '30%',
      render: ({ source }) =>
        source ? (
          <span css={sourceStyles}>
            {source.icon && <span css={sourceIconStyles}>{source.icon}</span>}
            {source.href ? (
              <Link ellipsed href={source.href}>
                {source.title}
              </Link>
            ) : (
              source.title
            )}
          </span>
        ) : undefined,
    },
  ];

type EventRelatedResearchCardProps = {
  readonly relatedResearch: ReadonlyArray<EventRelatedResearchItem>;
};

const EventRelatedResearchCard: React.FC<EventRelatedResearchCardProps> = ({
  relatedResearch,
}) => {
  const [showMore, setShowMore] = useState(false);
  const displayShowMoreButton = relatedResearch.length > TRUNCATE_FROM;

  return (
    <Card padding={false}>
      <div css={containerStyles}>
        <Headline3 styleAsHeading={5} noMargin>
          Related Research
        </Headline3>
        <div css={descriptionStyles}>
          <Paragraph accent="tertiary" noMargin>
            Find all shared research outputs related to this event.
          </Paragraph>
        </div>
        {relatedResearch.length === 0 ? (
          <Paragraph noMargin accent="tertiary">
            <b>No related research available.</b>
          </Paragraph>
        ) : (
          <ResponsiveTable
            columns={columns}
            rows={relatedResearch.slice(
              0,
              showMore ? undefined : TRUNCATE_FROM,
            )}
            getRowKey={({ id }) => id}
            getToggleLabel={({ title }, expanded) =>
              `${expanded ? 'Hide' : 'Show'} details for ${title}`
            }
            testId="event-related-research"
          />
        )}
      </div>
      {displayShowMoreButton && (
        <div css={showMoreStyles}>
          <Button linkStyle onClick={() => setShowMore(!showMore)}>
            View {showMore ? 'Less' : 'More'} Outputs
          </Button>
        </div>
      )}
    </Card>
  );
};

export default EventRelatedResearchCard;
