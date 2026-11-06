import { css } from '@emotion/react';
import { ReactElement } from 'react';

import { Button, Headline4 } from '../atoms';
import { colour } from '../colors';
import { rem } from '../pixels';
import { defaultVisibleRows } from './shared-event-card';
import {
  SpeakerGroup,
  sectionNouns,
  sectionTitles,
  showMoreLabel,
} from './speaker-group';

const sectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: rem(24),
  ':first-of-type': { paddingTop: 0 },
});

// The last visible row drops its own divider, so the line comes from here.
const showMoreStyles = css({
  display: 'flex',
  padding: `${rem(16)} 0`,
  borderTop: `1px solid ${colour.border.tertiary}`,
});

const externalRowsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  '> *': {
    paddingTop: rem(16),
    paddingBottom: rem(16),
    borderBottom: `1px solid ${colour.border.tertiary}`,
  },
  '> *:last-of-type': { borderBottom: 'none' },
});

type SpeakerSectionProps = {
  readonly variant: SpeakerGroup['variant'];
  readonly rows: ReadonlyArray<ReactElement>;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly groupedRowsStyles?: ReturnType<typeof css>;
};

const SpeakerSection: React.FC<SpeakerSectionProps> = ({
  variant,
  rows,
  expanded,
  onToggle,
  groupedRowsStyles,
}) => {
  if (rows.length === 0) {
    return null;
  }

  const canExpand = rows.length > defaultVisibleRows;
  const visibleRows = expanded ? rows : rows.slice(0, defaultVisibleRows);
  const hiddenRows = rows.length - visibleRows.length;

  return (
    <div css={sectionStyles}>
      <Headline4 styleAsHeading="body/bold" noMargin>
        {sectionTitles[variant]}
      </Headline4>
      <div
        css={variant === 'external' ? externalRowsStyles : groupedRowsStyles}
        role="list"
      >
        {visibleRows}
      </div>
      {canExpand && (
        <span css={showMoreStyles}>
          <Button linkStyle onClick={onToggle}>
            {expanded
              ? 'Show less'
              : showMoreLabel(hiddenRows, sectionNouns[variant])}
          </Button>
        </span>
      )}
    </div>
  );
};

export default SpeakerSection;
