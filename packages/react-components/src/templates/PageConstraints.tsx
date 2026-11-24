import { css, SerializedStyles } from '@emotion/react';
import { ReactNode } from 'react';
import { pageContainerStyles, pageContentContainerStyles } from '../layout';

import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  flexFlow: 'column',
  padding: `${rem(48)} 0`,
});

const noPaddingBottomStyles = css({
  paddingBottom: 0,
});

const noPaddingTopStyles = css({
  paddingTop: 0,
});

export type PageWidth = 'container' | 'content';

type PageConstraintsProps = {
  children: ReactNode;
  as?: 'header' | 'main' | 'div' | 'article';
  noPaddingBottom?: boolean;
  noPaddingTop?: boolean;
  unconstrainedStyles?: SerializedStyles;
  /**
   * `container` fills the page grid: detail pages, tables, dashboards,
   * charts and tile grids. `content` is at most 900px wide and centred:
   * search and directory lists.
   */
  width?: PageWidth;
};

/**
 * A layout component that provides consistent page-width constraints and horizontal
 * padding across different screen sizes.
 *
 * Use `PageConstraints` to create consistent layout boundaries for page sections.
 * The side margins and max width follow the CRN page grid of the CAS Design
 * System at each breakpoint (see cas-layout.ts), so content sections line up
 * across pages.
 */
const PageConstraints: React.FC<PageConstraintsProps> = ({
  children,
  as: Component = 'div',
  noPaddingBottom,
  noPaddingTop,
  unconstrainedStyles,
  width = 'container',
}) => (
  <Component
    css={css([
      containerStyles,
      noPaddingTop && noPaddingTopStyles,
      noPaddingBottom && noPaddingBottomStyles,
      unconstrainedStyles,
    ])}
  >
    <div
      css={
        width === 'content'
          ? pageContentContainerStyles.crn
          : pageContainerStyles.crn
      }
    >
      {children}
    </div>
  </Component>
);

export default PageConstraints;
