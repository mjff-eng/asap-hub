import { css } from '@emotion/react';
import { rem, tabletScreen } from '../pixels';
import { neutral900, neutral1000, colour } from '../colors';

export const descriptionContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
  justifyContent: 'flex-start',
  minWidth: 0,
});

export const mobileLabelStyles = css({
  fontSize: rem(17),
  fontWeight: 'bold',
  color: neutral1000.rgb,
  display: 'none',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'block',
  },
});

export const clampedDescriptionStyles = (isExpanded: boolean) =>
  css({
    color: neutral900.rgb,
    fontSize: rem(17),
    lineHeight: rem(24),
    margin: 0,
    ...(isExpanded
      ? {}
      : {
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }),
  });

export const readMoreButtonStyles = css({
  background: 'none',
  border: 'none',
  color: colour.brand.crn[500].rgb,
  cursor: 'pointer',
  padding: 0,
  fontSize: rem(17),
  fontWeight: 400,
  display: 'inline',
  textAlign: 'left',
  marginTop: rem(4),
  '&:hover': {
    textDecoration: 'underline',
  },
});

export const statusContainerStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  paddingBlock: rem(4),
  paddingLeft: rem(8),
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    flexDirection: 'column',
    paddingBlock: 0,
    paddingLeft: 0,
    gap: rem(16),
  },
});

// Shared article styles used by Milestone and ArticlesList components.

export const articlesHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: rem(12),
  marginBottom: rem(8),
});

export const articlesSeparatorStyles = css({
  color: neutral900.rgb,
  fontSize: rem(14),
});

export const articlesIconButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: 0,
  minWidth: 'auto',
  gap: rem(16),
  textDecoration: 'none',
  ':hover, :active, :focus': {
    textDecoration: 'none',
  },
});

export const articlesTitleStyles = css({
  fontSize: rem(17),
  color: neutral900.rgb,
  lineHeight: rem(26),
});

export const articlesIconStyles = css({
  display: 'flex',
});

export const articlesListWrapperStyles = (
  maxHeight: string,
  maxWidth?: string,
) =>
  css({
    maxHeight,
    ...(maxWidth ? { maxWidth } : {}),
    paddingRight: rem(4),
    overflowY: 'auto',
    overflowX: 'hidden',
  });

export const articlesListStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: rem(4),
  marginLeft: rem(36),
});

export const articlesItemStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  padding: `${rem(4)} 0`,
});

export const articlesItemIconStyles = css({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  width: rem(24),
  height: rem(24),
});

export const articlesItemTextContainerStyles = css({
  flex: 1,
  minWidth: 0,
  paddingRight: rem(12),
});

export const articlesItemLinkStyles = css({
  fontSize: rem(17),
  lineHeight: rem(24),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
});

export const noArticlesTextStyles = css({
  fontStyle: 'italic',
  fontSize: rem(17),
  lineHeight: rem(26),
  color: neutral900.rgb,
});

export const editButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: 0,
  minWidth: 'auto',
  gap: rem(16),
  textDecoration: 'none',
  ':hover, :active, :focus': {
    textDecoration: 'none',
  },
});

export const articlesWrapperStyles = css({
  marginTop: rem(4),
});

type StatusValue = 'Complete' | 'In Progress' | 'Pending' | 'Terminated';

export const getStatusAccent = (
  status: StatusValue,
): 'success' | 'info' | 'neutral' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'Complete':
      return 'success';
    case 'In Progress':
      return 'info';
    case 'Pending':
      return 'neutral';
    case 'Terminated':
      return 'error';
    default:
      return 'default';
  }
};
