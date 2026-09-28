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
    awards: [
      {
        id: 'award-type-1',
        name: 'Open Science Champion Award',
        status: true,
        philosophy: 'ASAP is built upon strong open science principles.',
        metricDefinition: 'Recognition for Open Science Champion awards.',
      },
      {
        id: 'award-type-2',
        name: 'Network Spotlight',
        status: false,
        philosophy: 'ASAP believes in ensuring that credit is given.',
        metricDefinition: 'Recognition for Network Spotlight awards.',
      },
    ],
    collaborationMetrics: { withinTeamCoProduction: 62 },
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

  it('renders the awards section with a row per award type', () => {
    render(<TeamMetricsPage {...props} />);

    expect(screen.getByText('Awards')).toBeVisible();
    const championRow = screen
      .getByText('Open Science Champion Award')
      .closest('article');
    expect(within(championRow!).getByText('Y')).toBeVisible();
    const spotlightRow = screen
      .getByText('Network Spotlight')
      .closest('article');
    expect(within(spotlightRow!).getByText('N')).toBeVisible();
  });

  it('renders the collaboration section after the awards section', () => {
    render(<TeamMetricsPage {...props} />);

    const subtitles = screen
      .getAllByText(/^(Hub Research Outputs|Leadership|Awards|Collaboration)$/)
      .map((node) => node.textContent);
    expect(subtitles).toEqual([
      'Hub Research Outputs',
      'Leadership',
      'Awards',
      'Collaboration',
    ]);
  });

  it('renders exactly one collaboration metric row, carrying its copy', () => {
    render(<TeamMetricsPage {...props} />);

    const row = screen
      .getByText('Within Team Co-Production of Research Outputs')
      .closest('article');
    expect(row).toBeVisible();

    const mobileDetails = within(row!).getByTestId(
      'metrics-card-details-mobile',
    );
    expect(
      within(mobileDetails).getByText(/facilitation of collaboration/i),
    ).toBeInTheDocument();
    expect(
      within(mobileDetails).getByText(
        /assesses whether teams are working together/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the limited-data status when there is no percentage', () => {
    render(
      <TeamMetricsPage
        {...props}
        collaborationMetrics={{ withinTeamCoProduction: null }}
      />,
    );

    const row = screen
      .getByText('Within Team Co-Production of Research Outputs')
      .closest('article');
    expect(
      within(row!).getByLabelText(/limited available data/i),
    ).toBeInTheDocument();
    const mobileDetails = within(row!).getByTestId(
      'metrics-card-details-mobile',
    );
    expect(
      within(mobileDetails).getByText(/facilitation of collaboration/i),
    ).toBeInTheDocument();
  });
});
