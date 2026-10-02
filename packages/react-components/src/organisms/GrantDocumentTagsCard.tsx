import { css } from '@emotion/react';

import { Card, Headline2, Paragraph } from '../atoms';
import { TagList } from '../molecules';
import { rem } from '../pixels';

const subtitleStyles = css({
  paddingTop: rem(24),
});

const tagsStyles = css({
  marginTop: rem(24),
});

type GrantDocumentTagsCardProps = {
  tags: ReadonlyArray<string>;
};

const GrantDocumentTagsCard: React.FC<GrantDocumentTagsCardProps> = ({
  tags,
}) => (
  <Card>
    <Headline2 styleAsHeading={3} noMargin>
      Tags
    </Headline2>
    <div css={subtitleStyles}>
      <Paragraph noMargin accent="lead">
        Explore keywords related to skills, techniques, resources, and tools.
      </Paragraph>
    </div>
    <div css={tagsStyles}>
      <TagList tags={tags} large perLine={{ desktop: 4, mobile: 2 }} />
    </div>
  </Card>
);

export default GrantDocumentTagsCard;
