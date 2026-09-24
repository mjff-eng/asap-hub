/** @jsxImportSource @emotion/react */
import { MilestoneStatus } from '@asap-hub/model';
import { css } from '@emotion/react';
import { useEffect, useRef, useState } from 'react';

import { Pill, Spinner } from '../atoms';
import {
  colorWithTransparency,
  neutral200,
  neutral300,
  neutral800,
  info100,
  info500,
  success100,
  success500,
  error100,
  error500,
  colour,
  neutral500,
  neutral700,
} from '../colors';
import { chevronDownIcon, chevronUpIcon } from '../icons';
import { rem } from '../pixels';
import { Portal } from '../utils/portal';

const EDITABLE_STATUSES: ReadonlyArray<MilestoneStatus> = [
  'In Progress',
  'Pending',
];

export const isEditableStatus = (status: MilestoneStatus): boolean =>
  EDITABLE_STATUSES.includes(status);

type StatusAccent = 'success' | 'info' | 'neutral' | 'error';

const accentPalette: Record<
  StatusAccent,
  { bg: string; fg: string; border: string }
> = {
  success: {
    bg: success100.rgb,
    fg: success500.rgb,
    border: success500.rgb,
  },
  info: { bg: info100.rgb, fg: info500.rgb, border: info500.rgb },
  neutral: {
    bg: neutral300.rgb,
    fg: neutral800.rgb,
    border: neutral800.rgb,
  },
  error: { bg: error100.rgb, fg: error500.rgb, border: error500.rgb },
};

const triggerStyles = (accent: StatusAccent) => {
  const { bg, fg, border } = accentPalette[accent];
  return css({
    appearance: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: rem(4),
    padding: `${rem(2)} ${rem(8)}`,
    borderRadius: rem(6),
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    fontSize: rem(14),
    lineHeight: 1.2,
    margin: 0,
    ':focus-visible': {
      outline: `2px solid ${colorWithTransparency(neutral700, 0.7).rgba}`,
      outlineOffset: rem(2),
    },
    '& svg': {
      width: rem(24),
      height: rem(24),
      display: 'block',
    },
    '& svg #Group-7': {
      stroke: fg,
    },
  });
};

type MenuPosition = {
  top: number;
  left: number;
};

const menuOffset = 6;

const menuContainerStyles = ({ top, left }: MenuPosition) =>
  css({
    position: 'fixed',
    top,
    left,
    zIndex: 1,
    minWidth: rem(160),
    backgroundColor: colour.neutral[0].rgb,
    border: `1px solid ${neutral500.rgb}`,
    boxShadow: `0 2px 6px 0 ${colorWithTransparency(neutral700, 0.34).rgba}`,
    padding: `${rem(8)} 0`,
    display: 'flex',
    flexDirection: 'column',
    gap: rem(4),
  });

const menuItemStyles = css({
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: `${rem(4)} ${rem(16)}`,
  textAlign: 'left',
  cursor: 'pointer',
  ':hover, :focus-visible': {
    backgroundColor: neutral200.rgba,
    outline: 'none',
  },
});

const trailingWrapperStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  // Compensate for the chevron SVG's internal right-side whitespace so the
  // visual gap to the right edge matches the text padding on the left.
  marginRight: rem(-7),
});

const spinnerWrapperStyles = css({
  width: rem(24),
  height: rem(24),
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const getStatusAccent = (status: MilestoneStatus): StatusAccent => {
  switch (status) {
    case 'Complete':
      return 'success';
    case 'In Progress':
      return 'info';
    case 'Pending':
      return 'neutral';
    case 'Terminated':
      return 'error';
    default:
      return 'neutral';
  }
};

type Props = {
  readonly status: MilestoneStatus;
  readonly canEdit: boolean;
  readonly isPending?: boolean;
  readonly options?: ReadonlyArray<MilestoneStatus>;
  readonly onChange?: (next: MilestoneStatus) => void;
};

const DEFAULT_OPTIONS: Record<
  MilestoneStatus,
  ReadonlyArray<MilestoneStatus>
> = {
  Pending: ['In Progress', 'Complete', 'Terminated'],
  'In Progress': ['Complete', 'Terminated', 'Pending'],
  Complete: [],
  Terminated: [],
};

const MilestoneStatusDropdown: React.FC<Props> = ({
  status,
  canEdit,
  isPending = false,
  options,
  onChange,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const isInteractive = canEdit && isEditableStatus(status);
  const menuOptions = options ?? DEFAULT_OPTIONS[status] ?? [];

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.bottom + menuOffset, left: rect.left });
    }
  };

  const open = () => {
    updatePosition();
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    const onScrollOrResize = () => close();
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen]);

  // Auto-close menu if a status update starts while open
  useEffect(() => {
    if (isPending && isOpen) close();
  }, [isPending, isOpen]);

  if (!isInteractive) {
    return (
      <Pill accent={getStatusAccent(status)} noMargin>
        {status}
      </Pill>
    );
  }

  const accent = getStatusAccent(status);
  const accentColor = accentPalette[accent].fg;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        css={triggerStyles(accent)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-busy={isPending}
        aria-label={
          isPending
            ? `Updating status (currently ${status})`
            : `Change status (currently ${status})`
        }
        disabled={isPending}
        onClick={() => {
          if (isPending) return;
          if (isOpen) close();
          else open();
        }}
      >
        <span>{status}</span>
        <span aria-hidden css={trailingWrapperStyles}>
          {isPending ? (
            <span css={spinnerWrapperStyles}>
              <Spinner
                size={14}
                thickness={2}
                color={accentColor}
                arc
                speed="0.8s"
                testId="milestone-status-spinner"
              />
            </span>
          ) : isOpen ? (
            chevronUpIcon
          ) : (
            chevronDownIcon
          )}
        </span>
      </button>
      {isOpen && position && (
        <Portal>
          <div ref={menuRef} role="listbox" css={menuContainerStyles(position)}>
            {menuOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === status}
                css={menuItemStyles}
                onClick={() => {
                  close();
                  onChange?.(option);
                }}
              >
                <Pill accent={getStatusAccent(option)} noMargin>
                  {option}
                </Pill>
              </button>
            ))}
          </div>
        </Portal>
      )}
    </>
  );
};

export default MilestoneStatusDropdown;
