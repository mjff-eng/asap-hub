import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import MembershipCard from '../MembershipCard';

type Item = { id: string };
const items = (count: number, prefix = 'item'): Item[] =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}` }));

type CardProps = ComponentProps<typeof MembershipCard<Item>>;
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;
type RenderProps = DistributiveOmit<
  CardProps,
  'title' | 'description' | 'children'
>;

const body: CardProps['children'] = ({ data, activeTabIndex }) => (
  <ul data-testid={`body-${activeTabIndex}`}>
    {data.map(({ id }) => (
      <li key={id}>{id}</li>
    ))}
  </ul>
);

const renderCard = (props: RenderProps) =>
  render(
    <MembershipCard<Item> title="Title" description="Description" {...props}>
      {body}
    </MembershipCard>,
  );

it('renders the title, description and body without tabs', () => {
  renderCard({ items: items(2), empty: 'Nothing here.' });
  expect(screen.getByRole('heading', { name: 'Title' })).toBeVisible();
  expect(screen.getByText('Description')).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

it('renders the empty message when there are no items', () => {
  renderCard({ items: [], empty: 'Nothing here.' });
  expect(screen.getByText('Nothing here.')).toBeVisible();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

it('renders the empty message of the active tab', () => {
  renderCard({
    tabs: [
      { tabTitle: 'Current', items: items(1), empty: '' },
      { tabTitle: 'Former', items: [], empty: 'No former items.' },
    ],
    activeTabIndex: 1,
  });
  expect(screen.getByText('No former items.')).toBeVisible();
});

it('switches tabs and tells the body which tab is active', async () => {
  const onTabChange = jest.fn();
  renderCard({
    onTabChange,
    tabs: [
      { tabTitle: 'Current (1)', items: items(1, 'current'), empty: '' },
      { tabTitle: 'Former (1)', items: items(1, 'former'), empty: '' },
    ],
  });
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  expect(screen.getByTestId('body-0')).toHaveTextContent('current-0');

  await userEvent.click(screen.getByRole('button', { name: 'Former (1)' }));
  expect(screen.getByTestId('body-1')).toHaveTextContent('former-0');
  expect(onTabChange).toHaveBeenCalledWith(1);
});

it('opens on the given tab and follows changes to it', () => {
  const tabs = [
    { tabTitle: 'Current', items: items(1, 'current'), empty: '' },
    { tabTitle: 'Former', items: items(1, 'former'), empty: '' },
  ];
  const { rerender } = renderCard({ tabs, activeTabIndex: 1 });
  expect(screen.getByText('former-0')).toBeVisible();

  rerender(
    <MembershipCard<Item>
      title="Title"
      description="Description"
      tabs={tabs}
      activeTabIndex={0}
    >
      {body}
    </MembershipCard>,
  );
  expect(screen.getByText('current-0')).toBeVisible();
});

it('truncates the items and toggles them with View More', async () => {
  renderCard({ truncateFrom: 2, items: items(3), empty: '' });
  expect(screen.getAllByRole('listitem')).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: /view more/i }));
  expect(screen.getAllByRole('listitem')).toHaveLength(3);

  await userEvent.click(screen.getByRole('button', { name: /view less/i }));
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

it('does not show View More when everything fits', () => {
  renderCard({ truncateFrom: 2, items: items(2), empty: '' });
  expect(
    screen.queryByRole('button', { name: /view/i }),
  ).not.toBeInTheDocument();
});

it('collapses again when changing tab', async () => {
  renderCard({
    truncateFrom: 1,
    tabs: [
      { tabTitle: 'Current', items: items(2, 'current'), empty: '' },
      { tabTitle: 'Former', items: items(2, 'former'), empty: '' },
    ],
  });
  await userEvent.click(screen.getByRole('button', { name: /view more/i }));
  expect(
    within(screen.getByTestId('body-0')).getAllByRole('listitem'),
  ).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: 'Former' }));
  expect(
    within(screen.getByTestId('body-1')).getAllByRole('listitem'),
  ).toHaveLength(1);
});
