import { render, screen } from '@testing-library/react';

import TeamAwardMetrics from '../TeamAwardMetrics';

describe('TeamAwardMetrics', () => {
  it('maps each award name and status onto the metrics card', () => {
    render(
      <TeamAwardMetrics
        awards={[
          {
            id: 'open-science-champion-award',
            name: 'Open Science Champion Award',
            status: true,
            philosophy: 'ASAP is built upon strong open science principles.',
            metricDefinition:
              'The Open Science Champion Metric provides recognition to teams.',
          },
          {
            id: 'network-spotlight',
            name: 'Network Spotlight',
            status: false,
            philosophy: 'ASAP is built upon strong open science principles.',
            metricDefinition:
              'The Network Spotlight Metric provides recognition to teams.',
          },
        ]}
      />,
    );

    expect(screen.getByText('Open Science Champion Award')).toBeInTheDocument();
    expect(screen.getByText('Network Spotlight')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });
});
