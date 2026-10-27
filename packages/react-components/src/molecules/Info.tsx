import { ReactNode, useCallback, useLayoutEffect, useState } from 'react';
import { css } from '@emotion/react';

import { Tooltip } from '../atoms';
import { useTooltipTrigger } from '../hooks';
import { infoIcon } from '../icons';
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
  const {
    shown: tooltipShown,
    ref: buttonRef,
    triggerProps,
  } = useTooltipTrigger<HTMLButtonElement>({ openOnHover });
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(
    null,
  );

  const measureAnchor = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setAnchor({ left: rect.left + rect.width / 2, top: rect.top });
    }
  }, [buttonRef]);

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

  const tooltip = (
    <Tooltip shown={tooltipShown} width={width} background={background}>
      {children}
    </Tooltip>
  );

  return (
    <button css={buttonStyles} aria-label={label} {...triggerProps}>
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
