import { render, screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { ComponentProps } from 'react';
import {
  awardsInitialSortingDirection,
  OSChampionResponse,
  SortAwards,
} from '@asap-hub/model';
import AwardsTable from '../AwardsTable';

describe('AwardsTable', () => {
  const pageControlsProps = {
    numberOfPages: 1,
    currentPageIndex: 0,
    renderPageHref: () => '',
  };

  const osChampionData: OSChampionResponse = {
    teamId: 'team-id-1',
    teamName: 'Test Team',
    isTeamInactive: false,
    teamAwardsCount: 2,
    timeRange: 'all',
    users: [
      {
        id: 'user-id-1',
        name: 'Test User',
        awardsCount: 2,
      },
    ],
  };

  const defaultProps: ComponentProps<typeof AwardsTable> = {
    ...pageControlsProps,
    data: [osChampionData],
    sort: 'team_asc' as SortAwards,
    setSort: jest.fn(),
    sortingDirection: awardsInitialSortingDirection,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sort buttons in Team and OS Champion Awards headers', () => {
    render(<AwardsTable {...defaultProps} />);
    const teamHeader = screen.getByRole('columnheader', { name: /Team/ });
    const awardsHeader = screen.getByRole('columnheader', {
      name: /Total number of Open Science Champion awards/,
    });
    expect(teamHeader.querySelector('button')).toBeInTheDocument();
    expect(awardsHeader.querySelector('button')).toBeInTheDocument();
  });

  it('uses the award label in the awards column header', () => {
    render(<AwardsTable {...defaultProps} awardLabel="Network Spotlight" />);
    expect(
      screen.getByRole('columnheader', {
        name: /Total number of Network Spotlight awards/,
      }),
    ).toBeInTheDocument();
  });

  it('handles sorting when team header button is clicked', () => {
    const mockSetSort = jest.fn();
    render(<AwardsTable {...defaultProps} setSort={mockSetSort} />);
    const teamHeader = screen.getByRole('columnheader', { name: /Team/ });
    const sortButton = teamHeader.querySelector('button');
    fireEvent.click(sortButton!);

    expect(mockSetSort).toHaveBeenCalledWith('team_desc');
  });

  it('handles sorting when OS Champion Awards header button is clicked', () => {
    const mockSetSort = jest.fn();
    render(<AwardsTable {...defaultProps} setSort={mockSetSort} />);
    const awardsHeader = screen.getByRole('columnheader', {
      name: /Total number of Open Science Champion awards/,
    });
    const sortButton = awardsHeader.querySelector('button');
    fireEvent.click(sortButton!);

    expect(mockSetSort).toHaveBeenCalledWith('awards_desc');
  });

  it('toggles team sort direction when team column is already active', () => {
    const mockSetSort = jest.fn();
    const { rerender } = render(
      <AwardsTable
        {...defaultProps}
        sort="team_asc"
        setSort={mockSetSort}
        sortingDirection={awardsInitialSortingDirection}
      />,
    );
    const teamHeader = screen.getByRole('columnheader', { name: /Team/ });
    const sortButton = teamHeader.querySelector('button');
    fireEvent.click(sortButton!);

    expect(mockSetSort).toHaveBeenCalledWith('team_desc');
    rerender(
      <AwardsTable
        {...defaultProps}
        sort="team_desc"
        setSort={mockSetSort}
        sortingDirection={{
          ...awardsInitialSortingDirection,
          team: 'desc',
        }}
      />,
    );
    fireEvent.click(sortButton!);
    expect(mockSetSort).toHaveBeenCalledWith('team_asc');
  });

  it('renders data', () => {
    const { getByText } = render(<AwardsTable {...defaultProps} />);
    expect(getByText('Test Team')).toBeInTheDocument();
  });

  it('renders inactive badge', () => {
    const data = [
      {
        ...osChampionData,
        isTeamInactive: true,
      },
    ];
    const { getByTitle } = render(
      <AwardsTable {...defaultProps} data={data} />,
    );
    expect(getByTitle('Inactive Team')).toBeInTheDocument();
  });

  it('allows collapsing and expanding rows', () => {
    const { getByTestId, getByText, queryByText } = render(
      <AwardsTable {...defaultProps} />,
    );
    expect(queryByText('Test User')).not.toBeInTheDocument();
    fireEvent.click(
      within(getByTestId('awards-table-row')).getByRole('button'),
    );
    expect(getByText('Test User')).toBeVisible();
  });
});
