import { DndContext } from '@dnd-kit/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import type { Folder } from '../../api/types';
import { Sidebar } from '../Sidebar';

const folders: Folder[] = [
  { id: 'f-eng', name: 'Engineering' },
  { id: 'f-sprint', name: 'Sprints', parentId: 'f-eng' },
  { id: 'f-design', name: 'Design' },
];

const expandedKey = 'demo-hub.library.expanded-folders';
const homeExpandedKey = 'demo-hub.library.home-expanded';

const renderSidebar = (props: Partial<Parameters<typeof Sidebar>[0]> = {}) => {
  const handlers = {
    onStartCreate: jest.fn(),
    onCreate: jest.fn(),
    onCancelCreate: jest.fn(),
    onCreateChild: jest.fn(),
    onCancelCreateChild: jest.fn(),
    onRename: jest.fn(),
    onCancelRename: jest.fn(),
  };
  render(
    <MemoryRouter>
      <DndContext>
        <Sidebar
          folders={folders}
          isCreator
          isLoading={false}
          isCreatingFolder={false}
          isBlockedTarget={() => false}
          isAllVideos={false}
          onFolderContextMenu={() => jest.fn()}
          onNavClick={jest.fn()}
          {...handlers}
          {...props}
        />
      </DndContext>
    </MemoryRouter>,
  );
  return handlers;
};

const tree = () => screen.getByRole('complementary', { name: 'Folders' });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('naming a new folder', () => {
  it('drops the input instead of creating a folder with a blank name', async () => {
    const { onCreate, onCancelCreate } = renderSidebar({
      isCreatingFolder: true,
    });

    await userEvent.type(
      screen.getByLabelText('New folder name'),
      '   {Enter}',
    );

    expect(onCancelCreate).toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates the folder under the trimmed name', async () => {
    const { onCreate } = renderSidebar({ isCreatingFolder: true });

    await userEvent.type(
      screen.getByLabelText('New folder name'),
      '  Research {Enter}',
    );

    expect(onCreate).toHaveBeenCalledWith('Research');
  });

  it('gives up on Escape', async () => {
    const { onCreate, onCancelCreate } = renderSidebar({
      isCreatingFolder: true,
    });

    await userEvent.type(screen.getByLabelText('New folder name'), 'Rese');
    onCancelCreate.mockClear();
    await userEvent.keyboard('{Escape}');

    expect(onCancelCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('expanded folders', () => {
  it('collapses an expanded folder and remembers that it did', async () => {
    window.localStorage.setItem(expandedKey, JSON.stringify(['f-eng']));
    renderSidebar({ isCreator: false });

    expect(within(tree()).getByText('Sprints')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Engineering' }),
    );

    expect(within(tree()).queryByText('Sprints')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Expand Engineering' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(window.localStorage.getItem(expandedKey) ?? '')).toEqual(
      [],
    );
  });

  it.each([
    ['is not a list', JSON.stringify({ 'f-eng': true })],
    ['is not json', '["f-eng"'],
  ])('starts collapsed when what was stored %s', (_label, stored) => {
    window.localStorage.setItem(expandedKey, stored);
    renderSidebar();

    expect(within(tree()).getByText('Engineering')).toBeVisible();
    expect(within(tree()).queryByText('Sprints')).toBeNull();
  });
});

describe('the Home row', () => {
  it('folds the whole tree away and opens it again, remembering each', async () => {
    renderSidebar();

    expect(within(tree()).getByText('Engineering')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Home' }),
    );

    expect(within(tree()).queryByText('Engineering')).toBeNull();
    expect(window.localStorage.getItem(homeExpandedKey)).toBe('0');

    await userEvent.click(screen.getByRole('button', { name: 'Expand Home' }));

    expect(within(tree()).getByText('Engineering')).toBeVisible();
    expect(window.localStorage.getItem(homeExpandedKey)).toBe('1');
  });

  it('starts folded when it was left folded', () => {
    window.localStorage.setItem(homeExpandedKey, '0');
    renderSidebar();

    expect(screen.getByRole('button', { name: 'Expand Home' })).toBeVisible();
    expect(within(tree()).queryByText('Engineering')).toBeNull();
  });
});

describe('with storage blocked', () => {
  beforeEach(() => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
  });

  it('still shows the tree open under Home', () => {
    renderSidebar();

    expect(screen.getByRole('button', { name: 'Collapse Home' })).toBeVisible();
    expect(within(tree()).getByText('Engineering')).toBeVisible();
    expect(within(tree()).queryByText('Sprints')).toBeNull();
  });

  it('still expands and folds for the rest of the visit', async () => {
    renderSidebar({ isCreator: false });

    await userEvent.click(
      screen.getByRole('button', { name: 'Expand Engineering' }),
    );
    expect(within(tree()).getByText('Sprints')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse Home' }),
    );
    expect(within(tree()).queryByText('Engineering')).toBeNull();
  });
});
