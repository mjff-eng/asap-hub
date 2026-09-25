import { ReactNode } from 'react';
import { css, SerializedStyles } from '@emotion/react';

import { colour } from '../colors';
import { rem, tabletScreen } from '../pixels';

const triangleHeight = 5;

const positionerStyles = css({
  display: 'block',
  position: 'relative',
  height: 0,
  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    position: 'relative',
    width: '100%',
  },
});
const tooltipStyles = css({
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: rem(256),

  display: 'grid',
  gridTemplateRows: `auto ${rem(triangleHeight)}`,

  '::before': {
    content: '""',
    display: 'block',
    width: 0,
    height: 0,
    position: 'absolute',
    borderLeft: `${triangleHeight}px solid transparent`,
    borderRight: `${triangleHeight}px solid transparent`,
    borderTop: `${triangleHeight}px solid ${colour.brand.gp2[900]}`,
    bottom: 0,
    right: '50%',
    // the triangle is 2 * triangleHeight wide, so pull it right by half
    // its width to center its tip on the bubble midline
    marginRight: `-${triangleHeight}px`,
  },

  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    width: 'max-content',
  },
});
const bubbleStyles = css({
  backgroundColor: colour.brand.gp2[900],
  color: colour.foreground['primary-inverse'],
  display: 'block',

  padding: `${rem(9)} ${rem(12)}`,
  boxSizing: 'border-box',
  maxWidth: rem(256),

  borderRadius: rem(4),

  [`@media (max-width: ${tabletScreen.width - 1}px)`]: {
    maxWidth: '100%',
    marginLeft: rem(12),
    marginRight: rem(12),
  },
});

interface TooltipProps {
  children: ReactNode;
  shown?: boolean;
  maxContent?: boolean;
  bottom?: string;
  textStyles?: SerializedStyles;
  width?: string | number;
  // Recolours the bubble and its tail together; the tail is drawn by a
  // pseudo-element that no style prop can reach from the outside.
  background?: string;
}
const Tooltip: React.FC<TooltipProps> = ({
  children,
  shown = false,
  maxContent = false,
  bottom,
  textStyles,
  width,
  background,
}) => {
  const widthValue =
    width !== undefined
      ? typeof width === 'number'
        ? rem(width)
        : width
      : rem(256);

  return (
    <span css={positionerStyles}>
      <span
        css={[
          tooltipStyles,
          { width: widthValue },
          background ? { '::before': { borderTopColor: background } } : {},
          shown || { display: 'none' },
          maxContent && { width: 'max-content' },
          bottom && { bottom },
        ]}
      >
        <span
          role="tooltip"
          css={[
            bubbleStyles,
            { maxWidth: widthValue },
            background ? { backgroundColor: background } : {},
            maxContent && { width: 'max-content', maxWidth: 'fit-content' },
            textStyles,
          ]}
        >
          {children}
        </span>
      </span>
    </span>
  );
};

export default Tooltip;
