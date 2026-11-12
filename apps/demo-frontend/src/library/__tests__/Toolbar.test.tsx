import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { type StatusFilter } from '../state';
import { Toolbar } from '../Toolbar';

const renderToolbar = (props: Partial<Parameters<typeof Toolbar>[0]> = {}) => {
  const onQueryChange = jest.fn();
  const onSortChange = jest.fn();
  const onViewChange = jest.fn();
  const onStatusFilterChange = jest.fn();
  const onCreateFolderHere = jest.fn();

  render(
    <MemoryRouter>
      <Toolbar
        query=""
        onQueryChange={onQueryChange}
        sort="newest"
        onSortChange={onSortChange}
        view="grid"
        onViewChange={onViewChange}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        isCreator
        currentLocationName="Engineering"
        canCreateHere
        onCreateFolderHere={onCreateFolderHere}
        {...props}
      />
    </MemoryRouter>,
  );

  return {
    onQueryChange,
    onSortChange,
    onViewChange,
    onStatusFilterChange,
    onCreateFolderHere,
  };
};

it('reports every keystroke in the search box', async () => {
  const { onQueryChange } = renderToolbar();

  await userEvent.type(screen.getByLabelText('Search videos'), 'ab');

  expect(onQueryChange).toHaveBeenCalledTimes(2);
  expect(onQueryChange).toHaveBeenLastCalledWith('b');
});

it('shows the current sort and reports a new one', async () => {
  const { onSortChange } = renderToolbar({ sort: 'oldest' });

  const trigger = screen.getByRole('button', { name: 'Sort videos' });
  expect(trigger).toHaveTextContent('Oldest first');

  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('option', { name: 'Title A-Z' }));

  expect(onSortChange).toHaveBeenCalledWith('title');
});

it('marks the active view and reports a switch', async () => {
  const { onViewChange } = renderToolbar({ view: 'list' });

  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await userEvent.click(screen.getByRole('button', { name: 'Grid view' }));

  expect(onViewChange).toHaveBeenCalledWith('grid');
});

describe('status filter', () => {
  it.each<[StatusFilter, string]>([
    ['all', 'All statuses'],
    ['published', 'Published'],
    ['drafts', 'Drafts'],
  ])('shows the %s filter on the trigger', (statusFilter, label) => {
    renderToolbar({ statusFilter });
    expect(
      screen.getByRole('button', { name: 'Filter by status' }),
    ).toHaveTextContent(label);
  });

  it('opens a menu of every status, like its neighbours', async () => {
    const { onStatusFilterChange } = renderToolbar();

    await userEvent.click(
      screen.getByRole('button', { name: 'Filter by status' }),
    );

    expect(
      screen.getAllByRole('option').map((node) => node.textContent),
    ).toEqual(['All statuses', 'Published', 'Drafts']);

    await userEvent.click(screen.getByRole('option', { name: 'Drafts' }));

    expect(onStatusFilterChange).toHaveBeenCalledWith('drafts');
  });
});

describe('new folder popover', () => {
  it('creates a folder named after the current location', async () => {
    const { onCreateFolderHere } = renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: /New folder/ }));
    await userEvent.type(
      screen.getByLabelText('New folder name in Engineering'),
      'Ops{Enter}',
    );

    expect(onCreateFolderHere).toHaveBeenCalledWith('Ops');
  });

  it('ignores a blank name', async () => {
    const { onCreateFolderHere } = renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: /New folder/ }));
    await userEvent.type(
      screen.getByLabelText('New folder name in Engineering'),
      '   {Enter}',
    );

    expect(onCreateFolderHere).not.toHaveBeenCalled();
  });

  // pressing the button again used to blur the input shut and reopen it, which
  // reads as nothing happening
  it('closes the popover when the button is pressed again', async () => {
    renderToolbar();
    const button = screen.getByRole('button', { name: /New folder/ });

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByLabelText('New folder name in Engineering'),
    ).toBeNull();
  });

  it('closes the popover on Escape', async () => {
    renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: /New folder/ }));
    const input = screen.getByLabelText('New folder name in Engineering');
    await userEvent.type(input, '{Escape}');

    expect(
      screen.queryByLabelText('New folder name in Engineering'),
    ).toBeNull();
  });

  it('explains why the button is disabled at the deepest level', () => {
    renderToolbar({ canCreateHere: false });

    expect(screen.getByRole('button', { name: /New folder/ })).toHaveAttribute(
      'title',
      'This folder is already at the deepest level',
    );
  });
});

it('hides the creator-only controls from a member', () => {
  renderToolbar({ isCreator: false });

  expect(screen.getByLabelText('Search videos')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Sort videos' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Filter by status' })).toBeNull();
  expect(screen.queryByRole('button', { name: /New folder/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /Upload/ })).toBeNull();
});
