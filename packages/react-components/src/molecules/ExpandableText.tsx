import { css } from '@emotion/react';
import React, { useLayoutEffect, useState } from 'react';

import {
  Button,
  chevronCircleDownIcon,
  colorWithTransparency,
  lead,
  pixels,
} from '..';

const { rem, lineHeight } = pixels;

const expandableMaxHeight = 120;

const textStyles = css({
  maxHeight: rem(expandableMaxHeight),
  overflowY: 'clip',
  margin: 0,
});

const expandedTextStyles = css({
  maxHeight: rem(lineHeight * 500), // aproximation of possible max height (2500 characters)
  transition: 'max-height 300ms linear',
  background: colorWithTransparency(lead, 0).rgba,
});

const expandableTextStyles = css({
  maxHeight: rem(expandableMaxHeight),
  background: `linear-gradient(180deg, ${lead.rgb} 26.56%, ${
    colorWithTransparency(lead, 0).rgba
  } 100%)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))',
  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))',
});

const buttonContainerStyles = (marginTop: number) =>
  css({
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginTop: rem(marginTop),
  });

const expandableButtonIcon = css({
  marginLeft: rem(12),
  display: 'inline-grid',
  verticalAlign: 'middle',
  svg: {
    transition: '250ms',
  },
});
const expandedButtonIcon = css({
  svg: {
    transform: 'rotate(180deg)',
  },
});

const chevronVariantButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(4),
  height: rem(24),
  textDecoration: 'none',
  ':hover': {
    textDecoration: 'none',
  },
});

const arrowIconStyles = css({
  alignSelf: 'start',
});

const ExpandableText: React.FC<{
  variant?: 'chevron' | 'arrow';
  toggleMarginTop?: number;
  expandOnce?: boolean;
  children?: React.ReactNode;
}> = ({
  variant = 'chevron',
  toggleMarginTop = 16,
  expandOnce = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [textElement, setTextElement] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!textElement) return undefined;

    const measure = () =>
      setShowToggle(textElement.scrollHeight > expandableMaxHeight);
    measure();

    // The content reflows as fonts load and the viewport changes, and a ref
    // alone never re-runs this effect.
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(textElement);
    return () => observer.disconnect();
  }, [textElement]);

  const hideToggle = expandOnce && expanded;

  return (
    <div>
      <div
        css={[
          textStyles,
          expanded ? expandedTextStyles : showToggle && expandableTextStyles,
        ]}
        ref={setTextElement}
      >
        {children}
      </div>
      {showToggle && !hideToggle && (
        <div css={buttonContainerStyles(toggleMarginTop)}>
          {variant === 'chevron' ? (
            <Button linkStyle onClick={() => setExpanded(!expanded)}>
              Show {expanded ? 'less' : 'more'}
              <span
                css={[expandableButtonIcon, expanded && expandedButtonIcon]}
              >
                {chevronCircleDownIcon}
              </span>
            </Button>
          ) : (
            <Button
              linkStyle
              onClick={() => setExpanded(!expanded)}
              overrideStyles={chevronVariantButtonStyles}
            >
              Show {expanded ? 'less' : 'more'}{' '}
              <span css={arrowIconStyles}>{expanded ? '↑' : '↓'}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableText;
