import React from 'react';
import { css } from '@emotion/react';

import { TeamResponse } from '@asap-hub/model';

import { Divider, Headline3, Paragraph } from '../atoms';
import { rem } from '../pixels';
import TagList from './TagList';

const dividerStyles = css({
  marginTop: rem(24),
  marginBottom: rem(24),
});

const contentStyles = css({
  paddingTop: rem(32),
});

type TeamProfileTagsProps = {
  readonly tags: TeamResponse['tags'];
};

const TeamProfileTags: React.FC<TeamProfileTagsProps> = ({ tags }) => (
  <div>
    <div css={dividerStyles}>
      <Divider />
    </div>
    <Headline3 noMargin>Tags</Headline3>
    <Paragraph accent="tertiary" noMargin styles={css({ marginTop: rem(24) })}>
      Explore keywords related to skills, techniques, resources, and tools.
    </Paragraph>
    <div css={contentStyles}>
      <TagList tags={tags.map(({ name }) => name)} />
    </div>
  </div>
);

export default TeamProfileTags;
