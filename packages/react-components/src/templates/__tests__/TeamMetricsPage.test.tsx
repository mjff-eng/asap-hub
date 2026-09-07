import { render, screen, within } from '@testing-library/react';
import { ComponentProps } from 'react';
import { TeamMetricsPage } from '..';

describe('TeamMetricsPage', () => {
  const props: ComponentProps<typeof TeamMetricsPage> = {
    hubResearchOutputRows: [
      { outputType: 'Article', numberOfOutputs: 4, publicPercentage: 75 },
      { outputType: 'Protocol', numberOfOutputs: 0, publicPercentage: null },
    ],
    leadershipMetrics: { workingGroupLead: true, interestGroupLead: false },
  };

  it('renders the heading and the introduction', () => {
    render(<TeamMetricsPage {...props} />);

    expect(
      screen.getByRole('heading', { name: 'Metrics', level: 3 }),
    ).toBeVisible();
    expect(
      screen.getByText(/high-level overview of your team's activity/i),
    ).toBeVisible();
  });

  it('renders the hub research outputs section', () => {
    render(<TeamMetricsPage {...props} />);

    expect(screen.getByText('Hub Research Outputs')).toBeVisible();
    expect(screen.getByTestId('hub-research-outputs-table')).toBeVisible();
  });

  it('renders a row per hub research output', () => {
    render(<TeamMetricsPage {...props} />);
    const table = screen.getByTestId('hub-research-outputs-table');

    const articleRow = within(table).getByText('Article').closest('tr');
    expect(within(articleRow!).getByText('4')).toBeVisible();
    expect(within(articleRow!).getByText('75%')).toBeVisible();

    const protocolRow = within(table).getByText('Protocol').closest('tr');
    expect(within(protocolRow!).getByText('0')).toBeVisible();
    expect(within(protocolRow!).getByText('N/A')).toBeVisible();
  });

  it('renders no rows when there are no hub research outputs', () => {
    render(<TeamMetricsPage {...props} hubResearchOutputRows={[]} />);
    const table = screen.getByTestId('hub-research-outputs-table');

    expect(within(table).queryAllByRole('row')).toHaveLength(1);
  });

  it('renders the leadership section', () => {
    render(<TeamMetricsPage {...props} />);

    expect(screen.getByText('Leadership')).toBeVisible();
    const workingGroupRow = screen
      .getByText('Working Group(s) Lead')
      .closest('article');
    expect(within(workingGroupRow!).getByText('Y')).toBeVisible();
    const interestGroupRow = screen
      .getByText('Interest Group(s) Lead')
      .closest('article');
    expect(within(interestGroupRow!).getByText('N')).toBeVisible();
  });
});
