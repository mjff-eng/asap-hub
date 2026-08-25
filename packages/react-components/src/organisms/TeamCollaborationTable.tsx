import {
  PerformanceMetricByDocumentType,
  SortTeamCollaboration,
  teamCollaborationInitialSortingDirection,
  TeamCollaborationSortingDirection,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import {
  AlphabeticalSortingIcon,
  NumericalSortingIcon,
  PageControls,
  PerformanceCard,
  TeamCollaborationRow,
} from '..';

import { Card } from '../atoms';
import { borderRadius } from '../card';
import { charcoal, neutral500 } from '../colors';
import { rem, tabletScreen } from '../pixels';

const container = css({
  display: 'grid',
  paddingTop: rem(12),
});

const columnsStyles = (isWithinTeam: boolean) =>
  css({
    [`@media (min-width: ${tabletScreen.min}px)`]: {
      gridTemplateColumns: isWithinTeam
        ? '1fr 1fr 1fr 1fr 1fr 1fr'
        : '0.3fr 1fr 1fr 1fr 1fr 1fr 1fr',
    },
  });

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    padding: `${rem(20)} ${rem(24)} 0`,
    paddingBottom: rem(16),
  },
});

const rowStyles = css({
  display: 'grid',
  borderBottom: `1px solid ${neutral500.rgb}`,
  ':first-of-type': {
    borderBottom: 'none',
  },
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: rem(15),
    borderRadius: rem(borderRadius),
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    columnGap: rem(15),
    paddingTop: 0,
    paddingBottom: 0,
    borderBottom: `1px solid ${neutral500.rgb}`,
  },
});

const titleStyles = css({
  fontWeight: 'bold',
  color: charcoal.rgb,
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
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

export type CollaborationType = 'within-team' | 'across-teams';

export type TeamCollaborationMetric = {
  id: string;
  name: string;
  isInactive: boolean;
  Article: number;
  Bioinformatics: number;
  Dataset: number;
  'Lab Material': number;
  Protocol: number;
  collaborationByTeam: Omit<
    TeamCollaborationMetric,
    'collaborationByTeam' | 'type'
  >[];
};

type TeamCollaborationTableProps = ComponentProps<typeof PageControls> & {
  data: TeamCollaborationMetric[];
  performance: PerformanceMetricByDocumentType;
  setSort: React.Dispatch<React.SetStateAction<SortTeamCollaboration>>;
  setSortingDirection: React.Dispatch<
    React.SetStateAction<TeamCollaborationSortingDirection>
  >;
  sort: SortTeamCollaboration;
  sortingDirection: TeamCollaborationSortingDirection;
  type: CollaborationType;
};

const TeamCollaborationTable: React.FC<TeamCollaborationTableProps> = ({
  data,
  performance,
  sort,
  setSort,
  sortingDirection,
  setSortingDirection,
  type,
  ...pageControlProps
}) => {
  const isTeamSortActive = sort.includes('team');
  const isArticleSortActive = sort.includes('article');
  const isBioinformaticsSortActive = sort.includes('bioinformatics');
  const isDatasetSortActive = sort.includes('dataset');
  const isLabMaterialSortActive = sort.includes('lab_material');
  const isProtocolSortActive = sort.includes('protocol');

  const collaborationType = type === 'within-team' ? '' : 'across_';
  return (
    <>
      <PerformanceCard performance={performance} type="by-document" />
      <Card padding={false}>
        <div css={container}>
          <div
            css={[
              rowStyles,
              gridTitleStyles,
              columnsStyles(type === 'within-team'),
            ]}
          >
            <span
              css={titleStyles && type === 'within-team' && { display: 'none' }}
            ></span>
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
                    ...teamCollaborationInitialSortingDirection,
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

                  setSort(`article_${collaborationType}${newDirection}`);
                  setSortingDirection({
                    ...teamCollaborationInitialSortingDirection,
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

                  setSort(`bioinformatics_${collaborationType}${newDirection}`);
                  setSortingDirection({
                    ...teamCollaborationInitialSortingDirection,
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

                  setSort(`dataset_${collaborationType}${newDirection}`);
                  setSortingDirection({
                    ...teamCollaborationInitialSortingDirection,
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

                  setSort(`lab_material_${collaborationType}${newDirection}`);
                  setSortingDirection({
                    ...teamCollaborationInitialSortingDirection,
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

                  setSort(`protocol_${collaborationType}${newDirection}`);
                  setSortingDirection({
                    ...teamCollaborationInitialSortingDirection,
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
            <TeamCollaborationRow
              rowItem={row}
              key={row.id}
              performance={performance}
              type={type}
            />
          ))}
        </div>
      </Card>
      <section css={pageControlsStyles}>
        <PageControls {...pageControlProps} />
      </section>
    </>
  );
};

export default TeamCollaborationTable;
