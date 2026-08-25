import {
  OSChampionResponse,
  OSChampionSortingDirection,
  SortOSChampion,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { Card } from '../atoms';
import { borderRadius } from '../card';
import { charcoal, neutral500 } from '../colors';
import { AlphabeticalSortingIcon, NumericalSortingIcon } from '../icons';
import { OSChampionTableRow, PageControls } from '../molecules';
import { rem } from '../pixels';

const container = css({
  overflowX: 'auto',
  borderRadius: rem(borderRadius),
  'th, td': {
    textAlign: 'left',
    paddingRight: rem(24),
    paddingLeft: rem(24),
  },
  'th.team, td.team': {
    borderRight: `1px solid ${neutral500.rgb}`,
    paddingLeft: 0,
    left: 0,
  },
  'td.collapsed': {
    borderRight: `1px solid ${neutral500.rgb}`,
    paddingLeft: 0,
    borderBottom: `1px solid ${neutral500.rgb}`,
  },
});

const titleStyles = css({
  alignItems: 'center',
  fontWeight: 'bold',
  color: charcoal.rgb,
  background: '#fff',
  verticalAlign: 'top',
  paddingTop: rem(32),
  overflowWrap: 'break-word',
});

const headerStyles = css({
  display: 'flex',
  columnGap: rem(8),
  alignItems: 'start',
  '&:hover': {
    opacity: 0.7,
  },
  '& svg': {
    flexShrink: 0,
    width: '24px',
    height: '24px',
  },
});

const buttonStyles = css({
  width: rem(24),
  margin: 0,
  padding: 0,
  border: 'none',
  backgroundColor: 'unset',
  cursor: 'pointer',
  alignSelf: 'center',
});

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

type OSChampionTableProps = ComponentProps<typeof PageControls> & {
  data: OSChampionResponse[];
  sort: SortOSChampion;
  setSort: React.Dispatch<React.SetStateAction<SortOSChampion>>;
  sortingDirection: OSChampionSortingDirection;
};

const OSChampionTable: React.FC<OSChampionTableProps> = ({
  data,
  sort,
  setSort,
  sortingDirection,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.includes('team');
  const isOSChampionAwardsSortActive = sort.includes('os_champion_awards');

  const getNewSortDirection = (
    isActive: boolean,
    currentDirection: 'asc' | 'desc',
    defaultDirection: 'asc' | 'desc',
  ): 'asc' | 'desc' => {
    if (!isActive) return defaultDirection;
    return currentDirection === 'asc' ? 'desc' : 'asc';
  };

  const handleTeamSort = () => {
    const newDirection = getNewSortDirection(
      isTeamSortActive,
      sortingDirection.team,
      'asc',
    );
    setSort(`team_${newDirection}`);
  };

  const handleOSChampionAwardsSort = () => {
    const newDirection = getNewSortDirection(
      isOSChampionAwardsSortActive,
      sortingDirection.osChampionAwards,
      'desc',
    );
    setSort(`os_champion_awards_${newDirection}`);
  };

  return (
    <>
      <Card padding={false}>
        <div css={container}>
          <table
            css={{
              width: '100%',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
            }}
          >
            <colgroup>
              <col css={{ width: '72px' }} />
              <col css={{ width: 'calc(50% - 72px)' }} />
              <col css={{ width: 'calc(50% - 24px)' }} />
              <col css={{ width: '24px' }} />
            </colgroup>
            <thead>
              <tr>
                <th css={{ width: '72px' }}></th>
                <th css={titleStyles} className={'team'} scope="col">
                  <span css={headerStyles}>
                    Team
                    <button
                      type="button"
                      css={buttonStyles}
                      onClick={handleTeamSort}
                    >
                      <AlphabeticalSortingIcon
                        active={isTeamSortActive}
                        ascending={sortingDirection.team === 'asc'}
                      />
                    </button>
                  </span>
                </th>
                <th css={titleStyles} scope="col">
                  <span css={headerStyles}>
                    <span>Total number of Open Science Champion awards</span>
                    <button
                      type="button"
                      css={buttonStyles}
                      onClick={handleOSChampionAwardsSort}
                    >
                      <NumericalSortingIcon
                        active={isOSChampionAwardsSortActive}
                        ascending={sortingDirection.osChampionAwards === 'asc'}
                        description="OS Champion Awards"
                      />
                    </button>
                  </span>
                </th>
                <th css={{ width: '24px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const isEven = index % 2 === 0;
                return (
                  <OSChampionTableRow
                    key={row.teamId}
                    rowItem={row}
                    isEvenRow={isEven}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <section css={pageControlsStyles}>
        <PageControls {...pageControlProps} />
      </section>
    </>
  );
};

export default OSChampionTable;
