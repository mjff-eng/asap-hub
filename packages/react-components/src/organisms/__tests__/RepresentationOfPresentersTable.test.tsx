import {
  engagementInitialSortingDirection,
  EngagementResponse,
} from '@asap-hub/model';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import RepresentationOfPresentersTable from '../RepresentationOfPresentersTable';

describe('RepresentationOfPresentersTable', () => {
  const pageControlsProps = {
    numberOfPages: 1,
    currentPageIndex: 0,
    renderPageHref: () => '',
  };
  const performanceMetric = {
    belowAverageMin: 1,
    belowAverageMax: 2,
    averageMin: 2,
    averageMax: 3,
    aboveAverageMin: 3,
    aboveAverageMax: 5,
  };
  const defaultProps: ComponentProps<typeof RepresentationOfPresentersTable> = {
    ...pageControlsProps,
    data: [],
    sort: 'team_asc',
    setSort: jest.fn(),
    sortingDirection: engagementInitialSortingDirection,
    setSortingDirection: jest.fn(),
    performance: {
      events: performanceMetric,
      uniqueAllRoles: performanceMetric,
      uniqueKeyPersonnel: performanceMetric,
      totalSpeakers: performanceMetric,
    },
  };

  const engagementData: EngagementResponse = {
    id: '1',
    name: 'Test Team',
    inactiveSince: null,
    memberCount: 1,
    eventCount: 2,
    totalSpeakerCount: 3,
    uniqueAllRolesCount: 3,
    uniqueAllRolesCountPercentage: 100,
    uniqueKeyPersonnelCount: 2,
    uniqueKeyPersonnelCountPercentage: 67,
  };

  it('renders data', () => {
    const data = [engagementData];
    const { getByText } = render(
      <RepresentationOfPresentersTable {...defaultProps} data={data} />,
    );
    expect(getByText('Test Team')).toBeInTheDocument();
  });

  it('renders performance icons when the team has events and members', () => {
    const { getAllByTitle } = render(
      <RepresentationOfPresentersTable
        {...defaultProps}
        data={[engagementData]}
      />,
    );
    expect(getAllByTitle(/average/i)).toHaveLength(4);
  });

  it.each`
    description         | override
    ${'has no events'}  | ${{ eventCount: 0 }}
    ${'has no members'} | ${{ memberCount: 0 }}
  `(
    'renders limited data instead of performance icons when the team $description',
    ({ override }) => {
      const { getAllByTitle, queryAllByTitle } = render(
        <RepresentationOfPresentersTable
          {...defaultProps}
          data={[{ ...engagementData, ...override }]}
        />,
      );
      expect(getAllByTitle('Limited data')).toHaveLength(4);
      expect(queryAllByTitle(/average/i)).toHaveLength(0);
    },
  );

  it('renders inactive badge', () => {
    const data = [
      {
        ...engagementData,
        inactiveSince: '2022-10-24T11:00:00Z',
      },
    ];
    const { getByTitle } = render(
      <RepresentationOfPresentersTable {...defaultProps} data={data} />,
    );
    expect(getByTitle('Inactive Team')).toBeInTheDocument();
  });

  it.each`
    sort              | sortingDirection                                             | iconTitle                                            | newSort           | newSortingDirection
    ${'team_asc'}     | ${{ ...engagementInitialSortingDirection, team: 'asc' }}     | ${'Active Alphabetical Ascending Sort Icon'}         | ${'team_desc'}    | ${{ ...engagementInitialSortingDirection, team: 'desc' }}
    ${'team_desc'}    | ${{ ...engagementInitialSortingDirection, team: 'desc' }}    | ${'Active Alphabetical Descending Sort Icon'}        | ${'team_asc'}     | ${{ ...engagementInitialSortingDirection, team: 'asc' }}
    ${'team_asc'}     | ${{ ...engagementInitialSortingDirection, team: 'asc' }}     | ${'Members Inactive Numerical Descending Sort Icon'} | ${'members_desc'} | ${{ ...engagementInitialSortingDirection, members: 'desc' }}
    ${'members_asc'}  | ${{ ...engagementInitialSortingDirection, members: 'asc' }}  | ${'Members Active Numerical Ascending Sort Icon'}    | ${'members_desc'} | ${{ ...engagementInitialSortingDirection, members: 'desc' }}
    ${'members_desc'} | ${{ ...engagementInitialSortingDirection, members: 'desc' }} | ${'Members Active Numerical Descending Sort Icon'}   | ${'members_asc'}  | ${{ ...engagementInitialSortingDirection, members: 'asc' }}
    ${'members_desc'} | ${{ ...engagementInitialSortingDirection, members: 'desc' }} | ${'Inactive Alphabetical Ascending Sort Icon'}       | ${'team_asc'}     | ${{ ...engagementInitialSortingDirection, team: 'asc' }}
  `(
    'when sort is $sort and user clicks on $iconTitle, the new sort becomes $newSort and the sorting direction $newSortingDirection',
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
        <RepresentationOfPresentersTable
          {...defaultProps}
          data={[engagementData]}
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

  it.each`
    sort                                               | sortingDirection                                                                          | genericSortIconTitle                                          | iconTitle                                                                    | newSort                                            | newSortingDirection
    ${'team_asc'}                                      | ${{ ...engagementInitialSortingDirection, team: 'asc' }}                                  | ${'Events Inactive General Sort Icon'}                        | ${'Events Numerical Descending Sort Icon'}                                   | ${'events_desc'}                                   | ${{ ...engagementInitialSortingDirection, events: 'desc' }}
    ${'events_asc'}                                    | ${{ ...engagementInitialSortingDirection, events: 'asc' }}                                | ${'Events Active General Sort Icon'}                          | ${'Events Numerical Descending Sort Icon'}                                   | ${'events_desc'}                                   | ${{ ...engagementInitialSortingDirection, events: 'desc' }}
    ${'events_desc'}                                   | ${{ ...engagementInitialSortingDirection, events: 'desc' }}                               | ${'Events Active General Sort Icon'}                          | ${'Events Numerical Ascending Sort Icon'}                                    | ${'events_asc'}                                    | ${{ ...engagementInitialSortingDirection, events: 'asc' }}
    ${'team_asc'}                                      | ${{ ...engagementInitialSortingDirection, team: 'asc' }}                                  | ${'Total Speakers Inactive General Sort Icon'}                | ${'Total Speakers Numerical Descending Sort Icon'}                           | ${'total_speakers_desc'}                           | ${{ ...engagementInitialSortingDirection, totalSpeakers: 'desc' }}
    ${'total_speakers_asc'}                            | ${{ ...engagementInitialSortingDirection, totalSpeakers: 'asc' }}                         | ${'Total Speakers Active General Sort Icon'}                  | ${'Total Speakers Numerical Descending Sort Icon'}                           | ${'total_speakers_desc'}                           | ${{ ...engagementInitialSortingDirection, totalSpeakers: 'desc' }}
    ${'total_speakers_desc'}                           | ${{ ...engagementInitialSortingDirection, totalSpeakers: 'desc' }}                        | ${'Total Speakers Active General Sort Icon'}                  | ${'Total Speakers Numerical Ascending Sort Icon'}                            | ${'total_speakers_asc'}                            | ${{ ...engagementInitialSortingDirection, totalSpeakers: 'asc' }}
    ${'team_asc'}                                      | ${{ ...engagementInitialSortingDirection, team: 'asc' }}                                  | ${'Unique Speakers Inactive General Sort Icon'}               | ${'Unique Speakers Numerical Descending Sort Icon'}                          | ${'unique_speakers_all_roles_desc'}                | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRoles: 'desc' }}
    ${'unique_speakers_all_roles_asc'}                 | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRoles: 'asc' }}                | ${'Unique Speakers Active General Sort Icon'}                 | ${'Unique Speakers Numerical Descending Sort Icon'}                          | ${'unique_speakers_all_roles_desc'}                | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRoles: 'desc' }}
    ${'unique_speakers_all_roles_desc'}                | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRoles: 'desc' }}               | ${'Unique Speakers Active General Sort Icon'}                 | ${'Unique Speakers Numerical Ascending Sort Icon'}                           | ${'unique_speakers_all_roles_asc'}                 | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRoles: 'asc' }}
    ${'team_asc'}                                      | ${{ ...engagementInitialSortingDirection, team: 'asc' }}                                  | ${'Unique Speakers Inactive General Sort Icon'}               | ${'Unique Speakers Percentage Numerical Descending Sort Icon'}               | ${'unique_speakers_all_roles_percentage_desc'}     | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRolesPercentage: 'desc' }}
    ${'unique_speakers_all_roles_percentage_asc'}      | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRolesPercentage: 'asc' }}      | ${'Unique Speakers Active General Sort Icon'}                 | ${'Unique Speakers Percentage Numerical Descending Sort Icon'}               | ${'unique_speakers_all_roles_percentage_desc'}     | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRolesPercentage: 'desc' }}
    ${'unique_speakers_all_roles_percentage_desc'}     | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRolesPercentage: 'desc' }}     | ${'Unique Speakers Active General Sort Icon'}                 | ${'Unique Speakers Percentage Numerical Ascending Sort Icon'}                | ${'unique_speakers_all_roles_percentage_asc'}      | ${{ ...engagementInitialSortingDirection, uniqueSpeakersAllRolesPercentage: 'asc' }}
    ${'team_asc'}                                      | ${{ ...engagementInitialSortingDirection, team: 'asc' }}                                  | ${'Unique Speakers Key Personnel Inactive General Sort Icon'} | ${'Unique Speakers Key Personnel Numerical Descending Sort Icon'}            | ${'unique_speakers_key_personnel_desc'}            | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnel: 'desc' }}
    ${'unique_speakers_key_personnel_asc'}             | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnel: 'asc' }}            | ${'Unique Speakers Key Personnel Active General Sort Icon'}   | ${'Unique Speakers Key Personnel Numerical Descending Sort Icon'}            | ${'unique_speakers_key_personnel_desc'}            | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnel: 'desc' }}
    ${'unique_speakers_key_personnel_desc'}            | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnel: 'desc' }}           | ${'Unique Speakers Key Personnel Active General Sort Icon'}   | ${'Unique Speakers Key Personnel Numerical Ascending Sort Icon'}             | ${'unique_speakers_key_personnel_asc'}             | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnel: 'asc' }}
    ${'team_asc'}                                      | ${{ ...engagementInitialSortingDirection, team: 'asc' }}                                  | ${'Unique Speakers Key Personnel Inactive General Sort Icon'} | ${'Unique Speakers Key Personnel Percentage Numerical Descending Sort Icon'} | ${'unique_speakers_key_personnel_percentage_desc'} | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnelPercentage: 'desc' }}
    ${'unique_speakers_key_personnel_percentage_asc'}  | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnelPercentage: 'asc' }}  | ${'Unique Speakers Key Personnel Active General Sort Icon'}   | ${'Unique Speakers Key Personnel Percentage Numerical Descending Sort Icon'} | ${'unique_speakers_key_personnel_percentage_desc'} | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnelPercentage: 'desc' }}
    ${'unique_speakers_key_personnel_percentage_desc'} | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnelPercentage: 'desc' }} | ${'Unique Speakers Key Personnel Active General Sort Icon'}   | ${'Unique Speakers Key Personnel Percentage Numerical Ascending Sort Icon'}  | ${'unique_speakers_key_personnel_percentage_asc'}  | ${{ ...engagementInitialSortingDirection, uniqueSpeakersKeyPersonnelPercentage: 'asc' }}
  `(
    'when sort is $sort and user clicks on $iconTitle, the new sort becomes $newSort and the sorting direction $newSortingDirection',
    async ({
      sort,
      sortingDirection,
      iconTitle,
      newSort,
      genericSortIconTitle,
      newSortingDirection,
    }) => {
      const setSort = jest.fn();
      const setSortingDirection = jest.fn();
      const { getByTitle } = render(
        <RepresentationOfPresentersTable
          {...defaultProps}
          data={[engagementData]}
          sort={sort}
          setSort={setSort}
          sortingDirection={sortingDirection}
          setSortingDirection={setSortingDirection}
        />,
      );

      const genericSortIcon = getByTitle(genericSortIconTitle);
      expect(genericSortIcon).toBeInTheDocument();
      await userEvent.click(genericSortIcon);

      const sortIcon = getByTitle(iconTitle);
      expect(sortIcon).toBeInTheDocument();
      await userEvent.click(sortIcon);

      expect(setSort).toHaveBeenCalledWith(newSort);
      expect(setSortingDirection).toHaveBeenCalledWith(newSortingDirection);
    },
  );
});
