import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
  type MenuPosition,
} from '../ContextMenu';

const renderMenu = (position: MenuPosition = { x: 100, y: 100 }) => {
  const onClose = jest.fn();
  const onMove = jest.fn();
  render(
    <div>
      <button type="button">outside</button>
      <ContextMenu label="Video actions" position={position} onClose={onClose}>
        <ContextMenuItem onSelect={jest.fn()}>Watch</ContextMenuItem>
        <ContextMenuSubmenu label="Move to folder">
          <ContextMenuItem onSelect={onMove}>Design</ContextMenuItem>
        </ContextMenuSubmenu>
        <ContextMenuSeparator />
        <ContextMenuItem danger onSelect={jest.fn()}>
          Delete
        </ContextMenuItem>
      </ContextMenu>
    </div>,
  );
  return { onClose, onMove, menu: screen.getByRole('menu') };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the submenu', () => {
  it('opens and closes from its own item', async () => {
    const { onMove } = renderMenu();
    const trigger = screen.getByRole('menuitem', { name: /Move to folder/ });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Design' }));
    expect(onMove).toHaveBeenCalled();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: 'Design' })).toBeNull();
  });

  it('follows the pointer in and out', async () => {
    renderMenu();
    const trigger = screen.getByRole('menuitem', { name: /Move to folder/ });

    await userEvent.hover(trigger);
    expect(screen.getByRole('menuitem', { name: 'Design' })).toBeVisible();

    await userEvent.unhover(trigger);
    expect(screen.queryByRole('menuitem', { name: 'Design' })).toBeNull();
  });
});

describe('closing', () => {
  it('closes on Escape without letting the key reach the page', async () => {
    const pageKeys = jest.fn();
    const { onClose } = renderMenu();
    screen.getByRole('menu').addEventListener('keydown', pageKeys);
    screen.getByRole('menuitem', { name: 'Watch' }).focus();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(pageKeys).not.toHaveBeenCalled();
  });

  it('ignores other keys', async () => {
    const { onClose } = renderMenu();

    await userEvent.keyboard('{ArrowDown}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a press outside, not on one inside', async () => {
    const { onClose } = renderMenu();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Watch' }));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'outside' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('placement', () => {
  const { innerWidth, innerHeight } = window;

  beforeEach(() => {
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 200, height: 120 } as DOMRect);
  });

  afterEach(() => {
    window.innerWidth = innerWidth;
    window.innerHeight = innerHeight;
  });

  it('opens at the pointer when it fits', () => {
    const { menu } = renderMenu({ x: 100, y: 80 });

    expect(menu).toHaveStyle({ left: '100px', top: '80px' });
  });

  it('opens to the left of and above a pointer near the far corner', () => {
    const { menu } = renderMenu({
      x: window.innerWidth - 50,
      y: window.innerHeight - 30,
    });

    expect(menu).toHaveStyle({
      left: `${window.innerWidth - 250}px`,
      top: `${window.innerHeight - 150}px`,
    });
  });

  it('never pushes the menu off the top left edge', () => {
    window.innerWidth = 150;
    window.innerHeight = 100;
    const { menu } = renderMenu({ x: 60, y: 40 });

    expect(menu).toHaveStyle({ left: '8px', top: '8px' });
  });
});
