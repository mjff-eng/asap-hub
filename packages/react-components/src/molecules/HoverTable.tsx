import { useState, ReactNode } from 'react';
import { css } from '@emotion/react';

import { Tooltip } from '../atoms';
import { neutral900, colour } from '../colors';
import { rem } from '../pixels';

const buttonStyles = css({
  padding: 0,
  border: 'none',
  outline: 'none',
  backgroundColor: 'unset',

  cursor: 'pointer',
});

const hoverBodyStyles = css({
  display: 'grid',
  gridRowGap: rem(8),
  padding: `${rem(3)} ${rem(4)}`,
});

const counterStyle = css({
  display: 'inline-flex',
  color: neutral900.rgb,
  marginLeft: rem(9),
  textAlign: 'center',
  minWidth: rem(24),
  border: `1px solid ${colour.border.tertiary}`,
  borderRadius: '100%',
  fontSize: '14px',
  fontWeight: 'bold',

  justifyContent: 'center',
  alignItems: 'center',
  width: rem(24),
  height: rem(24),
});

interface HoverTableProps {
  header: JSX.Element;
  children: ReactNode[];
}
const HoverTable: React.FC<HoverTableProps> = ({ header, children }) => {
  const [tooltipShown, setTooltipShown] = useState(false);
  return (
    <button
      css={buttonStyles}
      onMouseOver={() => {
        setTooltipShown(true);
      }}
      onMouseOut={() => {
        setTooltipShown(false);
      }}
    >
      <Tooltip shown={tooltipShown} maxContent>
        <div css={hoverBodyStyles}>
          {header}
          {children}
        </div>
      </Tooltip>
      <span css={counterStyle}>{children.length}</span>
    </button>
  );
};

export default HoverTable;
