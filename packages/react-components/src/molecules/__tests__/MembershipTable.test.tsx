import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MembershipTable, {
  MembershipName,
  MembershipTableColumn,
} from '../MembershipTable';

type Row = { id: string; name: string; role: string; dateLeft?: string };

const columns: MembershipTableColumn<Row>[] = [
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
    <MembershipTable
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
    <MembershipTable
      columns={[columns[0]!, columns[2]!]}
      rows={[rows[1]!]}
      getRowKey={(row) => row.id}
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('renders nothing without columns', () => {
  const { container } = render(
    <MembershipTable columns={[]} rows={rows} getRowKey={(row) => row.id} />,
  );
  expect(container).toBeEmptyDOMElement();
});

describe('MembershipName', () => {
  it('links the name and shows the badge and subtitle', () => {
    render(
      <MembershipName
        icon={<svg data-testid="icon" />}
        href="/teams/1"
        badge={<span>inactive</span>}
        subtitle="Lead PI of this lab"
      >
        Alpha
      </MembershipName>,
    );
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute(
      'href',
      '/teams/1',
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.getByText('Lead PI of this lab')).toBeInTheDocument();
  });

  it('renders plain text without an href', () => {
    render(<MembershipName icon={null}>Alpha</MembershipName>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
