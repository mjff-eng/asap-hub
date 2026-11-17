import { ReactNode } from 'react';

import { css } from '@emotion/react';
import { Card, Headline2 } from '../atoms';
import RichText from './RichText';
import { ExpandableText } from '../molecules';
import { rem } from '../pixels';

const contentStyles = css({
  marginTop: rem(24),
  'p:first-of-type': { marginTop: 0 },
  'p:last-of-type': { marginBottom: 0 },
});

const Content: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={contentStyles}>{children}</div>
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
    <Headline2 noMargin styleAsHeading={5}>
      {title}
    </Headline2>
    <Content>
      {collapsible ? (
        <ExpandableText toggleMarginTop={22} variant="arrow">
          <RichText text={text} />
        </ExpandableText>
      ) : (
        <RichText text={text} />
      )}
    </Content>
  </Card>
);

export default RichTextCard;
