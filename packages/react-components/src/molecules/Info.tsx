import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';

import { Tooltip } from '../atoms';
import { infoIcon } from '../icons';
import { canHover } from '../utils/common';
import { Portal } from '../utils/portal';

const buttonStyles = css({
  padding: 0,
  border: 'none',
  outline: 'none',
  backgroundColor: 'unset',

  cursor: 'pointer',
});

// A zero-sized anchor pinned over the icon. The bubble is absolute inside it,
// so it lands above the icon exactly as it does inline, but outside any
// scrollable ancestor: an absolutely positioned bubble widens its scroll
// container, and the resulting scrollbar shifts the icon out from under the
// pointer, which closes and reopens the tooltip in a loop.
const floatingAnchorStyles = css({
  position: 'fixed',
  zIndex: 100,
  pointerEvents: 'none',
});

interface InfoProps {
  children: ReactNode;
  width?: string | number;
  background?: string;
  // Also opens on hover, the way the navigation rail tooltip does. Click stays
  // the primary trigger, so touch devices keep working.
  openOnHover?: boolean;
  // Renders the bubble in a portal, for tooltips inside a scrollable area.
  floating?: boolean;
  icon?: ReactNode;
  label?: string;
}
const Info: React.FC<InfoProps> = ({
  children,
  icon = infoIcon,
  width,
  background,
  openOnHover = false,
  floating = false,
  label,
}) => {
  const [tooltipShown, setTooltipShown] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  const measureAnchor = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setAnchor({ left: rect.left + rect.width / 2, top: rect.top });
    }
  }, []);

  useLayoutEffect(() => {
    if (!floating || !tooltipShown) {
      setAnchor(null);
      return undefined;
    }

    measureAnchor();
    // Capture phase, so scrolling any ancestor keeps the bubble on the icon.
    window.addEventListener('scroll', measureAnchor, true);
    window.addEventListener('resize', measureAnchor);
    return () => {
      window.removeEventListener('scroll', measureAnchor, true);
      window.removeEventListener('resize', measureAnchor);
    };
  }, [floating, tooltipShown, measureAnchor]);

  useEffect(() => {
    if (!tooltipShown) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) {
        setTooltipShown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTooltipShown(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tooltipShown]);

  const tooltip = (
    <Tooltip shown={tooltipShown} width={width} background={background}>
      {children}
    </Tooltip>
  );

  return (
    <button
      ref={buttonRef}
      css={buttonStyles}
      aria-label={label}
      // With hover on, the pointer already opened the tooltip by the time the
      // click lands, so toggling would close it mid-gesture; hovering out,
      // Escape and an outside click are what dismiss it.
      onClick={() => setTooltipShown((shown) => openOnHover || !shown)}
      onMouseEnter={
        openOnHover ? () => canHover() && setTooltipShown(true) : undefined
      }
      onMouseLeave={openOnHover ? () => setTooltipShown(false) : undefined}
      onFocus={openOnHover ? () => setTooltipShown(true) : undefined}
      onBlur={openOnHover ? () => setTooltipShown(false) : undefined}
    >
      {floating
        ? anchor && (
            <Portal>
              <span css={floatingAnchorStyles} style={anchor}>
                {tooltip}
              </span>
            </Portal>
          )
        : tooltip}
      <span>{icon}</span>
    </button>
  );
};

export default Info;
