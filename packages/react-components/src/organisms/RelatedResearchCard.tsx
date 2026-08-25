import { EventResponse, gp2 } from '@asap-hub/model';
import { gp2 as gp2Routing, network, sharedResearch } from '@asap-hub/routing';
import { css } from '@emotion/react';
import type { EmotionJSX } from '@emotion/react/types/jsx-namespace';
import { useState } from 'react';

import { Button, Card, Headline3, Link, Paragraph, Pill } from '../atoms';
import { charcoal, neutral900, neutral500 } from '../colors';
import { rem, tabletScreen } from '../pixels';

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
  paddingTop: rem(32),
  paddingBottom: rem(16),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const rowStyles = css({
  display: 'grid',
  paddingTop: rem(20),
  paddingBottom: rem(20),
  borderBottom: `1px solid ${neutral500.rgb}`,
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1.2fr 0.8fr',
    columnGap: rem(15),
    paddingTop: rem(0),
    paddingBottom: rem(16),
    borderBottom: 'none',
  },
});

const rowDivider = css({
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    paddingTop: rem(16),
    borderBottom: `1px solid ${neutral500.rgb}`,
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
  borderTop: `1px solid ${neutral500.rgb}`,
});

const titleStyles = css({ fontWeight: 'bold', color: charcoal.rgb });

const iconStyles = css({
  verticalAlign: 'middle',
  display: 'inline-block',
  height: rem(24),
  marginRight: rem(9),
});

type RelatedResearchCardProp<
  T extends
    | EventResponse['relatedResearch']
    | gp2.OutputResponse['relatedOutputs'],
> = {
  description: string;
  relatedResearch: T;
  title?: string;
  getIconForDocumentType: (
    documentType: T[number]['documentType'],
  ) => EmotionJSX.Element;
  getSourceIcon?: (source: gp2.OutputOwner['type']) => EmotionJSX.Element;
  tableTitles?: [string, string, string];
};

const RelatedResearchCard = <
  T extends
    | EventResponse['relatedResearch']
    | gp2.OutputResponse['relatedOutputs'],
>({
  relatedResearch,
  description,
  getSourceIcon,
  getIconForDocumentType,
  title = 'Related Research',
  tableTitles = [
    'Document Type',
    'Shared Output Name',
    'Team or Working Group',
  ],
}: RelatedResearchCardProp<T>) => {
  const truncateFrom = 5;
  const [showMore, setShowMore] = useState(false);
  const displayShowMoreButton = relatedResearch.length > 3;

  return (
    <Card padding={false}>
      <div
        css={[
          container,
          ...(displayShowMoreButton ? [{ paddingBottom: 0 }] : []),
        ]}
      >
        <Headline3 noMargin>{title}</Headline3>
        <div css={descriptionStyles}>
          <Paragraph accent="neutral900" noMargin>
            {description}
          </Paragraph>
        </div>
        {relatedResearch.length === 0 ? (
          <Paragraph noMargin accent="neutral900">
            <b>No related research available.</b>
          </Paragraph>
        ) : (
          <>
            <div css={[rowStyles, gridTitleStyles]}>
              {tableTitles.map((headerTitle) => (
                <span key={headerTitle} css={titleStyles}>
                  {headerTitle}
                </span>
              ))}
            </div>
            {relatedResearch
              .slice(0, showMore ? undefined : truncateFrom)
              .map(
                ({ id, documentType, title: outputTitle, type, ...output }) => (
                  <div key={id} css={[rowStyles, rowDivider]}>
                    <span css={[titleStyles, rowTitleStyles]}>
                      {tableTitles[0]}
                    </span>
                    <p css={paragraphStyle}>
                      {getIconForDocumentType(documentType)} {documentType}{' '}
                      {documentType === 'Article' && (
                        <Pill accent="gray">{type}</Pill>
                      )}
                    </p>
                    <span css={[titleStyles, rowTitleStyles]}>
                      {tableTitles[1]}
                    </span>
                    <p css={paragraphStyle}>
                      <Link
                        ellipsed
                        href={
                          'teams' in output
                            ? sharedResearch({}).researchOutput({
                                researchOutputId: id,
                              }).$
                            : gp2Routing.outputs({}).output({ outputId: id }).$
                        }
                      >
                        {outputTitle}
                      </Link>
                    </p>
                    <span css={[titleStyles, rowTitleStyles]}>
                      {tableTitles[2]}
                    </span>
                    {'teams' in output ? (
                      <p css={paragraphStyle}>
                        {output.workingGroups?.length ? (
                          <Link
                            ellipsed
                            href={
                              network({}).workingGroups({}).workingGroup({
                                workingGroupId: output.workingGroups[0].id,
                              }).$
                            }
                          >
                            {output.workingGroups[0].title}
                          </Link>
                        ) : output.teams.length > 1 ? (
                          'Multiple teams'
                        ) : (
                          output.teams[0] && (
                            <Link
                              ellipsed
                              href={
                                network({}).teams({}).team({
                                  teamId: output.teams[0].id,
                                }).$
                              }
                            >
                              {output.teams[0].displayName}
                            </Link>
                          )
                        )}
                      </p>
                    ) : (
                      output.entity &&
                      getSourceIcon && (
                        <div css={paragraphStyle}>
                          <div css={iconStyles}>
                            {getSourceIcon(output.entity?.type)}
                          </div>
                          <Link
                            ellipsed
                            href={
                              output.entity?.type === 'WorkingGroups'
                                ? gp2Routing.workingGroups({}).workingGroup({
                                    workingGroupId: output.entity.id,
                                  }).$
                                : gp2Routing.projects({}).project({
                                    projectId: output.entity.id,
                                  }).$
                            }
                          >
                            {output.entity.title}
                          </Link>
                        </div>
                      )
                    )}
                  </div>
                ),
              )}
          </>
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

export default RelatedResearchCard;
