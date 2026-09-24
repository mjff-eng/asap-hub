import { css } from '@emotion/react';

import {
  vminLinearCalc,
  mobileScreen,
  largeDesktopScreen,
  rem,
} from '../pixels';
import { colour } from '../colors';

const shadowWidth = 18;

const containerStyles = css({
  width: `calc(100% + ${rem(2 * shadowWidth)})`,
  overflowX: 'auto',

  margin: `0 ${rem(-shadowWidth)}`,
  display: 'grid',
  gridTemplateColumns: `${rem(shadowWidth)} max-content ${rem(shadowWidth)}`,
  '::before, ::after': {
    content: '""',
    position: 'sticky',
  },
  '::before': {
    left: 0,
    background: `linear-gradient(to left, rgba(255, 255, 255, 0) 0%, ${colour.neutral[0]} 100%)`,
  },
  '::after': {
    right: 0,
    background: `linear-gradient(to right, rgba(255, 255, 255, 0) 0%, ${colour.neutral[0]} 100%)`,
  },

  // Hide scrollbar on touch screens where our gradient indicator is sufficient.
  // Do not hide elsewhere, because the scrollbar may be required to actually perform scrolling.
  '@media (pointer: coarse)': {
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

const styles = css({
  display: 'flex',

  margin: 0,
  padding: 0,
  listStyle: 'none',

  '> li:not(:last-of-type)': {
    paddingRight: vminLinearCalc(
      mobileScreen,
      18,
      largeDesktopScreen,
      30,
      'px',
    ),
  },
});

type TabNavChildren =
  | React.ReactElement
  | ReadonlyArray<TabNavChildren | null | undefined | boolean>;
interface TabNavProps {
  readonly children: TabNavChildren;
}
const TabNav: React.FC<TabNavProps> = ({ children }) => (
  <nav css={containerStyles} aria-label="tabs">
    <ul css={styles}>
      {(
        (Array.isArray(children)
          ? children
          : [children]) as ReadonlyArray<React.ReactElement>
      )
        .flat(Number.POSITIVE_INFINITY)
        .filter((child) => child && typeof child === 'object')
        .map((child, index) => (
          <li key={index}>{child}</li>
        ))}
    </ul>
  </nav>
);

export default TabNav;
