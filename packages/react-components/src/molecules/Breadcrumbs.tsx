import { css } from '@emotion/react';

import { Link } from '../atoms';
import { colour } from '../colors';
import { breadcrumbSeparatorIcon, homeIcon } from '../icons';
import { rem } from '../pixels';

const listStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  margin: 0,
  padding: 0,
  listStyle: 'none',
  columnGap: rem(8),
  rowGap: rem(4),
});

const itemStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const labelStyles = css({
  fontSize: rem(15.5),
});

const homeStyles = css({
  a: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  svg: {
    display: 'block',
    width: rem(24),
    height: rem(24),
  },
});

const separatorStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  svg: {
    display: 'block',
  },
});

const plainItemStyles = css({
  color: colour.foreground.tertiary,
});

export type BreadcrumbItem = {
  readonly label: string;
  readonly href?: string;
};

type BreadcrumbsProps = {
  readonly homeHref: string;
  readonly items?: ReadonlyArray<BreadcrumbItem>;
};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ homeHref, items = [] }) => (
  <nav aria-label="breadcrumbs">
    <ol css={listStyles}>
      <li css={[itemStyles, homeStyles]}>
        <Link href={homeHref} label="Home">
          {homeIcon}
        </Link>
      </li>
      {items.map(({ label, href }, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={`${index}-${label}`} css={[itemStyles, labelStyles]}>
            <span css={separatorStyles} aria-hidden="true">
              {breadcrumbSeparatorIcon}
            </span>
            {isLast || !href ? (
              <span
                css={plainItemStyles}
                aria-current={isLast ? 'page' : undefined}
              >
                {label}
              </span>
            ) : (
              <Link href={href}>{label}</Link>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;
