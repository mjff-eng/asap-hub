/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  FocusEventHandler,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { colour } from '../colors';
import { rem } from '../pixels';
import { canHover } from '../utils/common';
import { Portal } from '../utils/portal';

const wrapperStyles = css({
  position: 'relative',
  display: 'flex',
  flex: 1,
  margin: rem(-16),
  padding: rem(16),
});

const gap = 0;
const triangle = 5;

const bubbleStyles = css({
  position: 'fixed',
  transform: 'translateY(-50%)',
  zIndex: 100,
  pointerEvents: 'none',

  backgroundColor: colour.brand.gp2[900],
  color: colour.foreground['primary-inverse'],
  borderRadius: rem(4),
  padding: `${rem(6)} ${rem(12)}`,
  whiteSpace: 'nowrap',
  fontWeight: 'normal',

  '::before': {
    content: '""',
    position: 'absolute',
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    borderTop: `${rem(triangle)} solid transparent`,
    borderBottom: `${rem(triangle)} solid transparent`,
    borderRight: `${rem(triangle)} solid ${colour.brand.gp2[900]}`,
  },
});

type Coords = { left: number; top: number };

type RailTooltipProps = {
  readonly label: ReactNode;
  readonly enabled?: boolean;
} & PropsWithChildren;

const RailTooltip: React.FC<RailTooltipProps> = ({
  label,
  enabled = true,
  children,
}) => {
  const [coords, setCoords] = useState<Coords | null>(null);

  const show = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setCoords({ left: rect.right + gap, top: rect.top + rect.height / 2 });
  }, []);
  const hide = useCallback(() => setCoords(null), []);

  // The rail removes the hover handlers while it animates (enabled=false), so
  // a mouseleave during that window is lost; drop any coords captured before.
  useEffect(() => {
    if (!enabled) {
      setCoords(null);
    }
  }, [enabled]);

  const onFocus = useCallback<FocusEventHandler<HTMLSpanElement>>(
    (event) => {
      if (event.currentTarget.matches(':focus-visible')) {
        show(event.currentTarget);
      }
    },
    [show],
  );

  return (
    <span
      css={wrapperStyles}
      onMouseEnter={
        enabled ? (event) => canHover() && show(event.currentTarget) : undefined
      }
      onMouseLeave={hide}
      onFocus={enabled ? onFocus : undefined}
      onBlur={hide}
    >
      {children}
      {enabled && coords && (
        <Portal>
          <span role="tooltip" css={bubbleStyles} style={coords}>
            {label}
          </span>
        </Portal>
      )}
    </span>
  );
};

export default RailTooltip;
