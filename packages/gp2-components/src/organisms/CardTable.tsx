import { Subtitle, pixels, colour } from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { CollapsibleTable } from '../molecules';

import { mobileQuery, nonMobileQuery } from '../layout';
import colors from '../templates/colors';

import { CollapsibleTableRow } from '../molecules/CollapsibleTable';

const { rem } = pixels;

const rowStyles = css({
  display: 'grid',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  padding: `${rem(16)} 0 ${rem(12)}`,
  rowGap: rem(32),
  [nonMobileQuery]: {
    gridTemplateColumns: '1fr 196px 156px',
    columnGap: rem(24),
    rowGap: 0,
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
});

const rowStyles2Columns = css({
  [nonMobileQuery]: {
    gridTemplateColumns: '3fr 1fr',
  },
});

const gridTitleStyles = css({
  borderBottom: 'none',
  marginBottom: 0,
  padding: 0,
  [mobileQuery]: {
    display: 'none',
  },
});

const headingListStyles = css({
  [nonMobileQuery]: {
    display: 'none',
  },
});

type CardTableProps = {
  isOnboarding?: boolean;
  headings: string[];
  children: CollapsibleTableRow[];
};

const CardTable = ({
  headings,
  isOnboarding = false,
  children,
}: CardTableProps) => {
  const tableStyles = !isOnboarding
    ? rowStyles
    : [rowStyles, rowStyles2Columns];

  return (
    <CollapsibleTable
      headings={
        <div css={[tableStyles, gridTitleStyles]}>
          {headings.map((heading, idx) => (
            <Subtitle key={`heading-${idx}`} noMargin>
              {heading}
            </Subtitle>
          ))}
        </div>
      }
    >
      {children.map(({ id, values }, index) => (
        <div key={`display-row-${id}-${index}`} css={tableStyles}>
          {values.map((value, idx) => (
            <div
              key={`display-row-value-${idx}`}
              css={css({
                display: 'flex',
                gap: rem(16),
                flexDirection: 'column',
              })}
            >
              {value && (
                <>
                  <div css={headingListStyles}>
                    <Subtitle noMargin>{headings[idx]}</Subtitle>
                  </div>
                  <span
                    css={idx !== 0 ? { color: colors.greyscale1000.rgb } : null}
                  >
                    {value}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </CollapsibleTable>
  );
};
export default CardTable;
