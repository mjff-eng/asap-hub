import { ReactNode } from 'react';

import { css } from '@emotion/react';
import { Card, Headline2 } from '../atoms';
import RichText from './RichText';
import { ExpandableText } from '../molecules';
import { rem } from '../pixels';

const staticContentStyles = css({ marginTop: rem(24) });

const StaticContent: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={staticContentStyles}>{children}</div>
);

type RichTextCardProps = {
  readonly title: string;
  readonly text: string;
  readonly collapsible?: boolean;
};
const RichTextCard: React.FC<RichTextCardProps> = ({
  title,
  text,
  collapsible = false,
}) => (
  <Card>
    <Headline2 noMargin styleAsHeading={3}>
      {title}
    </Headline2>
    {collapsible ? (
      <ExpandableText toggleMarginTop={12} variant="arrow">
        <RichText text={text} />
      </ExpandableText>
    ) : (
      <StaticContent>
        <RichText text={text} />
      </StaticContent>
    )}
  </Card>
);

export default RichTextCard;
