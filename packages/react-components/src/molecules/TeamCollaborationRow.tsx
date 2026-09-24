import {
  CollaborationType,
  PerformanceMetricByDocumentType,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Link } from '../atoms';
import { borderRadius } from '../card';
import { colour } from '../colors';
import { plusRectIcon, minusRectIcon, InactiveBadgeIcon } from '../icons';
import { TeamCollaborationMetric } from '../organisms';
import { rem, tabletScreen } from '../pixels';
import { getPerformanceIcon } from '../utils';

const rowStyles = css({
  display: 'grid',
  padding: `${rem(20)} ${rem(24)} 0`,
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':nth-of-type(2n+3)': {
    background: colour.neutral[50],
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    borderRadius: rem(borderRadius),
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    columnGap: rem(15),
    paddingTop: 0,
    paddingBottom: rem(15),
    borderBottom: `1px solid ${colour.border.tertiary}`,
  },
});

const rowValueStyles = css({
  display: 'flex',
  gap: rem(6),
  fontWeight: 400,
});

const iconStyles = css({
  display: 'flex',
  gap: rem(3),
});

const columnsStyles = (isWithinTeam: boolean) =>
  css({
    [`@media (min-width: ${tabletScreen.min}px)`]: {
      gridTemplateColumns: isWithinTeam
        ? '1fr 1fr 1fr 1fr 1fr 1fr'
        : '0.3fr 1fr 1fr 1fr 1fr 1fr 1fr',
    },
  });

const collapsedRowStyles = css({
  display: 'grid',
  margin: `0 ${rem(24)} 0 ${rem(75)}`,
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':last-child': {
    borderBottom: 'none',
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    paddingTop: 0,
    paddingBottom: rem(15),
    borderBottom: `1px solid ${colour.border.tertiary}`,
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
    columnGap: rem(15),
  },
});

const rowContainerStyles = css({
  display: 'grid',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':first-of-type': {
    borderBottom: 'none',
  },
  ':nth-of-type(2n+3)': {
    background: colour.neutral[50],
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: rem(15),
    borderRadius: rem(borderRadius),
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    paddingTop: 0,
    paddingBottom: 0,
    borderBottom: `1px solid ${colour.border.tertiary}`,
  },
});

interface TeamCollaborationProps {
  rowItem: TeamCollaborationMetric;
  performance: PerformanceMetricByDocumentType;
  type: CollaborationType;
}
const TeamCollaborationRow: React.FC<TeamCollaborationProps> = ({
  rowItem,
  performance,
  type,
}) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = !!rowItem.collaborationByTeam.length;
  const isWithinTeam = type === 'within-team';

  return (
    <div css={[rowContainerStyles]}>
      <div css={[rowStyles, columnsStyles(isWithinTeam)]}>
        {!isWithinTeam && (
          <div css={{ placeSelf: 'center' }}>
            {canExpand && (
              <Button linkStyle onClick={() => setExpanded(!expanded)}>
                <span>{expanded ? minusRectIcon : plusRectIcon}</span>
              </Button>
            )}
          </div>
        )}

        <p css={iconStyles}>
          <Link href={network({}).teams({}).team({ teamId: rowItem.id }).$}>
            {rowItem.name}
          </Link>
          {rowItem.isInactive && <InactiveBadgeIcon />}
        </p>
        <p css={rowValueStyles}>
          {rowItem.Article}{' '}
          {getPerformanceIcon(rowItem.Article, performance.article)}
        </p>
        <p css={rowValueStyles}>
          {rowItem.Bioinformatics}{' '}
          {getPerformanceIcon(
            rowItem.Bioinformatics,
            performance.bioinformatics,
          )}
        </p>
        <p css={rowValueStyles}>
          {rowItem.Dataset}{' '}
          {getPerformanceIcon(rowItem.Dataset, performance.dataset)}
        </p>
        <p css={rowValueStyles}>
          {rowItem['Lab Material']}{' '}
          {getPerformanceIcon(rowItem['Lab Material'], performance.labMaterial)}
        </p>
        <p css={rowValueStyles}>
          {rowItem.Protocol}{' '}
          {getPerformanceIcon(rowItem.Protocol, performance.protocol)}
        </p>
      </div>
      {rowItem.collaborationByTeam.length > 0 &&
        expanded &&
        rowItem.collaborationByTeam.map((team) => (
          <div key={team.id} css={[collapsedRowStyles]}>
            <p css={iconStyles}>
              <Link href={network({}).teams({}).team({ teamId: team.id }).$}>
                {team.name}
              </Link>
              {team.isInactive && <InactiveBadgeIcon />}
            </p>
            <p>{team.Article}</p>
            <p>{team.Bioinformatics}</p>
            <p>{team.Dataset}</p>
            <p>{team['Lab Material']}</p>
            <p>{team.Protocol}</p>
          </div>
        ))}
    </div>
  );
};

export default TeamCollaborationRow;
