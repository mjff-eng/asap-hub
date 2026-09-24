import { render, RenderResult } from '@testing-library/react';
import {
  mockConsoleError,
  findParentWithStyle,
} from '@asap-hub/dom-test-utils';
import fc from 'fast-check';

import PageControls from '../PageControls';
import { colour, colorFromHex } from '../../colors';

mockConsoleError();

const renderPageHref = (page: number) => `#${page}`;

it('rejects a negative index', () => {
  expect(() =>
    render(
      <PageControls
        numberOfPages={1}
        currentPageIndex={-1}
        renderPageHref={renderPageHref}
      />,
    ),
  ).toThrow(/index.+-1/i);
});

it('rejects an index beyond the existing pages', () => {
  expect(() =>
    render(
      <PageControls
        numberOfPages={1}
        currentPageIndex={1}
        renderPageHref={renderPageHref}
      />,
    ),
  ).toThrow(/index.+1/i);
});

describe('the arrow controls', () => {
  it('contain a link to the first page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={2}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/first page/i), 'stroke')?.stroke?.replace(
        / /g,
        '',
      ),
    ).toBe(colorFromHex(colour.brand.crn[500]).rgba.replace(/ /g, ''));
    expect(getByTitle(/first page/i).closest('a')).toHaveAttribute(
      'href',
      '#0',
    );
  });
  it('disable the link to the first page on the first page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={0}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/first page/i), 'stroke')?.stroke,
    ).toBe(colour.neutral[200]);
    expect(getByTitle(/first page/i).closest('a')).not.toHaveAttribute('href');
  });

  it('contain a link to the previous page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={2}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(
        getByTitle(/previous page/i),
        'stroke',
      )?.stroke?.replace(/ /g, ''),
    ).toBe(colorFromHex(colour.brand.crn[500]).rgba.replace(/ /g, ''));
    expect(getByTitle(/previous page/i).closest('a')).toHaveAttribute(
      'href',
      '#1',
    );
  });
  it('disable the link to the previous page on the first page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={0}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/previous page/i), 'stroke')?.stroke,
    ).toBe(colour.neutral[200]);
    expect(getByTitle(/previous page/i).closest('a')).not.toHaveAttribute(
      'href',
    );
  });

  it('contain a link to the next page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={0}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/next page/i), 'stroke')?.stroke?.replace(
        / /g,
        '',
      ),
    ).toBe(colorFromHex(colour.brand.crn[500]).rgba.replace(/ /g, ''));
    expect(getByTitle(/next page/i).closest('a')).toHaveAttribute('href', '#1');
  });
  it('disable the link to the next page on the last page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={2}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/next page/i), 'stroke')?.stroke,
    ).toBe(colour.neutral[200]);
    expect(getByTitle(/next page/i).closest('a')).not.toHaveAttribute('href');
  });

  it('contain a link to the last page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={0}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/last page/i), 'stroke')?.stroke?.replace(
        / /g,
        '',
      ),
    ).toBe(colorFromHex(colour.brand.crn[500]).rgba.replace(/ /g, ''));
    expect(getByTitle(/last page/i).closest('a')).toHaveAttribute('href', '#2');
  });
  it('disable the link to the last page on the last page', () => {
    const { getByTitle } = render(
      <PageControls
        numberOfPages={3}
        currentPageIndex={2}
        renderPageHref={renderPageHref}
      />,
    );
    expect(
      findParentWithStyle(getByTitle(/last page/i), 'stroke')?.stroke,
    ).toBe(colour.neutral[200]);
    expect(getByTitle(/last page/i).closest('a')).not.toHaveAttribute('href');
  });
});

describe('the page numbers', () => {
  const numPagesAndCurrPageIndex = fc
    .tuple(fc.integer(1, 100), fc.integer(0, 99))
    .filter(([numPages, currPageIndex]) => numPages !== currPageIndex)
    .map(([numPages, currPageIndex]) =>
      numPages > currPageIndex
        ? [numPages, currPageIndex]
        : [currPageIndex, numPages],
    );

  let result!: RenderResult;
  beforeEach(() => {
    result = render(
      <PageControls
        numberOfPages={1}
        currentPageIndex={0}
        renderPageHref={renderPageHref}
      />,
    );
  });

  it('always include the first page', async () => {
    fc.assert(
      fc.property(
        numPagesAndCurrPageIndex,
        ([numberOfPages, currentPageIndex]) => {
          result.rerender(
            <PageControls
              numberOfPages={numberOfPages!}
              currentPageIndex={currentPageIndex!}
              renderPageHref={renderPageHref}
            />,
          );
          expect(result.getByText('1', { exact: true })).toBeVisible();
        },
      ),
      { interruptAfterTimeLimit: 500 },
    );
  });

  it('always include the last page', async () => {
    fc.assert(
      fc.property(
        numPagesAndCurrPageIndex,
        ([numberOfPages, currentPageIndex]) => {
          result.rerender(
            <PageControls
              numberOfPages={numberOfPages!}
              currentPageIndex={currentPageIndex!}
              renderPageHref={renderPageHref}
            />,
          );
          expect(
            result.getByText(String(numberOfPages), { exact: true }),
          ).toBeVisible();
        },
      ),
      { interruptAfterTimeLimit: 500 },
    );
  });

  it('always include the current page', async () => {
    fc.assert(
      fc.property(
        numPagesAndCurrPageIndex,
        ([numberOfPages, currentPageIndex]) => {
          result.rerender(
            <PageControls
              numberOfPages={numberOfPages!}
              currentPageIndex={currentPageIndex!}
              renderPageHref={renderPageHref}
            />,
          );
          expect(
            result.getByText(String(currentPageIndex! + 1), { exact: true }),
          ).toBeVisible();
        },
      ),
      { interruptAfterTimeLimit: 500 },
    );
  });
});

it('highlights the active page number', () => {
  const { getByText } = render(
    <PageControls
      numberOfPages={9}
      currentPageIndex={5 - 1}
      renderPageHref={renderPageHref}
    />,
  );
  expect(getComputedStyle(getByText('4')).color).not.toBe(
    colorFromHex(colour.brand.crn[500]).rgb,
  );
  expect(getComputedStyle(getByText('5')).color).toBe(
    colorFromHex(colour.brand.crn[500]).rgb,
  );
});

it('links page numbers to the respective pages', () => {
  const { getByText } = render(
    <PageControls
      numberOfPages={9}
      currentPageIndex={5 - 1}
      renderPageHref={renderPageHref}
    />,
  );
  expect(getByText('4').closest('a')).toHaveAttribute('href', '#3');
  expect(getByText('5').closest('a')).toHaveAttribute('href', '#4');
});

it('inserts a filler for a single missing page and applies the wide-screen-only class', () => {
  // numberOfPages = 6, currentPageIndex = 2 produces desiredPages [0,1,2,3,5]
  // so optimizeGaps will insert index=4 (page “5”) as a filler with wideScreenOnly = true
  const { getByText } = render(
    <PageControls
      numberOfPages={6}
      currentPageIndex={2}
      renderPageHref={renderPageHref}
    />,
  );

  // the filler should render as page “5”
  const fillerSpan = getByText('5');
  const fillerLi = fillerSpan.closest('li');
  const fillerLink = fillerSpan.closest('a');

  expect(fillerLi).toHaveClass('wide-screen-only');
  // and its href should point to index 4
  expect(fillerLink).toHaveAttribute('href', '#4');
});
