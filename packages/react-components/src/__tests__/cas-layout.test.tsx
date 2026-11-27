import '@emotion/jest';
import { render, screen } from '@testing-library/react';

import { CasBreakpoint, casGrid } from '../cas-layout';
import {
  contentWidthStyles,
  mediaBelow,
  mediaCondition,
  mediaFrom,
  pageContainerStyles,
  pageContentContainerStyles,
  pageGutter,
  pageHeaderTextStyles,
  pageMarginStyles,
  tileGridStyles,
} from '../layout';
import { remUnit } from '../pixels';
import type { Product } from '../theme';

describe('casGrid', () => {
  it.each(
    (['crn', 'gp2'] as const).flatMap((product) =>
      Object.entries(casGrid[product]).map(
        ([breakpoint, grid]) => [product, breakpoint, grid] as const,
      ),
    ),
  )(
    '%s %s columns and gutters fill the max width',
    (_, __, { maxWidth, columns, columnWidth, gutter }) => {
      // Mobile has no max width; the Figma frame draws it at 345px.
      expect(columns * columnWidth + (columns - 1) * gutter).toBe(
        maxWidth ?? 344,
      );
    },
  );
});

describe('media queries', () => {
  it('mediaFrom applies each breakpoint from its smallest width up, in em', () => {
    expect(mediaFrom).toEqual({
      tablet: '@media (min-width: 40.0625em)', // 641px
      laptop: '@media (min-width: 64.0625em)', // 1025px
      desktopL: '@media (min-width: 80.0625em)', // 1281px
      desktopXL: '@media (min-width: 120em)', // 1920px
    });
  });

  it('mediaBelow is the exact complement of mediaFrom', () => {
    expect(mediaBelow).toEqual({
      tablet: '@media not all and (min-width: 40.0625em)',
      laptop: '@media not all and (min-width: 64.0625em)',
      desktopL: '@media not all and (min-width: 80.0625em)',
      desktopXL: '@media not all and (min-width: 120em)',
    });
  });

  it('mediaCondition has the same conditions without @media', () => {
    expect(mediaCondition.from.laptop).toBe('(min-width: 64.0625em)');
    expect(mediaCondition.below.tablet).toBe(
      'not all and (min-width: 40.0625em)',
    );
  });
});

describe('pageContainerStyles', () => {
  const renderContainer = (product: Product) => {
    render(<div css={pageContainerStyles[product]}>Content</div>);
    return screen.getByText('Content');
  };

  it.each(['crn', 'gp2'] as const)(
    '%s fills the width on mobile with the mobile margins',
    (product) => {
      const container = renderContainer(product);
      expect(container).toHaveStyleRule('padding-left', remUnit(24));
      expect(container).toHaveStyleRule('padding-right', remUnit(24));
      expect(container).toHaveStyleRule('max-width', 'none');
      expect(container).toHaveStyleRule('margin-left', 'auto');
      expect(container).toHaveStyleRule('margin-right', 'auto');
    },
  );

  const media: Record<Exclude<CasBreakpoint, 'mobile'>, string> = {
    tablet: '(min-width: 40.0625em)',
    laptop: '(min-width: 64.0625em)',
    desktopL: '(min-width: 80.0625em)',
    desktopXL: '(min-width: 120em)',
  };

  it.each([
    ['crn', 'tablet', 56, 688],
    ['crn', 'laptop', 68, 888],
    ['crn', 'desktopL', 76, 1032],
    ['crn', 'desktopXL', 100, 1464],
    ['gp2', 'tablet', 56, 900],
  ] as const)(
    '%s uses the %s margins and max width',
    (product, breakpoint, margin, contentMaxWidth) => {
      const container = renderContainer(product);
      const options = { media: media[breakpoint] };
      expect(container).toHaveStyleRule(
        'padding-left',
        remUnit(margin),
        options,
      );
      expect(container).toHaveStyleRule(
        'padding-right',
        remUnit(margin),
        options,
      );
      // border-box, so the max width includes both margins
      expect(container).toHaveStyleRule(
        'max-width',
        remUnit(contentMaxWidth + margin * 2),
        options,
      );
    },
  );

  it.each(['laptop', 'desktopL', 'desktopXL'] as const)(
    'gp2 keeps the tablet margins and max width at %s, with no rules of its own',
    (breakpoint) => {
      const container = renderContainer('gp2');
      expect(() =>
        expect(container).toHaveStyleRule('max-width', expect.anything(), {
          media: media[breakpoint],
        }),
      ).toThrow();
    },
  );
});

