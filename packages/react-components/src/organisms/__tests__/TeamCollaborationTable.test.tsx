import { render } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { performanceByDocumentType } from '@asap-hub/fixtures';
import { ComponentProps } from 'react';
import {
  SortTeamCollaboration,
  teamCollaborationInitialSortingDirection,
} from '@asap-hub/model';
import userEvent from '@testing-library/user-event';
import TeamCollaborationTable, {
  TeamCollaborationMetric,
} from '../TeamCollaborationTable';

describe('TeamCollaborationTable', () => {
  const pageControlsProps = {
    numberOfPages: 1,
    currentPageIndex: 0,
    renderPageHref: () => '',
  };

  const teamCollaboration: TeamCollaborationMetric = {
    id: '1',
    name: 'Test Team',
    isInactive: false,
    Article: 1,
    Bioinformatics: 2,
    Dataset: 3,
    'Lab Material': 4,
    Protocol: 5,
    collaborationByTeam: [
      {
        id: '2',
        name: 'Other Team',
        isInactive: false,
        Article: 1,
        Bioinformatics: 2,
        Dataset: 3,
        'Lab Material': 4,
        Protocol: 5,
      },
    ],
  };

  const defaultProps: ComponentProps<typeof TeamCollaborationTable> = {
    ...pageControlsProps,
    performance: performanceByDocumentType,
    data: [teamCollaboration],
    type: 'across-teams',
    sort: 'team_asc' as SortTeamCollaboration,
    setSort: jest.fn(),
    sortingDirection: teamCollaborationInitialSortingDirection,
    setSortingDirection: jest.fn(),
  };

  it('renders data', () => {
    const { getByText } = render(<TeamCollaborationTable {...defaultProps} />);
    expect(getByText('Test Team')).toBeInTheDocument();
  });

  it('renders inactive badge', () => {
    const data = [
      {
        ...teamCollaboration,
        isInactive: true,
      },
    ];
    const { getByTitle } = render(
      <TeamCollaborationTable {...defaultProps} data={data} />,
    );
    expect(getByTitle('Inactive Team')).toBeInTheDocument();
  });

  it('allows collapsing and expanding rows', () => {
    const { getAllByRole, getByText, queryByText } = render(
      <TeamCollaborationTable {...defaultProps} />,
    );
    expect(queryByText('Other Team')).not.toBeInTheDocument();
    // The row's expand button comes after the sort buttons of the header.
    const [expandButton] = getAllByRole('button').slice(-1);
    fireEvent.click(expandButton!);
    expect(getByText('Other Team')).toBeVisible();
  });

  it.each`
    sort                     | sortingDirection                                                           | iconTitle                                                   | newSort                  | newSortingDirection
    ${'team_asc'}            | ${{ ...teamCollaborationInitialSortingDirection, team: 'asc' }}            | ${'Active Alphabetical Ascending Sort Icon'}                | ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, team: 'desc' }}
    ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, team: 'desc' }}           | ${'Active Alphabetical Descending Sort Icon'}               | ${'team_asc'}            | ${{ ...teamCollaborationInitialSortingDirection, team: 'asc' }}
    ${'article_asc'}         | ${{ ...teamCollaborationInitialSortingDirection, article: 'asc' }}         | ${'Inactive Alphabetical Ascending Sort Icon'}              | ${'team_asc'}            | ${{ ...teamCollaborationInitialSortingDirection, team: 'asc' }}
    ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, article: 'desc' }}        | ${'Article Inactive Numerical Descending Sort Icon'}        | ${'article_desc'}        | ${{ ...teamCollaborationInitialSortingDirection, article: 'desc' }}
    ${'article_asc'}         | ${{ ...teamCollaborationInitialSortingDirection, article: 'asc' }}         | ${'Article Active Numerical Ascending Sort Icon'}           | ${'article_desc'}        | ${{ ...teamCollaborationInitialSortingDirection, article: 'desc' }}
    ${'article_desc'}        | ${{ ...teamCollaborationInitialSortingDirection, article: 'desc' }}        | ${'Article Active Numerical Descending Sort Icon'}          | ${'article_asc'}         | ${{ ...teamCollaborationInitialSortingDirection, article: 'asc' }}
    ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, bioinformatics: 'desc' }} | ${'Bioinformatics Inactive Numerical Descending Sort Icon'} | ${'bioinformatics_desc'} | ${{ ...teamCollaborationInitialSortingDirection, bioinformatics: 'desc' }}
    ${'bioinformatics_asc'}  | ${{ ...teamCollaborationInitialSortingDirection, bioinformatics: 'asc' }}  | ${'Bioinformatics Active Numerical Ascending Sort Icon'}    | ${'bioinformatics_desc'} | ${{ ...teamCollaborationInitialSortingDirection, bioinformatics: 'desc' }}
    ${'bioinformatics_desc'} | ${{ ...teamCollaborationInitialSortingDirection, bioinformatics: 'desc' }} | ${'Bioinformatics Active Numerical Descending Sort Icon'}   | ${'bioinformatics_asc'}  | ${{ ...teamCollaborationInitialSortingDirection, bioinformatics: 'asc' }}
    ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, dataset: 'desc' }}        | ${'Dataset Inactive Numerical Descending Sort Icon'}        | ${'dataset_desc'}        | ${{ ...teamCollaborationInitialSortingDirection, dataset: 'desc' }}
    ${'dataset_asc'}         | ${{ ...teamCollaborationInitialSortingDirection, dataset: 'asc' }}         | ${'Dataset Active Numerical Ascending Sort Icon'}           | ${'dataset_desc'}        | ${{ ...teamCollaborationInitialSortingDirection, dataset: 'desc' }}
    ${'dataset_desc'}        | ${{ ...teamCollaborationInitialSortingDirection, dataset: 'desc' }}        | ${'Dataset Active Numerical Descending Sort Icon'}          | ${'dataset_asc'}         | ${{ ...teamCollaborationInitialSortingDirection, dataset: 'asc' }}
    ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, labMaterial: 'desc' }}    | ${'Lab Material Inactive Numerical Descending Sort Icon'}   | ${'lab_material_desc'}   | ${{ ...teamCollaborationInitialSortingDirection, labMaterial: 'desc' }}
    ${'lab_material_asc'}    | ${{ ...teamCollaborationInitialSortingDirection, labMaterial: 'asc' }}     | ${'Lab Material Active Numerical Ascending Sort Icon'}      | ${'lab_material_desc'}   | ${{ ...teamCollaborationInitialSortingDirection, labMaterial: 'desc' }}
    ${'lab_material_desc'}   | ${{ ...teamCollaborationInitialSortingDirection, labMaterial: 'desc' }}    | ${'Lab Material Active Numerical Descending Sort Icon'}     | ${'lab_material_asc'}    | ${{ ...teamCollaborationInitialSortingDirection, labMaterial: 'asc' }}
    ${'team_desc'}           | ${{ ...teamCollaborationInitialSortingDirection, protocol: 'desc' }}       | ${'Protocol Inactive Numerical Descending Sort Icon'}       | ${'protocol_desc'}       | ${{ ...teamCollaborationInitialSortingDirection, protocol: 'desc' }}
    ${'protocol_asc'}        | ${{ ...teamCollaborationInitialSortingDirection, protocol: 'asc' }}        | ${'Protocol Active Numerical Ascending Sort Icon'}          | ${'protocol_desc'}       | ${{ ...teamCollaborationInitialSortingDirection, protocol: 'desc' }}
    ${'protocol_desc'}       | ${{ ...teamCollaborationInitialSortingDirection, protocol: 'desc' }}       | ${'Protocol Active Numerical Descending Sort Icon'}         | ${'protocol_asc'}        | ${{ ...teamCollaborationInitialSortingDirection, protocol: 'asc' }}
  `(
    'when collaboration type is "within team", sort is $sort and user clicks on $iconTitle, the new sort becomes $newSort and the sorting direction $newSortingDirection',
    async ({
      sort,
      sortingDirection,
      iconTitle,
      newSort,
      newSortingDirection,
    }) => {
      const setSort = jest.fn();

      const setSortingDirection = jest.fn();
      const { getByTitle } = render(
        <TeamCollaborationTable
          {...defaultProps}
          type="within-team"
          sort={sort}
          setSort={setSort}
          sortingDirection={sortingDirection}
          setSortingDirection={setSortingDirection}
        />,
      );

      const sortIcon = getByTitle(iconTitle);
      expect(sortIcon).toBeInTheDocument();

      await userEvent.click(sortIcon);
      expect(setSort).toHaveBeenCalledWith(newSort);
      expect(setSortingDirection).toHaveBeenCalledWith(newSortingDirection);
    },
  );
});
