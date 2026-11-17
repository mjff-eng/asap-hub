/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  FC,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  charcoal,
  ember,
  lead,
  paper,
  rem,
  shadowMedium,
  silver,
  steel,
  tin,
} from './theme';

const menuStyles = css({
  position: 'fixed',
  zIndex: 30,
  minWidth: rem(180),
  padding: `${rem(4)} 0`,
  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(6),
  boxShadow: `0 ${rem(4)} ${rem(16)} ${shadowMedium.rgb}`,
});

const itemStyles = css({
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(12),
  width: '100%',
  padding: `${rem(7)} ${rem(14)}`,
  border: 'none',
  background: 'none',
  font: 'inherit',
  fontSize: rem(14),
  textAlign: 'left',
  color: charcoal.rgb,
  cursor: 'pointer',
  ':hover:enabled, :focus-visible:enabled': { backgroundColor: silver.rgb },
  ':disabled': { color: tin.rgb, cursor: 'default' },
});

const dangerItemStyles = css({ color: ember.rgb });

const separatorStyles = css({
  height: 1,
  margin: `${rem(4)} 0`,
  backgroundColor: steel.rgb,
});

const submenuLabelStyles = css({ color: lead.rgb, fontSize: rem(12) });

export type MenuPosition = { x: number; y: number };

export const ContextMenuItem: FC<{
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly danger?: boolean;
  readonly children: ReactNode;
}> = ({ onSelect, disabled = false, danger = false, children }) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    css={[itemStyles, danger && dangerItemStyles]}
    onClick={onSelect}
  >
    {children}
  </button>
);

export const ContextMenuSeparator: FC = () => (
  <div css={separatorStyles} role="separator" />
);

export const ContextMenuSubmenu: FC<{
  readonly label: string;
  readonly children: ReactNode;
}> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      css={{ position: 'relative' }}
    >
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        css={itemStyles}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <span css={submenuLabelStyles} aria-hidden>
          &rsaquo;
        </span>
      </button>
      {open && (
        <div
          role="menu"
          css={[
            menuStyles,
            {
              position: 'absolute',
              top: rem(-4),
              left: '100%',
              maxHeight: rem(280),
              overflowY: 'auto',
            },
          ]}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const margin = 8;

export const ContextMenu: FC<{
  readonly position: MenuPosition;
  readonly onClose: () => void;
  readonly label: string;
  readonly children: ReactNode;
}> = ({ position, onClose, label, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState(position);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const x =
      position.x + width + margin > window.innerWidth
        ? Math.max(margin, position.x - width)
        : position.x;
    const y =
      position.y + height + margin > window.innerHeight
        ? Math.max(margin, position.y - height)
        : position.y;
    setPlacement({ x, y });
  }, [position.x, position.y]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('contextmenu', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('contextmenu', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      css={[menuStyles, { top: placement.y, left: placement.x }]}
    >
      {children}
    </div>
  );
};
