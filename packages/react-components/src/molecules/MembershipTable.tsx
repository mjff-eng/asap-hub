import { css } from '@emotion/react';
import { ReactNode, useState } from 'react';

import { Link } from '../atoms';
import { colour } from '../colors';
import { chevronDownIcon, chevronUpIcon } from '../icons';
import { rem, tabletScreen } from '../pixels';
import { captionRegularStyles } from '../text';

const mobileQuery = `@media (max-width: ${tabletScreen.min - 1}px)`;
const desktopQuery = `@media (min-width: ${tabletScreen.min}px)`;

const rowBorder = `1px solid ${colour.border.tertiary}`;

const tableStyles = css({
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  [mobileQuery]: { display: 'none' },
});

const headerCellStyles = css({
  textAlign: 'left',
  verticalAlign: 'top',
  fontWeight: 700,
  color: colour.foreground.primary,
  // 8px here plus the first row's 16px top padding gives the 24px gap
  padding: `0 ${rem(24)} ${rem(8)} 0`,
  ':last-of-type': { paddingRight: 0 },
});

const cellStyles = css({
  verticalAlign: 'top',
  padding: `${rem(16)} ${rem(24)} ${rem(16)} 0`,
  borderBottom: rowBorder,
  color: colour.foreground.tertiary,
  overflowWrap: 'break-word',
  ':last-of-type': { paddingRight: 0 },
  'tr:last-of-type > &': { borderBottom: 'none' },
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  [desktopQuery]: { display: 'none' },
});

const listItemStyles = css({
  padding: `${rem(12)} ${rem(16)}`,
  borderBottom: rowBorder,
  ':first-of-type': { paddingTop: 0 },
  ':last-of-type': { borderBottom: 'none', paddingBottom: 0 },
});

const summaryStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: rem(12),
  padding: `${rem(16)} 0`,
});

const toggleStyles = css({
  flexShrink: 0,
  display: 'flex',
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
});

const fieldsStyles = css({
  display: 'grid',
  rowGap: rem(16),
  padding: `0 0 ${rem(16)}`,
});

const fieldLabelStyles = css({
  fontWeight: 700,
  color: colour.foreground.primary,
  marginBottom: rem(8),
});

const fieldValueStyles = css({
  color: colour.foreground.tertiary,
});

const nameStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  color: colour.foreground.primary,
});

const nameIconStyles = css({
  flexShrink: 0,
  display: 'flex',
  width: rem(24),
  height: rem(24),
  [mobileQuery]: { display: 'none' },
});

const nameTextStyles = css({
  minWidth: 0,
  overflowWrap: 'anywhere',
});

const nameBadgeStyles = css({
  display: 'inline-flex',
  verticalAlign: 'top',
  marginLeft: rem(8),
  lineHeight: 0,
});

const subtitleStyles = css(captionRegularStyles, {
  color: colour.foreground.secondary,
});

export type MembershipTableColumn<T> = {
  readonly key: string;
  readonly title: string;
  readonly render: (row: T) => ReactNode;
  readonly width?: string;
};

type MembershipTableProps<T> = {
  readonly columns: ReadonlyArray<MembershipTableColumn<T>>;
  readonly rows: ReadonlyArray<T>;
  readonly getRowKey: (row: T) => string;
  readonly testId?: string;
};

const isBlank = (value: ReactNode) =>
  value === null || value === undefined || value === false || value === '';

const MembershipTable = <T,>({
  columns,
  rows,
  getRowKey,
  testId,
}: MembershipTableProps<T>) => {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [primary, ...secondary] = columns;

  if (!primary) return null;

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  return (
    <>
      <table css={tableStyles} data-testid={testId}>
        <colgroup>
          {columns.map(({ key, width }) => (
            <col key={key} css={width ? { width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map(({ key, title }) => (
              <th key={key} scope="col" css={headerCellStyles}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map(({ key, render }) => (
                <td key={key} css={cellStyles}>
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul css={listStyles} data-testid={testId && `${testId}-mobile`}>
        {rows.map((row) => {
          const rowKey = getRowKey(row);
          const isExpanded = expanded.has(rowKey);
          const fields = secondary
            .map((column) => ({ ...column, value: column.render(row) }))
            .filter(({ value }) => !isBlank(value));
          return (
            <li key={rowKey} css={listItemStyles}>
              <div css={summaryStyles}>
                <div css={{ minWidth: 0, flex: 1 }}>{primary.render(row)}</div>
                {fields.length > 0 && (
                  <button
                    type="button"
                    css={toggleStyles}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    onClick={() => toggle(rowKey)}
                  >
                    {isExpanded ? chevronUpIcon : chevronDownIcon}
                  </button>
                )}
              </div>
              {isExpanded && fields.length > 0 && (
                <dl css={fieldsStyles}>
                  {fields.map(({ key, title, value }) => (
                    <div key={key}>
                      <dt css={fieldLabelStyles}>{title}</dt>
                      <dd css={[fieldValueStyles, { margin: 0 }]}>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
};

type MembershipNameProps = {
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly href?: string;
  readonly badge?: ReactNode;
  readonly subtitle?: ReactNode;
};

export const MembershipName: React.FC<MembershipNameProps> = ({
  icon,
  children,
  href,
  badge,
  subtitle,
}) => (
  <div>
    <div css={nameStyles}>
      <span css={nameIconStyles} aria-hidden="true">
        {icon}
      </span>
      <div css={nameTextStyles}>
        {href ? <Link href={href}>{children}</Link> : children}
        {badge && <span css={nameBadgeStyles}>{badge}</span>}
      </div>
    </div>
    {subtitle && <div css={subtitleStyles}>{subtitle}</div>}
  </div>
);

export default MembershipTable;
