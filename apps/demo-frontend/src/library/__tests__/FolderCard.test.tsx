import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { FolderCard } from '../FolderCard';

const renderCard = (props: Partial<Parameters<typeof FolderCard>[0]> = {}) => {
  const onContextMenu = jest.fn();
  const onNavClick = jest.fn();
  const { unmount } = render(
    <MemoryRouter>
      <DndContext>
        <FolderCard
          folder={{ id: 'f-eng', name: 'Engineering' }}
          count={3}
          isDropTarget
          onContextMenu={onContextMenu}
          onNavClick={onNavClick}
          {...props}
        />
      </DndContext>
    </MemoryRouter>,
  );
  return { onContextMenu, onNavClick, unmount };
};

it('links to the folder and names its video count', () => {
  renderCard();

  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('href', '/?folder=f-eng');
  expect(screen.getByText('Engineering')).toBeVisible();
  expect(screen.getByText('3 videos')).toBeVisible();
});

it('shows no videos when the count is unknown', () => {
  renderCard({ count: undefined });

  expect(screen.getByText('0 videos')).toBeVisible();
});

it('reports a right click so the folder menu can open', async () => {
  const { onContextMenu } = renderCard();

  await userEvent.pointer({
    target: screen.getByRole('link'),
    keys: '[MouseRight]',
  });

  expect(onContextMenu).toHaveBeenCalled();
});

it('lets the page guard the navigation click', async () => {
  const { onNavClick } = renderCard();

  await userEvent.click(screen.getByRole('link'));

  expect(onNavClick).toHaveBeenCalled();
});

it('only advertises itself as draggable when dragging is allowed', () => {
  const { unmount } = renderCard({ isDraggable: true });
  expect(screen.getByRole('button')).toHaveAttribute(
    'aria-roledescription',
    'draggable',
  );
  unmount();

  renderCard({ isDraggable: false });
  expect(screen.getByRole('link')).not.toHaveAttribute('aria-roledescription');
});
