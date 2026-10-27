import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { AnalyticsAwardsPageBody } from '..';

describe('AnalyticsAwardsPageBody', () => {
  const props: ComponentProps<typeof AnalyticsAwardsPageBody> = {
    currentPage: 0,
    children: <span data-testid="children">table content</span>,
    exportResults: jest.fn(() => Promise.resolve()),
    loadTags: jest.fn().mockResolvedValue([]),
    metric: 'os-champion',
    setMetric: jest.fn(),
    setTags: jest.fn(),
    tags: [],
    timeRange: '30d',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Open Science Champion metric', () => {
    render(<AnalyticsAwardsPageBody {...props} metric="os-champion" />);

    expect(
      screen.getByRole('heading', { name: 'Open Science Champion' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Number of Open Science Champion awards by team/),
    ).toBeInTheDocument();
  });

  it('renders the Network Spotlight metric', () => {
    render(<AnalyticsAwardsPageBody {...props} metric="network-spotlight" />);

    expect(
      screen.getByRole('heading', { name: 'Network Spotlight' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Number of Network Spotlight awards by team/),
    ).toBeInTheDocument();
  });

  it('renders the metric dropdown with both options', async () => {
    render(<AnalyticsAwardsPageBody {...props} />);

    expect(screen.getByDisplayValue('os-champion')).toBeInTheDocument();

    const dropdownIndicators = screen.getAllByTitle('Chevron Down');
    await userEvent.click(dropdownIndicators[0]!);

    await waitFor(() => {
      expect(screen.getAllByText('Open Science Champion')).toHaveLength(3);
      expect(screen.getAllByText('Network Spotlight')).toHaveLength(1);
    });
  });

  it('calls setMetric when a different option is selected', async () => {
    const mockSetMetric = jest.fn();
    render(<AnalyticsAwardsPageBody {...props} setMetric={mockSetMetric} />);

    const dropdownIndicators = screen.getAllByTitle('Chevron Down');
    await userEvent.click(dropdownIndicators[0]!);

    await userEvent.click(await screen.findByText('Network Spotlight'));

    expect(mockSetMetric).toHaveBeenCalledWith('network-spotlight');
  });

  it('renders the users and teams search', () => {
    render(<AnalyticsAwardsPageBody {...props} />);

    expect(screen.getByText('Users & Teams:')).toBeInTheDocument();
    expect(
      screen.getByText('Enter user and/or team names...'),
    ).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<AnalyticsAwardsPageBody {...props} />);

    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('uses a noop function when loadTags is not provided', () => {
    const propsWithoutLoadTags = { ...props };
    delete propsWithoutLoadTags.loadTags;

    render(<AnalyticsAwardsPageBody {...propsWithoutLoadTags} />);

    expect(
      screen.getByRole('heading', { name: 'Open Science Champion' }),
    ).toBeInTheDocument();
  });

  it('calls exportResults when export is triggered', async () => {
    const mockExportResults = jest.fn(() => Promise.resolve());
    render(
      <AnalyticsAwardsPageBody {...props} exportResults={mockExportResults} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /CSV/i }));
    await waitFor(() => {
      expect(mockExportResults).toHaveBeenCalled();
    });
  });
});
