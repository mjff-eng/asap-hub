import { css } from '@emotion/react';
import { tags as tagsRoute } from '@asap-hub/routing';

import { rem } from '../pixels';
import { Tag } from '../atoms';

const listStyles = css({
  padding: 0,
  margin: 0,

  listStyle: 'none',

  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  rowGap: rem(12),
  alignItems: 'center',

  '> .overflow': {
    display: 'none', // can later be activated by previous list items
  },
});

const normalListItemStyles = css({
  ':not(:nth-last-of-type(1))': {
    paddingRight: rem(12),
  },
});

const centerListStyles = css({
  justifyContent: 'center',
  gap: rem(15),
});

const centredItemStyles = css({
  ':not(:nth-last-of-type(1))': {
    paddingRight: 0,
  },
});

const summarizedListItemStyles = (max: number) =>
  css({
    counterIncrement: 'tags -1',
    [`:nth-of-type(n + ${max + 1})`]: {
      display: 'none',
      '~ .overflow': {
        display: 'unset',
      },
    },
  });

const overflowContentStyles = css({
  '::after': {
    content: '"+" counter(tags)',
  },
});

const SAFARI_MAX_SAFE_INTEGER = 2 ** 31 - 2;
interface TagListProps {
  tags: ReadonlyArray<string>;
  enabled?: boolean;
  max?: number;
  centerContent?: boolean;
  noMargin?: boolean;
  large?: boolean;
}

const TagList: React.FC<TagListProps> = ({
  tags,
  max = SAFARI_MAX_SAFE_INTEGER,
  enabled = true,
  centerContent = false,
  noMargin = false,
  large = false,
}) =>
  tags.length ? (
    <ul
      css={[
        listStyles,
        { counterReset: `tags ${tags.length}` },
        centerContent && centerListStyles,
        noMargin && { margin: 0 },
      ]}
    >
      {tags.map((tag, index) => (
        <li
          key={index}
          css={[
            normalListItemStyles,
            summarizedListItemStyles(max),
            centerContent && centredItemStyles,
          ]}
        >
          <Tag
            title={tag}
            href={tagsRoute({ tag }).$}
            enabled={enabled}
            large={large}
          >
            {tag}
          </Tag>
        </li>
      ))}
      <li key="overflow" className="overflow">
        <Tag enabled={enabled}>
          <span css={overflowContentStyles}></span>
        </Tag>
      </li>
    </ul>
  ) : null;

export default TagList;
