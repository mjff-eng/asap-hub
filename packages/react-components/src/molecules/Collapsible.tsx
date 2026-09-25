import { css } from '@emotion/react';
import { useState } from 'react';

import { Button } from '../atoms';
import { chevronCircleDownIcon, chevronCircleUpIcon } from '../icons';
import { rem } from '../pixels';
import { colourWithAlpha, colour } from '../colors';

const previewStyles = (containerMaxHeight: number | string) =>
  css({
    maxHeight: containerMaxHeight,
    overflow: 'hidden',
    background: `linear-gradient(180deg, ${
      colour.neutral[700]
    } 26.56%, ${colourWithAlpha(colour.neutral[700], 0)} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textFillColor: 'transparent',
  });

interface CollapsibleProps {
  readonly initiallyExpanded?: boolean;
  readonly children: React.ReactNode;
  readonly containerMaxHeight?: number | string;
}
const Collapsible: React.FC<CollapsibleProps> = ({
  initiallyExpanded,
  children,
  containerMaxHeight = '120px',
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <div>
      <div
        css={[
          expanded ? { display: 'flex' } : previewStyles(containerMaxHeight),
        ]}
      >
        {children}
      </div>
      <div
        css={{
          padding: `${rem(12)} 0`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Button linkStyle onClick={() => setExpanded(!expanded)}>
          <span
            css={{
              display: 'inline-grid',
              verticalAlign: 'middle',
              paddingRight: rem(12),
            }}
          >
            {expanded ? chevronCircleUpIcon : chevronCircleDownIcon}
          </span>
          {expanded ? 'Hide' : 'Show'} more
        </Button>
      </div>
    </div>
  );
};

export default Collapsible;
