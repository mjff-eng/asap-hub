import { css } from '@emotion/react';
import { ReactElement } from 'react';

import { Button } from '../atoms';
import { neutral1000, steel } from '../colors';
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
});

// Matches EventAttendance's section header: 16 above the title, and the 16 the
// first row carries below it. A ratio, not `rem`: line-height in `em` resolves
// against the element's own font size.
const headingStyles = css({
  margin: 0,
  padding: `${rem(16)} 0 0`,
  color: neutral1000.rgb,
  fontSize: rem(14),
  fontWeight: 700,
  lineHeight: 16 / 14,
});

// The last visible row drops its own divider, so the line above Show more /
// Show less comes from here; 16px either side of the button makes the 32.
const showMoreStyles = css({
  display: 'flex',
  padding: `${rem(16)} 0`,
  borderTop: `1px solid ${steel.rgb}`,
});

// Flat rows carry no padding or divider of their own, so the section gives them
// the same rhythm SpeakerTeamRow gives a grouped row.
const externalRowsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  '> *': {
    paddingTop: rem(16),
    paddingBottom: rem(16),
    borderBottom: `1px solid ${steel.rgb}`,
  },
  '> *:last-of-type': { borderBottom: 'none' },
});

type SpeakerSectionProps = {
  readonly variant: SpeakerGroup['variant'];
  readonly rows: ReadonlyArray<ReactElement>;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  // External speakers are flat rows and need their own gap; grouped rows carry
  // their spacing on the group itself, so the card passes nothing here.
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
      <h4 css={headingStyles}>{sectionTitles[variant]}</h4>
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
