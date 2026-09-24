/** @jsxImportSource @emotion/react */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { css } from '@emotion/react';

import {
  rem,
  tabletScreen,
  vminLinearCalc,
  mobileScreen,
  largeDesktopScreen,
} from '../pixels';
import { colour } from '../colors';
import {
  firstPageIcon,
  nextPageIcon,
  previousPageIcon,
  lastPageIcon,
} from '../icons';
import { Anchor } from '../atoms';

const containerStyles = css({
  display: 'flex',
  justifyContent: 'center',
});
const listStyles = css({
  margin: 0,
  padding: rem(12),
  border: `${rem(1)} solid ${colour.border.tertiary}`,
  borderRadius: rem(6),

  display: 'grid',
  gridAutoFlow: 'column',
  gridTemplateRows: rem(30),
  gridAutoColumns: rem(30),
  gridGap: vminLinearCalc(mobileScreen, 6, largeDesktopScreen, 12, 'px'),

  backgroundColor: colour.neutral[0],
});

const itemStyles = css({
  display: 'contents',

  '::before': {
    justifySelf: 'center',
    alignSelf: 'center',

    color: colour.foreground.tertiary,
  },

  '&.follows-gap::before': {
    content: '"..."',
  },

  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    '&.wide-screen-only': {
      display: 'none',
    },
    '&.wide-screen-only + :not(.wide-screen-only)::before': {
      content: '"..."',
    },
  },
});

const textStyles = css({
  height: '100%',
  display: 'grid',
  justifyContent: 'center',
  alignContent: 'center',

  color: colour.foreground.tertiary,
  svg: {
    stroke: colour.foreground.brand,
    verticalAlign: 'middle',
  },
});
const activeTextStyles = css({
  backgroundColor: colour.background.active,
  color: colour.foreground.brand,
});
const disabledTextStyles = css({
  svg: {
    stroke: colour.foreground.disabled,
  },
});

// Helper function to create sliding windows over an array
function* aperture<T>(n: number, arr: T[]): Generator<T[]> {
  for (let i = 0; i <= arr.length - n; i += 1) {
    yield arr.slice(i, i + n);
  }
}

interface PageNumber {
  index: number;
  wideScreenOnly?: boolean;
  followsGap?: boolean;
}
function* optimizeGaps(pageNumbers: PageNumber[]): Generator<PageNumber> {
  if (pageNumbers.length < 2) {
    for (const p of pageNumbers) yield p;
    return;
  }

  yield pageNumbers[0]!;

  for (const pair of aperture(2, pageNumbers)) {
    const prev = pair[0]!;
    const curr = pair[1]!;
    // No point in leaving a gap of 1 if we can just render the number instead of the ellipsis
    if (prev.index + 1 === curr.index - 1) {
      yield {
        index: curr.index - 1,
        // If one of the adjacent pages is only for wide screens, this filler should be too
        wideScreenOnly: prev.wideScreenOnly || curr.wideScreenOnly,
      };
    }

    yield {
      ...curr,
      followsGap: prev.index + 1 < curr.index - 1,
    };
  }
}
function* makeFillersMandatory(
  pageNumbers: PageNumber[],
): Generator<PageNumber> {
  if (pageNumbers.length < 3) {
    for (const p of pageNumbers) yield p;
    return;
  }

  yield pageNumbers[0]!;
  for (const triple of aperture(3, pageNumbers)) {
    const prev = triple[0]!;
    const curr = triple[1]!;
    const next = triple[2]!;
    if (
      prev.index + 1 === curr.index &&
      curr.index === next.index - 1 &&
      !prev.wideScreenOnly &&
      !next.wideScreenOnly
    ) {
      // No point in leaving a gap of 1 on narrow screens if we can just render the number instead of the ellipsis
      yield {
        ...curr,
        wideScreenOnly: false,
      };
    } else {
      yield curr;
    }
  }
  yield pageNumbers[pageNumbers.length - 1]!;
}

interface PageControlsProps {
  numberOfPages: number;
  currentPageIndex: number;
  renderPageHref: (index: number) => string;
}
const PageControls: React.FC<PageControlsProps> = ({
  numberOfPages,
  currentPageIndex,
  renderPageHref,
}) => {
  if (currentPageIndex < 0) {
    throw new Error(
      `Current index must not be negative. Received current page index: ${currentPageIndex}.`,
    );
  }
  if (currentPageIndex >= numberOfPages) {
    throw new Error(
      `Current index must be less than number of pages. Received number of pages: ${numberOfPages}. Received current page index: ${currentPageIndex}.`,
    );
  }

  const firstPageIndex = 0;
  const lastPageIndex = numberOfPages - 1;
  const [firstPageHref, previousPageHref] =
    currentPageIndex === firstPageIndex
      ? []
      : [renderPageHref(firstPageIndex), renderPageHref(currentPageIndex - 1)];
  const [nextPageHref, lastPageHref] =
    currentPageIndex === lastPageIndex
      ? []
      : [renderPageHref(currentPageIndex + 1), renderPageHref(lastPageIndex)];

  const desiredPages: PageNumber[] = [
    { index: firstPageIndex },
    { index: currentPageIndex - 1, wideScreenOnly: true },
    { index: currentPageIndex },
    { index: currentPageIndex + 1, wideScreenOnly: true },
    { index: lastPageIndex },
  ]
    .filter(({ index }) => index >= 0 && index < numberOfPages)
    .sort((a, b) => {
      // First sort by index
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      // Then sort wideScreenOnly to the back so that uniq does not lose mandatory pages
      const aWide = a.wideScreenOnly ? 1 : 0;
      const bWide = b.wideScreenOnly ? 1 : 0;
      return aWide - bWide;
    })
    .filter(
      (page, index, arr) =>
        // Remove duplicates by index, keeping the first occurrence
        index === arr.findIndex((p) => p.index === page.index),
    );

  const shownPages = Array.from(
    makeFillersMandatory(Array.from(optimizeGaps(desiredPages)) || []),
  );

  return (
    <nav css={containerStyles}>
      <ol css={listStyles}>
        <li css={itemStyles}>
          <Anchor href={firstPageHref}>
            <span css={[textStyles, firstPageHref ?? disabledTextStyles]}>
              {firstPageIcon}
            </span>
          </Anchor>
        </li>
        <li css={itemStyles}>
          <Anchor href={previousPageHref}>
            <span css={[textStyles, previousPageHref ?? disabledTextStyles]}>
              {previousPageIcon}
            </span>
          </Anchor>
        </li>
        {shownPages.map(({ index, followsGap, wideScreenOnly }) => {
          const active = index === currentPageIndex;
          return (
            <li
              key={index}
              css={itemStyles}
              className={[
                followsGap ? 'follows-gap' : '',
                wideScreenOnly ? 'wide-screen-only' : '',
              ].join(' ')}
            >
              <Anchor href={renderPageHref(index)}>
                <span css={[textStyles, active && activeTextStyles]}>
                  {index + 1}
                </span>
              </Anchor>
            </li>
          );
        })}
        <li css={itemStyles}>
          <Anchor href={nextPageHref}>
            <span css={[textStyles, nextPageHref ?? disabledTextStyles]}>
              {nextPageIcon}
            </span>
          </Anchor>
        </li>
        <li css={itemStyles}>
          <Anchor href={lastPageHref}>
            <span css={[textStyles, lastPageHref ?? disabledTextStyles]}>
              {lastPageIcon}
            </span>
          </Anchor>
        </li>
      </ol>
    </nav>
  );
};

export default PageControls;
