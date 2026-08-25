import {
  SortTeamProductivity,
  teamProductivityInitialSortingDirection,
  TeamProductivityPerformance,
  TeamProductivityResponse,
  TeamProductivitySortingDirection,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { PageControls, PerformanceCard } from '..';

import { Card, Link } from '../atoms';
import { borderRadius } from '../card';
import { charcoal, neutral200, neutral500 } from '../colors';
import {
  AlphabeticalSortingIcon,
  InactiveBadgeIcon,
  NumericalSortingIcon,
} from '../icons';
import { rem, tabletScreen } from '../pixels';
import { getPerformanceIcon } from '../utils';

const container = css({
  display: 'grid',
  paddingTop: rem(32),
});

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    paddingBottom: rem(16),
  },
});

const rowTitleStyles = css({
  paddingTop: rem(32),
  paddingBottom: rem(16),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const rowStyles = css({
  display: 'grid',
  padding: `${rem(20)} ${rem(24)} 0`,
  borderBottom: `1px solid ${neutral500.rgb}`,
  ':first-of-type': {
    borderBottom: 'none',
  },
  ':nth-of-type(2n+3)': {
    background: neutral200.rgb,
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: rem(15),
    borderRadius: rem(borderRadius),
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
    columnGap: rem(15),
    paddingTop: 0,
    paddingBottom: 0,
    borderBottom: `1px solid ${neutral500.rgb}`,
  },
});

const titleStyles = css({
  display: 'flex',
  alignItems: 'center',
  fontWeight: 'bold',
  color: charcoal.rgb,
  gap: rem(8),
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

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
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

type TeamProductivityTableProps = ComponentProps<typeof PageControls> & {
  data: TeamProductivityResponse[];
  performance: TeamProductivityPerformance;
  setSort: React.Dispatch<React.SetStateAction<SortTeamProductivity>>;
  setSortingDirection: React.Dispatch<
    React.SetStateAction<TeamProductivitySortingDirection>
  >;
  sort: SortTeamProductivity;
  sortingDirection: TeamProductivitySortingDirection;
};

const TeamProductivityTable: React.FC<TeamProductivityTableProps> = ({
  data,
  performance,
  sort,
  setSort,
  sortingDirection,
  setSortingDirection,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.includes('team');
  const isArticleSortActive = sort.includes('article');
  const isBioinformaticsSortActive = sort.includes('bioinformatics');
  const isDatasetSortActive = sort.includes('dataset');
  const isLabMaterialSortActive = sort.includes('lab_material');
  const isProtocolSortActive = sort.includes('protocol');

  return (
    <>
      <PerformanceCard performance={performance} type="by-document" />
      <Card padding={false}>
        <div css={container}>
          <div css={[rowStyles, gridTitleStyles]}>
            <span css={titleStyles}>
              Team
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isTeamSortActive
                    ? sortingDirection.team === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'asc';

                  setSort(`team_${newDirection}`);
                  setSortingDirection({
                    ...teamProductivityInitialSortingDirection,
                    team: newDirection,
                  });
                }}
              >
                <AlphabeticalSortingIcon
                  active={isTeamSortActive}
                  ascending={sortingDirection.team === 'asc'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Articles
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isArticleSortActive
                    ? sortingDirection.article === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`article_${newDirection}`);
                  setSortingDirection({
                    ...teamProductivityInitialSortingDirection,
                    article: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isArticleSortActive}
                  ascending={sortingDirection.article === 'asc'}
                  description={'Article'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Bioinformatics
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isBioinformaticsSortActive
                    ? sortingDirection.bioinformatics === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`bioinformatics_${newDirection}`);
                  setSortingDirection({
                    ...teamProductivityInitialSortingDirection,
                    bioinformatics: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isBioinformaticsSortActive}
                  ascending={sortingDirection.bioinformatics === 'asc'}
                  description={'Bioinformatics'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Datasets
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isDatasetSortActive
                    ? sortingDirection.dataset === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`dataset_${newDirection}`);
                  setSortingDirection({
                    ...teamProductivityInitialSortingDirection,
                    dataset: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isDatasetSortActive}
                  ascending={sortingDirection.dataset === 'asc'}
                  description={'Dataset'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Lab Materials
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isLabMaterialSortActive
                    ? sortingDirection.labMaterial === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`lab_material_${newDirection}`);
                  setSortingDirection({
                    ...teamProductivityInitialSortingDirection,
                    labMaterial: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isLabMaterialSortActive}
                  ascending={sortingDirection.labMaterial === 'asc'}
                  description={'Lab Material'}
                />
              </button>
            </span>
            <span css={titleStyles}>
              Protocols
              <button
                css={buttonStyles}
                onClick={() => {
                  const newDirection = isProtocolSortActive
                    ? sortingDirection.protocol === 'asc'
                      ? 'desc'
                      : 'asc'
                    : 'desc';

                  setSort(`protocol_${newDirection}`);
                  setSortingDirection({
                    ...teamProductivityInitialSortingDirection,
                    protocol: newDirection,
                  });
                }}
              >
                <NumericalSortingIcon
                  active={isProtocolSortActive}
                  ascending={sortingDirection.protocol === 'asc'}
                  description={'Protocol'}
                />
              </button>
            </span>
          </div>
          {data.map((row) => (
            <div key={row.id} css={[rowStyles]}>
              <span css={[titleStyles, rowTitleStyles]}>Team</span>
              <p css={iconStyles}>
                <Link href={network({}).teams({}).team({ teamId: row.id }).$}>
                  {row.name}
                </Link>

                {row.isInactive && <InactiveBadgeIcon />}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Articles</span>
              <p css={rowValueStyles}>
                {row.Article}{' '}
                {getPerformanceIcon(row.Article, performance.article)}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Bioinformatics</span>
              <p css={rowValueStyles}>
                {row.Bioinformatics}{' '}
                {getPerformanceIcon(
                  row.Bioinformatics,
                  performance.bioinformatics,
                )}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Datasets</span>
              <p css={rowValueStyles}>
                {row.Dataset}{' '}
                {getPerformanceIcon(row.Dataset, performance.dataset)}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Lab Materials</span>
              <p css={rowValueStyles}>
                {row['Lab Material']}{' '}
                {getPerformanceIcon(
                  row['Lab Material'],
                  performance.labMaterial,
                )}
              </p>
              <span css={[titleStyles, rowTitleStyles]}>Protocols</span>
              <p css={rowValueStyles}>
                {row.Protocol}{' '}
                {getPerformanceIcon(row.Protocol, performance.protocol)}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <section css={pageControlsStyles}>
        <PageControls {...pageControlProps} />
      </section>
    </>
  );
};

export default TeamProductivityTable;
