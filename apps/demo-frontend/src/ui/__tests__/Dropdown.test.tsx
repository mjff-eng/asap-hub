import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dropdown from '../Dropdown';

const options = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A-Z' },
] as const;

const renderDropdown = (
  value: (typeof options)[number]['value'] = 'newest',
) => {
  const onChange = jest.fn();
  render(
    <div>
      <button type="button">outside</button>
      <Dropdown
        label="Sort videos"
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>,
  );
  return {
    onChange,
    trigger: screen.getByRole('button', { name: 'Sort videos' }),
  };
};

it('shows the label of the current value and starts closed', () => {
  const { trigger } = renderDropdown('title');

  expect(trigger).toHaveTextContent('Title A-Z');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('opens the listbox and marks the selected option', async () => {
  const { trigger } = renderDropdown('oldest');

  await userEvent.click(trigger);

  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const listbox = screen.getByRole('listbox', { name: 'Sort videos' });
  expect(listbox).toBeVisible();
  expect(screen.getByRole('option', { name: 'Oldest first' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByRole('option', { name: 'Title A-Z' })).toHaveAttribute(
    'aria-selected',
    'false',
  );
});

it('reports the chosen option and closes', async () => {
  const { onChange, trigger } = renderDropdown();

  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('option', { name: 'Title A-Z' }));

  expect(onChange).toHaveBeenCalledWith('title');
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('toggles shut when the trigger is clicked again', async () => {
  const { trigger } = renderDropdown();

  await userEvent.click(trigger);
  await userEvent.click(trigger);

  expect(screen.queryByRole('listbox')).toBeNull();
});

it('closes on a click outside without choosing anything', async () => {
  const { onChange, trigger } = renderDropdown();

  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('button', { name: 'outside' }));

  expect(screen.queryByRole('listbox')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

it('closes on Escape', async () => {
  const { onChange, trigger } = renderDropdown();

  await userEvent.click(trigger);
  await userEvent.keyboard('{Escape}');

  expect(screen.queryByRole('listbox')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

it('falls back to the label when the value matches no option', () => {
  const onChange = jest.fn();
  render(
    <Dropdown
      label="Sort videos"
      value={'gone' as 'newest'}
      options={options}
      onChange={onChange}
    />,
  );

  expect(screen.getByRole('button', { name: 'Sort videos' })).toHaveTextContent(
    'Sort videos',
  );
});

it('lists options directly, without a list item wrapping each one', async () => {
  render(
    <Dropdown
      label="Sort videos"
      value="newest"
      options={[
        { value: 'newest', label: 'Newest first' },
        { value: 'title', label: 'Title A-Z' },
      ]}
      onChange={jest.fn()}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: 'Sort videos' }));

  const listbox = screen.getByRole('listbox', { name: 'Sort videos' });
  expect(within(listbox).queryAllByRole('listitem')).toHaveLength(0);
  expect(within(listbox).getAllByRole('option')).toHaveLength(2);
});
