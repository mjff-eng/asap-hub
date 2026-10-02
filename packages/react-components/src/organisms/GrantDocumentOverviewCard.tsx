import { css } from '@emotion/react';

import { Card, Headline2, Markdown, Paragraph } from '../atoms';
import { rem } from '../pixels';
import RichText from './RichText';

const textStyles = css({
  paddingTop: rem(24),
});

// Markdown and RichText paragraphs bring their own 12px top margin
const formattedStyles = css({
  paddingTop: rem(12),
});

type GrantDocumentOverviewCardProps =
  | { text: string }
  | { description: string; descriptionMD: string };

const GrantDocumentOverviewCard: React.FC<GrantDocumentOverviewCardProps> = (
  props,
) => (
  <Card>
    <Headline2 styleAsHeading={3} noMargin>
      Overview
    </Headline2>
    {'text' in props ? (
      <div css={textStyles}>
        <Paragraph noMargin accent="lead">
          {props.text}
        </Paragraph>
      </div>
    ) : (
      <div css={formattedStyles}>
        <Markdown value={props.descriptionMD} toc></Markdown>
        {!props.descriptionMD && <RichText toc text={props.description} />}
      </div>
    )}
  </Card>
);

export default GrantDocumentOverviewCard;
