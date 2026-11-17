import { css } from '@emotion/react';
import { ReactNode, useState } from 'react';

import { colour } from '../colors';
import { chevronDownIcon, chevronUpIcon } from '../icons';
import { rem, tabletScreen } from '../pixels';

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
  padding: `0 ${rem(24)} ${rem(24)} 0`,
  ':last-of-type': { paddingRight: 0 },
});

const cellStyles = css({
  verticalAlign: 'top',
  padding: `${rem(16)} ${rem(24)} ${rem(16)} 0`,
  borderBottom: rowBorder,
  color: colour.foreground.tertiary,
  overflowWrap: 'break-word',
  ':last-of-type': { paddingRight: 0 },
  'tr:first-of-type > &': { paddingTop: 0 },
  'tr:last-of-type > &': { paddingBottom: 0, borderBottom: 'none' },
});

const noDividerCellStyles = css({
  paddingTop: rem(8),
  paddingBottom: rem(8),
  borderBottom: 'none',
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  overflowWrap: 'anywhere',
  '& li *': { WebkitLineClamp: 'unset' },
  [desktopQuery]: { display: 'none' },
});

const listItemStyles = css({
  '& + &': {
    marginTop: rem(12),
    paddingTop: rem(12),
    borderTop: rowBorder,
  },
});

const itemStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  padding: rem(16),
});

const summaryStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: rem(12),
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
  margin: 0,
});

const fieldLabelStyles = css({
  fontWeight: 700,
  color: colour.foreground.primary,
  marginBottom: rem(8),
});

const fieldValueStyles = css({
  margin: 0,
  color: colour.foreground.tertiary,
});

export type ResponsiveTableColumn<T> = {
  readonly key: string;
  readonly title: string;
  readonly render: (row: T) => ReactNode;
  readonly width?: string;
};

type ResponsiveTableProps<T> = {
  readonly columns: ReadonlyArray<ResponsiveTableColumn<T>>;
  readonly rows: ReadonlyArray<T>;
  readonly getRowKey: (row: T) => string;
  readonly testId?: string;
  readonly dividers?: boolean;
  readonly getToggleLabel?: (row: T, expanded: boolean) => string;
};

const isBlank = (value: ReactNode) =>
  value === null || value === undefined || value === false || value === '';

const defaultToggleLabel = (_row: unknown, expanded: boolean) =>
  expanded ? 'Collapse' : 'Expand';

const ResponsiveTable = <T,>({
  columns,
  rows,
  getRowKey,
  testId,
  dividers = true,
  getToggleLabel = defaultToggleLabel,
}: ResponsiveTableProps<T>) => {
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
                <td
                  key={key}
                  css={[cellStyles, !dividers && noDividerCellStyles]}
                >
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
              <div css={itemStyles}>
                <div css={summaryStyles}>
                  <div css={{ minWidth: 0, flex: 1 }}>
                    {primary.render(row)}
                  </div>
                  {fields.length > 0 && (
                    <button
                      type="button"
                      css={toggleStyles}
                      aria-expanded={isExpanded}
                      aria-label={getToggleLabel(row, isExpanded)}
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
                        <dd css={fieldValueStyles}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default ResponsiveTable;
