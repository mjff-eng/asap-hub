import { OSChampionResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Link } from '../atoms';
import { borderRadius } from '../card';
import { colour } from '../colors';
import {
  plusRectIcon,
  minusRectIcon,
  InactiveBadgeIcon,
  nestedRowIcon,
} from '../icons';
import { rem } from '../pixels';

const rowStyles = (isEvenRow: boolean) =>
  css({
    padding: `${rem(20)} ${rem(24)} 0`,
    borderBottom: `1px solid ${colour.border.tertiary}`,
    borderTop: `1px solid ${colour.border.tertiary}`,
    ':first-of-type': {
      borderTop: 'none',
      borderBottom: 'none',
    },
    background: isEvenRow ? colour.background.primary : colour.neutral[50],
    td: {
      borderBottom: `1px solid ${colour.border.tertiary}`,
    },
    ':last-child': {
      borderBottom: 'none',
      marginBottom: 0,
      borderRadius: rem(borderRadius),
      td: {
        paddingBottom: rem(16),
      },
    },
    paddingTop: 0,
    paddingBottom: 0,
  });

const collapsedRowStyles = (isEvenRow: boolean) =>
  css({
    'td:nth-of-type(2), td:nth-of-type(3)': {
      borderBottom: `1px solid ${colour.border.tertiary}`,
    },
    ':last-of-type': {
      td: {
        borderBottom: 'none',
      },
    },
    background: isEvenRow ? colour.background.primary : colour.neutral[50],
  });
const teamLinkStyles = css({
  display: 'inline-block',
  width: 'fit-content',
  maxWidth: '100%',
  overflowWrap: 'break-word',
  whiteSpace: 'normal',
});

const spanStyles = css({
  display: 'block',
  paddingBottom: rem(1),
});

const iconStyles = css({
  display: 'flex',
  gap: rem(3),
  flex: 1,
  minWidth: 0,
  maxWidth: '100%',
});

const expandButtonStyles = css({
  maxHeight: rem(24),
  verticalAlign: 'middle',
});

interface OSChampionTableRowProps {
  rowItem: OSChampionResponse;
  isEvenRow: boolean;
}
const OSChampionTableRow: React.FC<OSChampionTableRowProps> = ({
  rowItem,
  isEvenRow,
}) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = !!rowItem.users.length;

  return (
    <>
      <tr
        key={rowItem.teamId}
        css={rowStyles(isEvenRow)}
        data-testid="os-champion-table-row"
      >
        <td>
          {canExpand && (
            <span css={spanStyles}>
              <Button
                linkStyle
                onClick={() => setExpanded(!expanded)}
                overrideStyles={expandButtonStyles}
              >
                {expanded ? minusRectIcon : plusRectIcon}
              </Button>
            </span>
          )}
        </td>
        <td className={'team'}>
          <p css={iconStyles}>
            <span css={teamLinkStyles}>
              <Link
                href={network({}).teams({}).team({ teamId: rowItem.teamId }).$}
              >
                {rowItem.teamName}
              </Link>
            </span>
            {rowItem.isTeamInactive && <InactiveBadgeIcon />}
          </p>
        </td>
        <td>
          <p>{rowItem.teamAwardsCount}</p>
        </td>
        <td></td>
      </tr>
      {rowItem.users.length > 0 &&
        expanded &&
        rowItem.users.map((user) => (
          <tr key={user.id} css={collapsedRowStyles(isEvenRow)}>
            <td></td>
            <td className={'collapsed'}>
              <span
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  columnGap: rem(8),
                }}
              >
                {nestedRowIcon}
                <p>
                  <Link
                    href={network({}).users({}).user({ userId: user.id }).$}
                  >
                    {user.name}
                  </Link>
                </p>
              </span>
            </td>
            <td>{user.awardsCount}</td>
            <td></td>
          </tr>
        ))}
    </>
  );
};

export default OSChampionTableRow;
