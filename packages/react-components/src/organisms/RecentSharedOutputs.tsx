import { EventResponse, gp2, ResearchOutputResponse } from '@asap-hub/model';
import { sharedResearch } from '@asap-hub/routing';
import { css } from '@emotion/react';
import type { EmotionJSX } from '@emotion/react/types/jsx-namespace';

import { Card, Link } from '../atoms';
import { formatDateToTimezone } from '../date';
import { rem, tabletScreen } from '../pixels';
import { colour } from '../colors';

const container = css({
  display: 'grid',
  color: colour.foreground.tertiary,
});

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    borderBottom: 0,
    marginBottom: 0,
    paddingBottom: rem(15),
  },
});

const rowTitleStyles = css({
  paddingTop: rem(33),
  paddingBottom: rem(15),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const rowStyles = css({
  display: 'grid',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  paddingBottom: rem(21),
  marginBottom: rem(21),
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '3fr 2fr 2fr',
    columnGap: rem(15),
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

const getSharedOutputHrefCRN = (id: string) =>
  sharedResearch({}).researchOutput({
    researchOutputId: id,
  }).$;

type RecentSharedOutputProp<
  T extends
    | EventResponse['relatedResearch']
    | gp2.OutputResponse['relatedOutputs'],
> = {
  outputs?: ResearchOutputResponse[] | gp2.OutputBaseResponse[];
  getIconForDocumentType: (
    documentType: T[number]['documentType'],
  ) => EmotionJSX.Element;
  getSharedOutputHref?: (id: string) => string;
  tableTitles?: [string, string, string];
};

const RecentSharedOutputs = <
  T extends
    | EventResponse['relatedResearch']
    | gp2.OutputResponse['relatedOutputs'],
>({
  outputs,
  getIconForDocumentType,
  getSharedOutputHref = getSharedOutputHrefCRN,
  tableTitles = ['Shared Output', 'Type of Output', 'Date Added'],
}: RecentSharedOutputProp<T>) => (
  <Card>
    <div css={container}>
      <div css={[rowStyles, gridTitleStyles]}>
        {tableTitles.map((title) => (
          <span key={title} css={titleStyles}>
            {title}
          </span>
        ))}
      </div>
      {outputs &&
        outputs.map(({ id, documentType, addedDate, title, created }) => (
          <div key={id} css={[rowStyles]}>
            <span css={[titleStyles, rowTitleStyles]}>{tableTitles[0]}</span>
            <Link ellipsed href={getSharedOutputHref(id)}>
              {title}
            </Link>
            <span css={[titleStyles, rowTitleStyles]}>{tableTitles[1]}</span>
            <p css={paragraphStyle}>
              {getIconForDocumentType(documentType)} {documentType}
            </p>
            <span css={[titleStyles, rowTitleStyles]}>{tableTitles[2]}</span>
            <span>
              {formatDateToTimezone(
                addedDate || created,
                'E, d MMM y',
              ).toUpperCase()}
            </span>
          </div>
        ))}
    </div>
  </Card>
);

export default RecentSharedOutputs;