describe('pageMarginStyles', () => {
  it('sets only the CRN grid margins, with no max width', () => {
    render(<div css={pageMarginStyles.crn}>Content</div>);
    const element = screen.getByText('Content');
    expect(element).toHaveStyleRule('padding-left', remUnit(24));
    expect(element).toHaveStyleRule('padding-right', remUnit(100), {
      media: '(min-width: 120em)',
    });
    expect(element).not.toHaveStyleRule('max-width', expect.anything());
    expect(() =>
      expect(element).toHaveStyleRule('max-width', expect.anything(), {
        media: '(min-width: 120em)',
      }),
    ).toThrow();
  });
});

describe('contentWidthStyles', () => {
  it('is at most 900px wide and centred, with no margins of its own', () => {
    render(<div css={contentWidthStyles}>Content</div>);
    const element = screen.getByText('Content');
    expect(element).toHaveStyleRule('width', '100%');
    expect(element).toHaveStyleRule('max-width', remUnit(900));
    expect(element).toHaveStyleRule('margin-left', 'auto');
    expect(element).toHaveStyleRule('margin-right', 'auto');
    expect(element).not.toHaveStyleRule('padding-left', expect.anything());
  });
});

describe('page gutter', () => {
  const media = {
    tablet: '(min-width: 40.0625em)',
    laptop: '(min-width: 64.0625em)',
  };

  it.each([
    ['pageContainerStyles', pageContainerStyles],
    ['pageMarginStyles', pageMarginStyles],
  ] as const)('%s sets the CRN gutter at each breakpoint', (_, styles) => {
    render(<div css={styles.crn}>Content</div>);
    const element = screen.getByText('Content');
    expect(element).toHaveStyleRule('--page-gutter', remUnit(8));
    expect(element).toHaveStyleRule('--page-gutter', remUnit(16), {
      media: media.tablet,
    });
    expect(element).toHaveStyleRule('--page-gutter', remUnit(24), {
      media: media.laptop,
    });
  });

  it('changes the GP2 gutter at laptop although its margins do not change', () => {
    render(<div css={pageContainerStyles.gp2}>Content</div>);
    const element = screen.getByText('Content');
    expect(element).toHaveStyleRule('--page-gutter', remUnit(16), {
      media: media.tablet,
    });
    expect(element).toHaveStyleRule('--page-gutter', remUnit(24), {
      media: media.laptop,
    });
  });

  it('reads the gutter from the page container, with a 24px fallback', () => {
    expect(pageGutter).toBe('var(--page-gutter, 1.5rem)');
  });
});

describe('pageContentContainerStyles', () => {
  const media = {
    tablet: '(min-width: 40.0625em)',
    laptop: '(min-width: 64.0625em)',
    desktopL: '(min-width: 80.0625em)',
    desktopXL: '(min-width: 120em)',
  };

  it.each([
    ['tablet', 56, 688],
    ['laptop', 68, 888],
    ['desktopL', 76, 900],
    ['desktopXL', 100, 900],
  ] as const)(
    'caps the CRN content at 900px at %s, or at the grid where it is narrower',
    (breakpoint, margin, contentMaxWidth) => {
      render(<div css={pageContentContainerStyles.crn}>Content</div>);
      const element = screen.getByText('Content');
      const options = { media: media[breakpoint] };
      expect(element).toHaveStyleRule('padding-left', remUnit(margin), options);
      expect(element).toHaveStyleRule(
        'max-width',
        remUnit(contentMaxWidth + margin * 2),
        options,
      );
    },
  );

  it('fills the width on mobile and is centred', () => {
    render(<div css={pageContentContainerStyles.crn}>Content</div>);
    const element = screen.getByText('Content');
    expect(element).toHaveStyleRule('max-width', 'none');
    expect(element).toHaveStyleRule('margin-left', 'auto');
    expect(element).toHaveStyleRule('margin-right', 'auto');
  });
});

describe('pageHeaderTextStyles', () => {
  it('caps the line length at 70ch at every breakpoint', () => {
    render(<div css={pageHeaderTextStyles}>Content</div>);
    expect(screen.getByText('Content')).toHaveStyleRule('max-width', '70ch');
  });
});

describe('tileGridStyles', () => {
  it('fits as many 720px columns as the container has room for', () => {
    render(<div css={tileGridStyles}>Content</div>);
    const element = screen.getByText('Content');
    expect(element).toHaveStyleRule('display', 'grid');
    expect(element).toHaveStyleRule(
      'grid-template-columns',
      'repeat(auto-fill, minmax(min(45rem, 100%), 1fr))',
    );
    expect(element).toHaveStyleRule('column-gap', pageGutter);
  });

  it('has room for exactly 2 columns in the 1464px container', () => {
    const { maxWidth, gutter } = casGrid.crn.desktopXL;
    expect(720 * 2 + gutter).toBe(maxWidth);
  });
});
