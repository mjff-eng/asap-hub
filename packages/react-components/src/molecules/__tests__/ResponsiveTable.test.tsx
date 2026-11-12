import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ResponsiveTable, { ResponsiveTableColumn } from '../ResponsiveTable';

type Row = { id: string; name: string; role: string; dateLeft?: string };

const columns: ResponsiveTableColumn<Row>[] = [
  { key: 'name', title: 'Name', render: (row) => row.name },
  { key: 'role', title: 'Role', width: '30%', render: (row) => row.role },
  { key: 'dateLeft', title: 'Date left', render: (row) => row.dateLeft },
];

const rows: Row[] = [
  { id: '1', name: 'Alpha', role: 'Chair', dateLeft: '2023-02-15' },
  { id: '2', name: 'Beta', role: 'Member' },
];

const renderTable = () =>
  render(
    <ResponsiveTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      testId="table"
    />,
  );

it('renders a table with a header and one row per item', () => {
  renderTable();
  const table = screen.getByTestId('table');

  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent),
  ).toEqual(['Name', 'Role', 'Date left']);
  expect(within(table).getAllByRole('row')).toHaveLength(3);
  expect(within(table).getByText('Alpha')).toBeInTheDocument();
  expect(within(table).getByText('Beta')).toBeInTheDocument();
});

it('renders the mobile list with the first column as the summary', () => {
  renderTable();
  const list = screen.getByTestId('table-mobile');

  expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  expect(within(list).getByText('Alpha')).toBeInTheDocument();
  expect(within(list).queryByText('Chair')).not.toBeInTheDocument();
});

it('expands a mobile row to show the other columns, skipping blank ones', async () => {
  renderTable();
  const [alpha, beta] = within(screen.getByTestId('table-mobile')).getAllByRole(
    'listitem',
  );

  await userEvent.click(within(alpha!).getByRole('button', { name: 'Expand' }));
  expect(within(alpha!).getByText('Role')).toBeInTheDocument();
  expect(within(alpha!).getByText('Chair')).toBeInTheDocument();
  expect(within(alpha!).getByText('2023-02-15')).toBeInTheDocument();
  expect(within(beta!).queryByText('Member')).not.toBeInTheDocument();

  await userEvent.click(within(beta!).getByRole('button', { name: 'Expand' }));
  expect(within(beta!).getByText('Member')).toBeInTheDocument();
  expect(within(beta!).queryByText('Date left')).not.toBeInTheDocument();

  await userEvent.click(
    within(alpha!).getByRole('button', { name: 'Collapse' }),
  );
  expect(within(alpha!).queryByText('Chair')).not.toBeInTheDocument();
});

it('does not render an expand button when a row has nothing else to show', () => {
  render(
    <ResponsiveTable
      columns={[columns[0]!, columns[2]!]}
      rows={[rows[1]!]}
      getRowKey={(row) => row.id}
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('renders nothing without columns', () => {
  const { container } = render(
    <ResponsiveTable columns={[]} rows={rows} getRowKey={(row) => row.id} />,
  );
  expect(container).toBeEmptyDOMElement();
});

it('uses a custom toggle label per row', async () => {
  render(
    <ResponsiveTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      getToggleLabel={(row, expanded) =>
        `${expanded ? 'Hide' : 'Show'} details for ${row.name}`
      }
    />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Show details for Alpha' }),
  );
  expect(
    screen.getByRole('button', { name: 'Hide details for Alpha' }),
  ).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.getByRole('button', { name: 'Show details for Beta' }),
  ).toHaveAttribute('aria-expanded', 'false');
});

it('removes the desktop row dividers when dividers is false', () => {
  renderTable();
  const [withDivider] = within(screen.getByTestId('table')).getAllByRole(
    'cell',
  );
  expect(withDivider).toHaveStyleRule(
    'border-bottom',
    expect.stringContaining('solid'),
  );

  render(
    <ResponsiveTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      testId="no-dividers"
      dividers={false}
    />,
  );
  const [withoutDivider] = within(
    screen.getByTestId('no-dividers'),
  ).getAllByRole('cell');
  expect(withoutDivider).toHaveStyleRule('border-bottom', 'none');
});
