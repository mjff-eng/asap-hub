import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import FilterDropdown from '../FilterDropdown';

const renderFilterDropdown = (
  props: Partial<ComponentProps<typeof FilterDropdown>> = {},
) =>
  render(
    <FilterDropdown
      menuShown={false}
      onToggle={jest.fn()}
      onClose={jest.fn()}
      {...props}
    >
      <p>Content</p>
    </FilterDropdown>,
  );

it('renders the button text', () => {
  renderFilterDropdown({ buttonText: 'Filter' });
  expect(screen.getByRole('button', { name: /filter/i })).toBeVisible();
});

it('hides the content when the menu is not shown', () => {
  renderFilterDropdown({ menuShown: false });
  expect(screen.getByText('Content')).not.toBeVisible();
});

it('shows the content when the menu is shown', () => {
  renderFilterDropdown({ menuShown: true });
  expect(screen.getByText('Content')).toBeVisible();
});

it('calls onToggle when the button is clicked', async () => {
  const onToggle = jest.fn();
  renderFilterDropdown({ onToggle });
  await userEvent.click(screen.getByRole('button'));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

it('calls onClose when clicking outside', () => {
  const onClose = jest.fn();
  renderFilterDropdown({ menuShown: true, onClose });
  fireEvent.mouseDown(document);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('does not call onClose when clicking inside', () => {
  const onClose = jest.fn();
  renderFilterDropdown({ menuShown: true, onClose });
  fireEvent.mouseDown(screen.getByText('Content'));
  expect(onClose).not.toHaveBeenCalled();
});

it('does not render the count badge without a count', () => {
  renderFilterDropdown();
  expect(screen.queryByTestId('filter-count')).not.toBeInTheDocument();
});

it('does not render the count badge when the count is 0', () => {
  renderFilterDropdown({ count: 0 });
  expect(screen.queryByTestId('filter-count')).not.toBeInTheDocument();
});

it('renders the count badge', () => {
  renderFilterDropdown({ count: 3 });
  expect(screen.getByTestId('filter-count')).toHaveTextContent('3');
});
